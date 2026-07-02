import { useState, useEffect } from 'react'
import { supabase } from '../eat'

const STATUS = {
  never:   { label: 'Never hosted', bg: '#FEF9E7', color: '#D4AC0D', border: '#F9E79F' },
  overdue: { label: 'Overdue',      bg: '#FEF2F2', color: '#E74C3C', border: '#FADBD8' },
  recent:  { label: 'Recent',       bg: '#F0FFF4', color: '#27AE60', border: '#D5F5E3' },
}

function getStatus(hh) {
  if (!hh.times_hosted || hh.times_hosted === 0) return 'never'
  if (!hh.last_entertained) return 'never'
  const weeks = Math.floor((Date.now() - new Date(hh.last_entertained)) / (7*24*60*60*1000))
  return weeks > 12 ? 'overdue' : 'recent'
}

export default function Households() {
  const [households, setHouseholds] = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('all')
  const [search, setSearch]         = useState('')

  useEffect(() => { fetchHouseholds() }, [])

  async function fetchHouseholds() {
    const { data } = await supabase
      .from('households')
      .select('*')
      .order('householder', { ascending: true })
    setHouseholds(data || [])
    setLoading(false)
  }

  const filtered = households.filter(hh => {
    const matchFilter = filter === 'all' || getStatus(hh) === filter
    const matchSearch = !search || hh.householder?.toLowerCase().includes(search.toLowerCase()) || hh.locality?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

  if (loading) return <Spinner />

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }} className="fade-in">

      {/* Header */}
      <div style={{ background: 'linear-gradient(140deg, #0F2942 0%, #1B4F72 100%)', padding: '52px 24px 28px' }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Households</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
          {households.length} households · {households.reduce((a,h) => a + (h.size||0), 0)} people
        </p>
      </div>

      <div style={{ padding: '16px 16px 32px' }}>

        {/* Search */}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or locality..."
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #E2E8F0',
            fontSize: 14, outline: 'none', background: '#fff', marginBottom: 12,
            boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}
        />

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[['all','All'], ['never','Never'], ['overdue','Overdue'], ['recent','Recent']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: filter === val ? '#0F2942' : '#fff',
              color: filter === val ? '#fff' : '#7F8C8D',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              transition: 'all 0.15s',
            }}>{lbl}</button>
          ))}
        </div>

        {/* Household cards */}
        {filtered.length === 0 ? (
          <Empty text="No households match your search" />
        ) : (
          filtered.map((hh, i) => {
            const status = getStatus(hh)
            const s      = STATUS[status]
            const weeks  = hh.last_entertained
              ? Math.floor((Date.now() - new Date(hh.last_entertained)) / (7*24*60*60*1000))
              : null
            return (
              <div key={hh.id} className="fade-in" style={{
                background: '#fff', borderRadius: 14, padding: '16px',
                marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${s.border}`,
                animationDelay: `${i * 0.03}s`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#0F2942', marginBottom: 3 }}>
                      {hh.householder}
                    </div>
                    <div style={{ fontSize: 12, color: '#7F8C8D', marginBottom: 8 }}>
                      {hh.locality} · {hh.size} {hh.size === 1 ? 'person' : 'people'}
                    </div>
                    {hh.members && (
                      <div style={{ fontSize: 12, color: '#95A5A6', lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {hh.members}
                      </div>
                    )}
                  </div>
                  <div style={{ marginLeft: 12, flexShrink: 0 }}>
                    <div style={{
                      background: s.bg, color: s.color, borderRadius: 20,
                      padding: '4px 10px', fontSize: 11, fontWeight: 700,
                    }}>
                      {status === 'never' ? 'Never' : `${weeks}w ago`}
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #F4F7FB', marginTop: 10, paddingTop: 8, display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 11, color: '#BDC3C7' }}>
                    Hosted {hh.times_hosted || 0}×
                  </span>
                  {hh.last_entertained && (
                    <span style={{ fontSize: 11, color: '#BDC3C7' }}>
                      Last: {fmtDate(hh.last_entertained)}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function Empty({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#7F8C8D', fontSize: 14 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
      {text}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #E8A838', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <div style={{ color: '#7F8C8D', fontSize: 13, fontWeight: 500 }}>Loading...</div>
    </div>
  )
}
