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

const LOCALITIES = ['Tamworth','Armidale','Brisbane','Penrith','Nambour','Warragul','Adelaide','Cowra','Sydney','Melbourne']

export default function Households() {
  const [households, setHouseholds] = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('all')
  const [search, setSearch]         = useState('')
  const [editing, setEditing]       = useState(null)

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

      {editing && (
        <HouseholdEditor
          household={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchHouseholds() }}
        />
      )}

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
              <div key={hh.id} onClick={() => setEditing(hh)} className="fade-in" style={{
                background: '#fff', borderRadius: 14, padding: '16px',
                marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${s.border}`,
                animationDelay: `${i * 0.03}s`, cursor: 'pointer',
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

function HouseholdEditor({ household, onClose, onSaved }) {
  const [householder, setHouseholder] = useState(household.householder || '')
  const [locality, setLocality]       = useState(household.locality || '')
  const [members, setMembers]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [showAdd, setShowAdd]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [notice, setNotice]           = useState(null)

  useEffect(() => { fetchMembers() }, [])

  async function fetchMembers() {
    const { data } = await supabase.from('guests').select('*').eq('household_id', household.id)
      .order('is_householder', { ascending: false }).order('given_names')
    setMembers(data || [])
    setLoading(false)
  }

  async function recalcHousehold(updated) {
    const active = updated.filter(m => m.active !== false)
    const memberNames = active.map(m => `${m.given_names} ${m.surname}`.trim()).join(', ')
    await supabase.from('households').update({ size: active.length, members: memberNames }).eq('id', household.id)
  }

  async function toggleActive(m) {
    const nextActive = m.active === false ? true : false
    const { error } = await supabase.from('guests').update({ active: nextActive }).eq('id', m.id)
    if (error) {
      setNotice('This needs a one-time database update first — ask whoever set up the app to run the "active" column migration in billeting_schema.sql.')
      return
    }
    const updated = members.map(x => x.id === m.id ? { ...x, active: nextActive } : x)
    setMembers(updated)
    await recalcHousehold(updated)
  }

  async function addMember(form) {
    const { data, error } = await supabase.from('guests').insert({
      household_id: household.id,
      given_names: form.given_names,
      surname: form.surname,
      gender: form.gender || null,
      dob: form.dob ? `${form.dob}-01` : null,
      is_householder: false,
      locality,
    }).select().single()
    if (!error && data) {
      const updated = [...members, data]
      setMembers(updated)
      await recalcHousehold(updated)
      setShowAdd(false)
    }
  }

  async function saveDetails() {
    setSaving(true)
    await supabase.from('households').update({ householder, locality }).eq('id', household.id)
    setSaving(false)
    onSaved()
  }

  const defaultSurname = householder.trim().split(' ').slice(-1)[0] || ''
  const calcAge = (dob) => {
    if (!dob) return null
    const b = new Date(dob), today = new Date()
    let age = today.getFullYear() - b.getFullYear()
    if (today.getMonth() < b.getMonth()) age--
    return age >= 0 ? age : null
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,41,66,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 540, boxShadow: '0 -8px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F2942', margin: 0 }}>Edit Household</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#7F8C8D' }}>✕</button>
        </div>

        {notice && (
          <div style={{ background: '#FEF2F2', color: '#E74C3C', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12, fontWeight: 600 }}>
            {notice}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          <Field label="Householder" value={householder} onChange={setHouseholder} placeholder="e.g. David Brown" />
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7F8C8D', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Locality</label>
            <input list="hh_locality_list" value={locality} onChange={e => setLocality(e.target.value)} placeholder="Type or choose..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
              onFocus={e => e.target.style.borderColor = '#1B4F72'}
              onBlur={e  => e.target.style.borderColor = '#E2E8F0'}
            />
            <datalist id="hh_locality_list">{LOCALITIES.map(l => <option key={l} value={l} />)}</datalist>
          </div>
          <button onClick={saveDetails} disabled={!householder || saving} style={{ alignSelf: 'flex-end', padding: '9px 20px', background: householder ? '#0F2942' : '#BDC3C7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: householder ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Saving...' : 'Save Details'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid #F4F7FB', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: 1 }}>Members</div>
            <button onClick={() => setShowAdd(true)} style={{ fontSize: 12, fontWeight: 700, color: '#1B4F72', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add member</button>
          </div>

          {loading ? (
            <div style={{ fontSize: 13, color: '#BDC3C7' }}>Loading...</div>
          ) : members.length === 0 ? (
            <div style={{ fontSize: 13, color: '#BDC3C7' }}>No members recorded</div>
          ) : members.map(m => {
            const isActive = m.active !== false
            const age = calcAge(m.dob)
            return (
              <div key={m.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 12px', background: isActive ? '#F4F7FB' : '#FEF2F2', borderRadius: 8, marginBottom: 6,
                opacity: isActive ? 1 : 0.7,
              }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F2942' }}>
                    {m.given_names} {m.surname}{m.is_householder ? ' (householder)' : ''}
                  </span>
                  {age !== null && <span style={{ fontSize: 12, color: '#7F8C8D', marginLeft: 6 }}>age {age}</span>}
                  {!isActive && <span style={{ fontSize: 11, color: '#E74C3C', fontWeight: 700, marginLeft: 8 }}>Removed</span>}
                </div>
                <button onClick={() => toggleActive(m)} style={{
                  fontSize: 11, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer',
                  color: isActive ? '#E74C3C' : '#27AE60',
                }}>
                  {isActive ? 'Remove' : 'Restore'}
                </button>
              </div>
            )
          })}

          {showAdd && <AddMemberForm defaultSurname={defaultSurname} onCancel={() => setShowAdd(false)} onAdd={addMember} />}
        </div>
      </div>
    </div>
  )
}

function AddMemberForm({ defaultSurname, onCancel, onAdd }) {
  const [given_names, setGiven] = useState('')
  const [surname, setSurname]   = useState(defaultSurname)
  const [dob, setDob]           = useState('')
  const [gender, setGender]     = useState('')
  const [saving, setSaving]     = useState(false)

  async function handle() {
    if (!given_names) return
    setSaving(true)
    await onAdd({ given_names, surname, dob, gender })
    setSaving(false)
  }

  return (
    <div style={{ background: '#F4F7FB', borderRadius: 10, padding: 16, border: '1px dashed #BDC3C7', marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Given Name(s)" value={given_names} onChange={setGiven} placeholder="First name" />
        <Field label="Surname" value={surname} onChange={setSurname} placeholder={defaultSurname} />
        <Field label="Birth Month" value={dob} onChange={setDob} type="month" />
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7F8C8D', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Gender</label>
          <select value={gender} onChange={e => setGender(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
            <option value="">-</option>
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '8px 16px', background: '#fff', color: '#7F8C8D', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
        <button onClick={handle} disabled={!given_names || saving} style={{ padding: '8px 16px', background: given_names ? '#1B4F72' : '#BDC3C7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: given_names ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Adding...' : 'Add Member'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7F8C8D', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
        onFocus={e => e.target.style.borderColor = '#1B4F72'}
        onBlur={e  => e.target.style.borderColor = '#E2E8F0'}
      />
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
