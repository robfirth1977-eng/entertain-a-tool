import { useState, useEffect } from 'react'
import { supabase } from '../eat'

export default function Home({ onPlanEvent }) {
  const [tab, setTab]         = useState('home')
  const [stats, setStats]     = useState(null)
  const [overdue, setOverdue] = useState([])
  const [loading, setLoading] = useState(true)

  // History tab state
  const thisYear = new Date().getFullYear()
  const [fromDate, setFromDate] = useState(`${thisYear}-01-01`)
  const [toDate, setToDate]     = useState(new Date().toISOString().split('T')[0])
  const [history, setHistory]   = useState(null)
  const [histLoading, setHistLoading] = useState(false)

  useEffect(() => { fetchData() }, [])
  useEffect(() => { if (tab === 'history') fetchHistory() }, [tab])

  async function fetchData() {
    const [
      { count: totalGuests },
      { count: totalHH },
      { count: neverHosted },
      { count: totalEvents },
      { data: recentEvent },
      { data: neverHH },
      { data: overdueHH },
    ] = await Promise.all([
      supabase.from('guests').select('*', { count: 'exact', head: true }),
      supabase.from('households').select('*', { count: 'exact', head: true }),
      supabase.from('households').select('*', { count: 'exact', head: true }).is('last_entertained', null),
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('event_date').order('event_date', { ascending: false }).limit(1),
      supabase.from('households')
        .select('id, householder, locality, last_entertained, times_hosted, size')
        .is('last_entertained', null)
        .order('householder', { ascending: true })
        .limit(3),
      supabase.from('households')
        .select('id, householder, locality, last_entertained, times_hosted, size')
        .not('last_entertained', 'is', null)
        .order('last_entertained', { ascending: true })
        .limit(3),
    ])

    setStats({
      totalGuests: totalGuests ?? 0,
      totalHH:     totalHH     ?? 0,
      neverHosted: neverHosted ?? 0,
      totalEvents: totalEvents ?? 0,
      lastEvent:   recentEvent?.[0]?.event_date ?? null,
    })
    setOverdue([...(neverHH || []), ...(overdueHH || [])])
    setLoading(false)
  }

  async function fetchHistory() {
    setHistLoading(true)

    const [{ data: evData }, { data: topHH }] = await Promise.all([
      supabase.from('events')
        .select('id, name, event_date, total_guests')
        .gte('event_date', fromDate)
        .lte('event_date', toDate)
        .order('event_date', { ascending: false }),
      supabase.from('households')
        .select('id, householder, times_hosted, last_entertained')
        .not('last_entertained', 'is', null)
        .order('times_hosted', { ascending: false })
        .limit(5),
    ])

    const eventIds = (evData || []).map(e => e.id)

    let uniqueGuests = 0, totalVisits = 0, uniqueHH = 0, uniqueEvents = 0

    if (eventIds.length > 0) {
      const { data: attData } = await supabase
        .from('attendance')
        .select('guest_id, event_id, guests(household_id)')
        .in('event_id', eventIds)
        .eq('attended', true)

      const att = attData || []
      uniqueGuests = new Set(att.map(a => a.guest_id)).size
      totalVisits  = att.length
      uniqueEvents = new Set(att.map(a => a.event_id)).size
      uniqueHH     = new Set(att.map(a => a.guests?.household_id).filter(Boolean)).size
    }

    setHistory({
      uniqueGuests,
      totalVisits,
      uniqueEvents,
      uniqueHH,
      events: evData || [],
      topHH:  topHH  || [],
    })
    setHistLoading(false)
  }

  const weeksAgo = (date) => {
    if (!date) return null
    return Math.floor((Date.now() - new Date(date)) / (7 * 24 * 60 * 60 * 1000))
  }

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

  if (loading) return <Spinner />

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }} className="fade-in">

      {/* Hero header */}
      <div style={{
        background: 'linear-gradient(140deg, #0F2942 0%, #1B4F72 100%)',
        padding: '52px 24px 0',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(232,168,56,0.12)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', paddingBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#E8A838', letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
            Welcome back, Rob
          </div>
          <h1 style={{ color: '#fff', fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>
            Hosting Angel
          </h1>
          {stats.lastEvent ? (
            <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
              Last event: {fmtDate(stats.lastEvent)}
            </p>
          ) : (
            <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
              No events yet
            </p>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {[['home', 'Home'], ['history', 'History']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: tab === id ? '#fff' : 'transparent',
              color: tab === id ? '#0F2942' : 'rgba(255,255,255,0.6)',
              borderRadius: '8px 8px 0 0',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* HOME TAB */}
      {tab === 'home' && (
        <div style={{ padding: '20px 16px 32px' }} className="fade-in">

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <StatCard label="Total Guests"  value={stats.totalGuests} accent="#0F2942" />
            <StatCard label="Households"    value={stats.totalHH}     accent="#1B4F72" />
            <StatCard label="Never Hosted"  value={stats.neverHosted} accent="#E74C3C" light="#FEF2F2" />
            <StatCard label="Events Logged" value={stats.totalEvents} accent="#E8A838" light="#FDF3DC" />
          </div>

          <button onClick={onPlanEvent} style={{
            width: '100%', marginTop: 20, padding: '20px 24px',
            background: 'linear-gradient(135deg, #E8A838 0%, #D4922A 100%)',
            border: 'none', borderRadius: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 6px 24px rgba(232,168,56,0.35)',
            transition: 'transform 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div>
              <div style={{ fontSize: 11, color: 'rgba(15,41,66,0.65)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                Ready to host?
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F2942' }}>Plan an Event</div>
            </div>
            <div style={{ fontSize: 32, color: '#0F2942', opacity: 0.7 }}>→</div>
          </button>

          {overdue.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <h2 style={{ fontSize: 12, fontWeight: 700, color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>
                  Overdue for a visit
                </h2>
                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
              </div>
              {overdue.map((hh, i) => {
                const weeks  = weeksAgo(hh.last_entertained)
                const urgent = weeks > 20
                return (
                  <div key={hh.id} className="fade-in" style={{
                    background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                    borderLeft: `3px solid ${urgent ? '#E74C3C' : '#E8A838'}`,
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0F2942' }}>{hh.householder}</div>
                      <div style={{ fontSize: 12, color: '#7F8C8D', marginTop: 3 }}>
                        {hh.locality}{hh.size > 1 ? ` · ${hh.size} people` : ''}
                      </div>
                    </div>
                    <div style={{
                      background: urgent ? '#FEF2F2' : '#FDF3DC',
                      color: urgent ? '#E74C3C' : '#D4922A',
                      borderRadius: 20, padding: '5px 12px',
                      fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                    }}>
                      {!hh.last_entertained ? 'Never' : `${weeks}w ago`}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div style={{ padding: '20px 16px 32px' }} className="fade-in">

          {/* Date range picker */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Date Range</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#7F8C8D', marginBottom: 4, fontWeight: 600 }}>From</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#7F8C8D', marginBottom: 4, fontWeight: 600 }}>To</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            {/* Quick presets */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                ['This Year',  `${thisYear}-01-01`, new Date().toISOString().split('T')[0]],
                ['Last Year',  `${thisYear-1}-01-01`, `${thisYear-1}-12-31`],
                ['All Time',   '2020-01-01', new Date().toISOString().split('T')[0]],
                ['Last 6m',    new Date(Date.now()-180*24*60*60*1000).toISOString().split('T')[0], new Date().toISOString().split('T')[0]],
              ].map(([label, from, to]) => (
                <button key={label} onClick={() => { setFromDate(from); setToDate(to) }} style={{
                  padding: '5px 12px', borderRadius: 20, border: '1.5px solid #E2E8F0',
                  background: '#F4F7FB', color: '#0F2942', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>{label}</button>
              ))}
            </div>
            <button onClick={fetchHistory} style={{
              width: '100%', marginTop: 12, padding: '10px', background: '#0F2942',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              {histLoading ? 'Loading...' : 'Show Stats'}
            </button>
          </div>

          {/* History stats */}
          {history && !histLoading && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <StatCard label="Unique Guests"    value={history.uniqueGuests} accent="#0F2942" />
                <StatCard label="Total Visits"     value={history.totalVisits}  accent="#1B4F72" />
                <StatCard label="Households Hosted" value={history.uniqueHH}   accent="#27AE60" light="#F0FFF4" />
                <StatCard label="Events"           value={history.uniqueEvents} accent="#E8A838" light="#FDF3DC" />
              </div>

              {/* Events in range */}
              {history.events.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <SectionLabel label="Events in range" />
                  {history.events.map((ev, i) => (
                    <div key={ev.id} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderLeft: '3px solid #E8A838' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0F2942' }}>{ev.name}</div>
                        <div style={{ fontSize: 12, color: '#7F8C8D', marginTop: 2 }}>{fmtDate(ev.event_date)}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#E8A838' }}>{ev.total_guests} guests</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Top households all time */}
              <SectionLabel label="Most hosted (all time)" />
              {history.topHH.map((hh, i) => (
                <div key={hh.id} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0F2942', color: '#E8A838', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                      {i + 1}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#0F2942' }}>{hh.householder}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#7F8C8D' }}>{hh.times_hosted}×</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, accent, light = '#fff' }) {
  return (
    <div style={{ background: light, borderRadius: 14, padding: '18px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', borderTop: `3px solid ${accent}` }}>
      <div style={{ fontSize: 30, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#7F8C8D', marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

function SectionLabel({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: 2 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
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
