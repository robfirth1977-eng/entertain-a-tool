import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../eat'

const VW = 780, VH = 290
const TABLE = { x: 100, y: 75, w: 580, h: 140, rx: 30 }
const SEAT_R = 22
const TOP_Y = 32, BOT_Y = VH - 32
const LEFT_X = 50, RIGHT_X = VW - 50

const CONFIGS = {
  20: { top: 8,  bottom: 8,  ends: 2 },
  22: { top: 9,  bottom: 9,  ends: 2 },
  24: { top: 10, bottom: 10, ends: 2 },
  26: { top: 11, bottom: 11, ends: 2 },
}

function buildSeats(size) {
  const { top, bottom, ends } = CONFIGS[size] || CONFIGS[24]
  const seats = []
  let n = 1
  for (let i = 0; i < top; i++)
    seats.push({ n: n++, x: TABLE.x + (TABLE.w / (top + 1)) * (i + 1), y: TOP_Y })
  for (let i = 0; i < ends; i++)
    seats.push({ n: n++, x: RIGHT_X, y: TABLE.y + (TABLE.h / (ends + 1)) * (i + 1) })
  for (let i = bottom - 1; i >= 0; i--)
    seats.push({ n: n++, x: TABLE.x + (TABLE.w / (bottom + 1)) * (i + 1), y: BOT_Y })
  for (let i = ends - 1; i >= 0; i--)
    seats.push({ n: n++, x: LEFT_X, y: TABLE.y + (TABLE.h / (ends + 1)) * (i + 1) })
  return seats
}

