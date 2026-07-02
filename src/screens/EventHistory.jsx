import { useState, useEffect } from 'react'
import { supabase } from '../eat'

export default function EventHistory() {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchEvents() }, [])

  async function fetchEvents() {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  if (loading) return <Spinner />

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }} className="fade-in">
      <div style={{ background: 'linear-gradient(140deg, #0F2942 0%, #1B4F72 100%)', padding: '52px 24px 28px' }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Events</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>{events.length} events logged</p>
      </div>

      <div style={{ padding: '16px 16px 32px' }}>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: '#fff', borderRadius: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📅</div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#0F2942', marginBottom: 8 }}>No events yet</div>
            <div style={{ fontSize: 13, color: '#7F8C8D' }}>Use Plan an Event from the Home screen to get started</div>
          </div>
        ) : (
          events.map((ev, i) => (
            <div key={ev.id} className="fade-in" style={{
              background: '#fff', borderRadius: 14, padding: '16px',
              marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
              borderLeft: '4px solid #E8A838',
              animationDelay: `${i * 0.04}s`,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0F2942', marginBottom: 4 }}>
                {ev.name || 'Event'}
              </div>
              <div style={{ fontSize: 13, color: '#7F8C8D', marginBottom: 8 }}>
                {fmtDate(ev.event_date)}
              </div>
              <div style={{ fontSize: 12, color: '#BDC3C7' }}>
                {ev.total_guests} guests
                {ev.notes && ` · ${ev.notes}`}
              </div>
            </div>
          ))
        )}
      </div>
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