export default function TablePlanner({ event, onBack }) {
  const [guests, setGuests]     = useState([])
  const [size, setSize]         = useState(24)
  const [seatMap, setSeatMap]   = useState({})   // seatNum -> guestId
  const [cats, setCats]         = useState({})   // guestId -> 'spill'|'highchair'
  const [selected, setSelected] = useState(null) // guestId currently held
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [loading, setLoading]   = useState(true)
  const [wide, setWide]         = useState(window.innerWidth >= 900)

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 900)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: att } = await supabase
      .from('attendance')
      .select('guests(id, given_names, surname, dob)')
      .eq('event_id', event.id)
    setGuests((att || []).map(a => a.guests).filter(Boolean))

    const { data: ev } = await supabase
      .from('events').select('seating_plan').eq('id', event.id).single()
    if (ev?.seating_plan?.seats) {
      setSeatMap(ev.seating_plan.seats)
      if (ev.seating_plan.size) setSize(ev.seating_plan.size)
      if (ev.seating_plan.cats) setCats(ev.seating_plan.cats)
    }
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    await supabase.from('events').update({ seating_plan: { size, seats: seatMap, cats } }).eq('id', event.id)
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  // Derived
  const guestToSeat = Object.fromEntries(Object.entries(seatMap).map(([s, g]) => [g, Number(s)]))
  const seatedIds   = new Set(Object.values(seatMap))
  const spillIds    = new Set(Object.keys(cats).filter(id => cats[id] === 'spill'))
  const chairIds    = new Set(Object.keys(cats).filter(id => cats[id] === 'highchair'))
  const unassigned  = guests.filter(g => !seatedIds.has(g.id) && !spillIds.has(g.id) && !chairIds.has(g.id))
  const seated      = guests.filter(g => seatedIds.has(g.id)).sort((a,b) => (guestToSeat[a.id]||0)-(guestToSeat[b.id]||0))
  const spill       = guests.filter(g => spillIds.has(g.id))
  const highchair   = guests.filter(g => chairIds.has(g.id))

  const fname  = g => g.given_names?.split(' ')[0] || ''
  const abbrev = (g, max=7) => { const n=fname(g); return n.length>max ? n.slice(0,max-1)+'…' : n }
  const calcAge = (dob) => {
    if (!dob) return null
    const b = new Date(dob), today = new Date()
    let age = today.getFullYear() - b.getFullYear()
    if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--
    return age >= 0 ? age : null
  }

  function handleSeatClick(seatNum) {
    const occupantId = seatMap[seatNum]

    if (selected) {
      const selectedSeat = guestToSeat[selected]

      if (occupantId === selected) {
        // Click own seat — deselect
        setSelected(null)
      } else if (occupantId) {
        // Swap two seated guests
        setSeatMap(m => {
          const n = { ...m }
          if (selectedSeat) n[selectedSeat] = occupantId
          else delete n[selectedSeat]
          n[seatNum] = selected
          return n
        })
        setSelected(null)
      } else {
        // Move selected to empty seat
        setSeatMap(m => {
          const n = { ...m }
          if (selectedSeat) delete n[selectedSeat]
          n[seatNum] = selected
          return n
        })
        setSelected(null)
      }
    } else {
      if (occupantId) {
        // Select whoever is in this seat
        setSelected(occupantId)
      }
      // Click empty seat with nothing selected — do nothing
    }
  }

  function handleGuestClick(gid) {
    if (selected === gid) { setSelected(null); return }
    setSelected(gid)
  }

  function setCategory(gid, cat) {
    const cur = guestToSeat[gid]
    if (cur) setSeatMap(m => { const n={...m}; delete n[cur]; return n })
    setCats(c => { const n={...c}; n[gid]===cat ? delete n[gid] : (n[gid]=cat); return n })
    if (selected === gid) setSelected(null)
  }

  const seatPositions = buildSeats(size)

  if (loading) return <Spinner />

  const tablePanel = (
    <div>
      {selected && (
        <div style={{ background:'#E8A838', borderRadius:10, padding:'9px 14px', marginBottom:10, fontSize:13, fontWeight:700, color:'#0F2942', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>
            {guestToSeat[selected]
              ? `Moving: ${fname(guests.find(g=>g.id===selected))} (Seat ${guestToSeat[selected]}) — tap another seat to swap`
              : `Placing: ${fname(guests.find(g=>g.id===selected))} — tap a seat`}
          </span>
          <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#0F2942', fontWeight:800, fontSize:16, padding:'0 0 0 8px' }}>✕</button>
        </div>
      )}

      {/* SVG Table */}
      <div style={{ background:'#fff', borderRadius:14, padding:'10px 6px', boxShadow:'0 1px 8px rgba(0,0,0,0.08)', overflowX:'auto' }}>
        <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width:'100%', maxWidth:780, display:'block', margin:'0 auto' }}>
          {/* Table surface */}
          <rect x={TABLE.x} y={TABLE.y} width={TABLE.w} height={TABLE.h} rx={TABLE.rx} fill="#1B4F72" stroke="#0F2942" strokeWidth="3" />
          <text x={VW/2} y={TABLE.y+TABLE.h/2+5} textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="12" fontWeight="600">{event.name}</text>

          {seatPositions.map(seat => {
            const gid    = seatMap[seat.n]
            const guest  = gid ? guests.find(g => g.id === gid) : null
            const isSel  = gid === selected
            const canDrop = selected && !gid
            const isSwap  = selected && gid && gid !== selected

            let fill='#F4F7FB', stroke='#D0D8E4', textFill='#95A5A6', strokeW=2
            if (gid && !isSel)  { fill='#0F2942'; stroke='#E8A838'; textFill='#E8A838' }
            if (isSel)          { fill='#E8A838'; stroke='#D4922A'; textFill='#0F2942'; strokeW=3 }
            if (canDrop)        { fill='#F0FFF4'; stroke='#27AE60'; textFill='#27AE60' }
            if (isSwap)         { fill='#EBF2FA'; stroke='#1B4F72'; textFill='#1B4F72'; strokeW=2.5 }

            return (
              <g key={seat.n} onClick={() => handleSeatClick(seat.n)} style={{ cursor:'pointer' }}>
                <circle cx={seat.x} cy={seat.y} r={SEAT_R} fill={fill} stroke={stroke} strokeWidth={strokeW} />
                <text x={seat.x} y={seat.y-(guest?5:0)} textAnchor="middle" dominantBaseline="middle" fill={textFill} fontSize={guest?"8":"10"} fontWeight="700">
                  {guest ? abbrev(guest) : seat.n}
                </text>
                {guest && calcAge(guest.dob) !== null && (
                  <text x={seat.x} y={seat.y+5} textAnchor="middle" dominantBaseline="middle" fill={isSel ? 'rgba(15,41,66,0.6)' : 'rgba(232,168,56,0.7)'} fontSize="7" fontWeight="600">
                    {calcAge(guest.dob)}
                  </text>
                )}
                {guest && calcAge(guest.dob) === null && (
                  <text x={seat.x} y={seat.y+8} textAnchor="middle" dominantBaseline="middle" fill={isSel ? 'rgba(15,41,66,0.5)' : 'rgba(232,168,56,0.5)'} fontSize="7">#{seat.n}</text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:8, flexWrap:'wrap' }}>
        {[
          ['#F4F7FB','#D0D8E4','Empty'],
          ['#0F2942','#E8A838','Seated'],
          ['#E8A838','#D4922A','Selected'],
          ['#EBF2FA','#1B4F72','Tap to swap'],
          ['#F0FFF4','#27AE60','Tap to place'],
        ].map(([bg,border,label]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#7F8C8D' }}>
            <div style={{ width:12, height:12, borderRadius:'50%', background:bg, border:`1.5px solid ${border}` }} /> {label}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:12 }}>
        {[['At Table',seated.length,'#0F2942'],['Unassigned',unassigned.length,'#7F8C8D'],['Spill',spill.length,'#1B4F72'],['Highchairs',highchair.length,'#E74C3C']].map(([label,count,color]) => (
          <div key={label} style={{ background:'#fff', borderRadius:10, padding:'8px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:18, fontWeight:800, color }}>{count}</div>
            <div style={{ fontSize:10, color:'#7F8C8D', marginTop:1 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )

  const guestPanel = (
    <div>
      {unassigned.length > 0 && (
        <GuestGroup title="Unassigned" color="#7F8C8D" guests={unassigned}
          selected={selected} onSelect={handleGuestClick}
          onSpill={g => setCategory(g.id,'spill')} onHighchair={g => setCategory(g.id,'highchair')}
          guestToSeat={guestToSeat} />
      )}
      {seated.length > 0 && (
        <GuestGroup title="At Table" color="#0F2942" guests={seated}
          selected={selected} onSelect={handleGuestClick}
          onSpill={g => setCategory(g.id,'spill')} onHighchair={g => setCategory(g.id,'highchair')}
          guestToSeat={guestToSeat} />
      )}
      <SpillGroup title="Spill List" subtitle="Kids not at the main table" color="#1B4F72"
        guests={spill} onRemove={g => setCategory(g.id,'spill')} />
      <SpillGroup title="Highchairs" subtitle="Little ones in highchairs" color="#E74C3C"
        guests={highchair} onRemove={g => setCategory(g.id,'highchair')} />
    </div>
  )

  return (
    <div style={{ maxWidth: wide ? 1400 : 900, margin:'0 auto', fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif" }} className="fade-in">

      {/* Header */}
      <div style={{ background:'linear-gradient(140deg, #0F2942 0%, #1B4F72 100%)', padding:'52px 20px 20px' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:13, marginBottom:12, padding:0 }}>← Back to Event</button>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ color:'#fff', fontSize:22, fontWeight:800, margin:'0 0 4px' }}>Seating Plan</h1>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, margin:0 }}>{event.name}</p>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
            {/* Size selector */}
            <div style={{ display:'flex', gap:3 }}>
              {[20,22,24,26].map(s => (
                <button key={s} onClick={() => setSize(s)} style={{
                  width:34, height:34, borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:700,
                  background: size===s ? '#E8A838' : 'rgba(255,255,255,0.15)',
                  color: size===s ? '#0F2942' : 'rgba(255,255,255,0.7)',
                }}>{s}</button>
              ))}
            </div>
            <button onClick={save} disabled={saving} style={{
              padding:'8px 18px', background: saved ? '#27AE60' : '#E8A838',
              color:'#0F2942', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', transition:'background 0.3s',
            }}>
              {saving ? '...' : saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Body — wide = side by side, narrow = tabs */}
      {wide ? (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, padding:'16px 16px 32px', alignItems:'start' }}>
          <div>{tablePanel}</div>
          <div style={{ background:'#fff', borderRadius:14, padding:16, boxShadow:'0 1px 8px rgba(0,0,0,0.07)', maxHeight:'calc(100vh - 200px)', overflowY:'auto' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#7F8C8D', textTransform:'uppercase', letterSpacing:2, marginBottom:14 }}>Guest List</div>
            {guestPanel}
          </div>
        </div>
      ) : (
        <div style={{ padding:'16px 12px 32px' }}>
          <TabbedPanels tablePanel={tablePanel} guestPanel={guestPanel} />
        </div>
      )}
    </div>
  )
}

function TabbedPanels({ tablePanel, guestPanel }) {
  const [tab, setTab] = useState('table')
  return (
    <>
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {[['table','🪑 Table'],['guests','👥 Guests']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'8px 18px', border:'none', borderRadius:20, cursor:'pointer', fontSize:13, fontWeight:700,
            background: tab===id ? '#0F2942' : '#fff',
            color: tab===id ? '#fff' : '#7F8C8D',
            boxShadow:'0 1px 4px rgba(0,0,0,0.08)',
          }}>{label}</button>
        ))}
      </div>
      {tab === 'table'  && <div className="fade-in">{tablePanel}</div>}
      {tab === 'guests' && <div className="fade-in">{guestPanel}</div>}
    </>
  )
}

function GuestGroup({ title, color, guests, selected, onSelect, onSpill, onHighchair, guestToSeat }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'#7F8C8D', textTransform:'uppercase', letterSpacing:2, marginBottom:6 }}>{title}</div>
      {guests.map(g => {
        const isSel  = selected === g.id
        const seatNo = guestToSeat?.[g.id]
        return (
          <div key={g.id} onClick={() => onSelect(g.id)} style={{
            background: isSel ? '#FDF3DC' : '#F4F7FB',
            border: `1.5px solid ${isSel ? '#E8A838' : 'transparent'}`,
            borderRadius:9, padding:'8px 10px', marginBottom:5,
            display:'flex', alignItems:'center', gap:8, cursor:'pointer', transition:'all 0.15s',
          }}>
            <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, background: isSel ? '#E8A838' : color, color: isSel ? '#0F2942' : '#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700 }}>
              {g.given_names?.[0]}{g.surname?.[0]}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#0F2942', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{g.given_names} {g.surname}</div>
              {seatNo && <div style={{ fontSize:10, color:'#E8A838', fontWeight:700 }}>Seat {seatNo}</div>}
            </div>
            <div style={{ display:'flex', gap:3, flexShrink:0 }}>
              <button onClick={e => { e.stopPropagation(); onSpill(g) }} title="Spill list" style={{ padding:'3px 7px', background:'#EBF2FA', border:'none', borderRadius:5, fontSize:10, fontWeight:700, color:'#1B4F72', cursor:'pointer' }}>Spill</button>
              <button onClick={e => { e.stopPropagation(); onHighchair(g) }} title="Highchair" style={{ padding:'3px 7px', background:'#FEF2F2', border:'none', borderRadius:5, fontSize:11, color:'#E74C3C', cursor:'pointer' }}>🪑</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SpillGroup({ title, subtitle, color, guests, onRemove }) {
  if (guests.length === 0) return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:10, fontWeight:700, color, textTransform:'uppercase', letterSpacing:2, marginBottom:4 }}>{title} <span style={{ color:'#BDC3C7', fontWeight:400, textTransform:'none', letterSpacing:0 }}>{subtitle}</span></div>
      <div style={{ minHeight:36, background:'#F4F7FB', borderRadius:8, border:`1.5px dashed #D0D8E4`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ color:'#D0D8E4', fontSize:11 }}>None yet</span>
      </div>
    </div>
  )
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:10, fontWeight:700, color, textTransform:'uppercase', letterSpacing:2, marginBottom:6 }}>{title} <span style={{ color:'#BDC3C7', fontWeight:400, textTransform:'none', letterSpacing:0 }}>{subtitle}</span></div>
      <div style={{ background:'#F4F7FB', borderRadius:8, border:`1.5px solid ${color}22`, padding:'8px 10px' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {guests.map(g => (
            <div key={g.id} style={{ display:'flex', alignItems:'center', gap:4, background:'#fff', borderRadius:16, padding:'4px 8px 4px 6px', fontSize:11, border:`1px solid ${color}44` }}>
              <span style={{ fontWeight:600, color:'#0F2942' }}>{g.given_names}</span>
              <button onClick={() => onRemove(g)} style={{ background:'none', border:'none', color:'#E74C3C', cursor:'pointer', fontSize:13, padding:0, lineHeight:1, marginLeft:1 }}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16 }}>
      <div style={{ width:36, height:36, border:'3px solid #E8A838', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <div style={{ color:'#7F8C8D', fontSize:13, fontWeight:500 }}>Loading...</div>
    </div>
  )
}
