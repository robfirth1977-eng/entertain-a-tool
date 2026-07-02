import { useState, useEffect } from 'react'
import { supabase } from '../eat'
import TablePlanner from './TablePlanner'

export default function PlanEvent({ onBack }) {
  const [view, setView]         = useState('list')
  const [events, setEvents]     = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => { fetchEvents() }, [])

  async function fetchEvents() {
    const { data } = await supabase.from('events').select('*').order('event_date', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }

  async function createEvent(name, date, endDate) {
    const { data, error } = await supabase.from('events').insert({ name, event_date: date, end_date: endDate, total_guests: 0 }).select().single()
    if (!error) { setEvents(ev => [data, ...ev]); setSelected(data); setView('detail') }
  }

  if (loading) return <Spinner />
  if (view === 'seating' && selected) return <TablePlanner event={selected} onBack={() => setView('detail')} />
  if (view === 'detail'  && selected) return <EventDetail event={selected} onBack={() => { setView('list'); fetchEvents() }} onSeating={() => setView('seating')} />
  if (view === 'new')                 return <NewEventForm onBack={() => setView('list')} onCreate={createEvent} />

  const upcoming = events.filter(e => new Date(e.event_date) >= new Date(new Date().setHours(0,0,0,0)))
  const past     = events.filter(e => new Date(e.event_date) <  new Date(new Date().setHours(0,0,0,0)))

  return (
    <div style={{ maxWidth:600, margin:'0 auto' }} className="fade-in">
      <div style={{ background:'linear-gradient(140deg, #0F2942 0%, #1B4F72 100%)', padding:'52px 24px 28px' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:13, marginBottom:12, padding:0 }}>← Home</button>
        <h1 style={{ color:'#fff', fontSize:26, fontWeight:800, margin:'0 0 4px' }}>Events</h1>
        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, margin:0 }}>{events.length} events total</p>
      </div>
      <div style={{ padding:'20px 16px 32px' }}>
        <button onClick={() => setView('new')} style={{ width:'100%', padding:'16px 20px', marginBottom:24, background:'linear-gradient(135deg, #E8A838 0%, #D4922A 100%)', border:'none', borderRadius:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 4px 16px rgba(232,168,56,0.3)' }}>
          <span style={{ fontWeight:800, fontSize:16, color:'#0F2942' }}>+ Plan a New Event</span>
          <span style={{ fontSize:22, color:'#0F2942', opacity:0.7 }}>→</span>
        </button>
        {upcoming.length > 0 && <><SectionLabel label="Upcoming" />{upcoming.map((ev,i) => <EventCard key={ev.id} event={ev} index={i} upcoming onTap={() => { setSelected(ev); setView('detail') }} />)}</>}
        {past.length > 0 && <><SectionLabel label="Past Events" />{past.map((ev,i) => <EventCard key={ev.id} event={ev} index={i} onTap={() => { setSelected(ev); setView('detail') }} />)}</>}
      </div>
    </div>
  )
}

function EventCard({ event, onTap, index, upcoming }) {
  const fmt = d => new Date(d).toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short', year:'numeric' })
  const nights = event.end_date
    ? Math.round((new Date(event.end_date) - new Date(event.event_date)) / (1000*60*60*24))
    : null
  return (
    <div onClick={onTap} className="fade-in" style={{ background:'#fff', borderRadius:14, padding:'16px', marginBottom:10, cursor:'pointer', boxShadow:'0 1px 6px rgba(0,0,0,0.06)', borderLeft:`4px solid ${upcoming?'#E8A838':'#D0D8E4'}`, animationDelay:`${index*0.04}s`, transition:'transform 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
      onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:15, color:'#0F2942', marginBottom:4 }}>{event.name||'Event'}</div>
          <div style={{ fontSize:13, color:'#7F8C8D' }}>
            {fmt(event.event_date)}
            {nights > 0 && ` → ${fmt(event.end_date)}`}
          </div>
          {nights > 0 && (
            <div style={{ fontSize:11, color:'#E8A838', fontWeight:700, marginTop:3 }}>{nights} night{nights>1?'s':''}</div>
          )}
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:13, fontWeight:700, color:upcoming?'#E8A838':'#BDC3C7' }}>{event.total_guests} guests</div>
          <div style={{ fontSize:11, color:'#BDC3C7', marginTop:2 }}>Tap to open →</div>
        </div>
      </div>
    </div>
  )
}

function NewEventForm({ onBack, onCreate }) {
  const [name, setName]       = useState('')
  const [type, setType]       = useState('meal')
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving]   = useState(false)

  const nights = type === 'overnight' && date && endDate
    ? Math.round((new Date(endDate) - new Date(date)) / (1000*60*60*24))
    : null

  async function handle() {
    if (!name || !date) return
    setSaving(true)
    await onCreate(name, date, type === 'overnight' ? (endDate || null) : null)
    setSaving(false)
  }

  return (
    <div style={{ maxWidth:600, margin:'0 auto' }} className="fade-in">
      <div style={{ background:'linear-gradient(140deg, #0F2942 0%, #1B4F72 100%)', padding:'52px 24px 28px' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:13, marginBottom:12, padding:0 }}>Back</button>
        <h1 style={{ color:'#fff', fontSize:26, fontWeight:800, margin:0 }}>New Event</h1>
      </div>
      <div style={{ padding:'24px 16px' }}>
        <div style={{ background:'#fff', borderRadius:14, padding:20, boxShadow:'0 1px 6px rgba(0,0,0,0.07)' }}>

          {/* Event type selector */}
          <div style={{ marginBottom:18 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#7F8C8D', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>Event Type</label>
            <div style={{ display:'flex', gap:10 }}>
              {[['meal','Meal / Dinner','🍽'], ['overnight','Overnight Stay','🛏']].map(([val, label, emoji]) => (
                <button key={val} onClick={() => setType(val)} style={{
                  flex:1, padding:'12px', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700,
                  border: `2px solid ${type===val ? '#0F2942' : '#E2E8F0'}`,
                  background: type===val ? '#0F2942' : '#F4F7FB',
                  color: type===val ? '#fff' : '#7F8C8D',
                  transition:'all 0.15s',
                }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{emoji}</div>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Field label="Event Name" value={name} onChange={setName} placeholder={type==='overnight' ? 'e.g. Jensen Visit' : 'e.g. Dinner Party'} />

          {type === 'meal' ? (
            <div style={{ marginTop:14 }}>
              <Field label="Date" value={date} onChange={setDate} type="date" />
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:14 }}>
              <Field label="Check-in" value={date} onChange={setDate} type="date" />
              <Field label="Check-out" value={endDate} onChange={setEndDate} type="date" />
            </div>
          )}

          {nights > 0 && (
            <div style={{ marginTop:14, padding:'10px 14px', background:'#EBF2FA', borderRadius:8, borderLeft:'3px solid #1B4F72', fontSize:13, color:'#0F2942' }}>
              <strong>{nights} night{nights>1?'s':''}</strong> — {new Date(date).toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' })} to {new Date(endDate).toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' })}
            </div>
          )}
        </div>

        <div style={{ marginTop:20, display:'flex', justifyContent:'flex-end' }}>
          <button onClick={handle} disabled={!name||!date||saving} style={{ padding:'12px 28px', background:name&&date?'#0F2942':'#BDC3C7', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:name&&date?'pointer':'not-allowed' }}>
            {saving ? 'Creating...' : 'Create & Add Guests'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Style Picker ───────────────────────────────────────────────────────────────
const TAG_STYLES = {
  bw: {
    label: 'Elegant B&W',
    emoji: '⬜',
    desc: 'Classic black & white — printer friendly',
    frontBg: '#FFFFFF',
    frontAccent: '#000000',
    accentBar: '#000000',
    nameColor: '#000000',
    surnameColor: '#333333',
    eventColor: '#aaaaaa',
    backBg: '#FFFFFF',
    backAccent: '#000000',
    labelColor: '#aaaaaa',
    itemColor: '#000000',
    font: 'Georgia, "Times New Roman", serif',
    border: '0.4mm solid #000000',
    extraFrontCss: `.front-accent{background:#000!important;height:0.3mm!important}.front::before{content:'';position:absolute;top:2.5mm;left:2.5mm;right:2.5mm;bottom:2.5mm;border:0.5mm solid #000;pointer-events:none}.front::after{content:'';position:absolute;top:4mm;left:4mm;right:4mm;bottom:4mm;border:0.25mm solid #000;pointer-events:none}.back::before{content:'';position:absolute;top:2.5mm;left:2.5mm;right:2.5mm;bottom:2.5mm;border:0.5mm solid #000;pointer-events:none}.back::after{content:'';position:absolute;top:4mm;left:4mm;right:4mm;bottom:4mm;border:0.25mm solid #000;pointer-events:none}`,
  },
  formal: {
    label: 'Formal Dinner',
    emoji: '🕯',
    desc: 'Classic & elegant',
    frontBg: '#FFFFFF',
    frontAccent: '#1a1a2e',
    accentBar: '#C9A84C',
    nameColor: '#1a1a2e',
    surnameColor: '#4a4a6a',
    eventColor: '#9a9ab0',
    backBg: '#F8F6F0',
    backAccent: '#C9A84C',
    labelColor: '#9a9ab0',
    itemColor: '#1a1a2e',
    font: 'Georgia, "Times New Roman", serif',
    border: '0.3mm solid #C9A84C',
    extraFrontCss: `.front::before{content:'';position:absolute;top:3mm;left:3mm;right:3mm;bottom:3mm;border:0.3mm solid #C9A84C22;border-radius:1mm;pointer-events:none}`,
  },
  casual: {
    label: 'Casual & Fun',
    emoji: '🎨',
    desc: 'Relaxed & colourful',
    frontBg: '#FFFBF0',
    frontAccent: '#0F2942',
    accentBar: '#E8A838',
    nameColor: '#0F2942',
    surnameColor: '#1B4F72',
    eventColor: '#E8A838',
    backBg: '#EBF2FA',
    backAccent: '#E8A838',
    labelColor: '#1B4F72',
    itemColor: '#0F2942',
    font: "'Arial Rounded MT Bold', 'Helvetica Neue', Arial, sans-serif",
    border: '0.4mm solid #E8A838',
    extraFrontCss: `.front-event{background:#E8A838;color:#0F2942!important;padding:1mm 4mm;border-radius:10mm;letter-spacing:1px}`,
  },
  christmas: {
    label: 'Christmas',
    emoji: '🎄',
    desc: 'Festive theme',
    frontBg: '#FFFFFF',
    frontAccent: '#1B5E20',
    accentBar: '#C62828',
    nameColor: '#1B5E20',
    surnameColor: '#C62828',
    eventColor: '#C62828',
    backBg: '#F1F8E9',
    backAccent: '#C62828',
    labelColor: '#558B2F',
    itemColor: '#1B5E20',
    font: 'Georgia, serif',
    border: '0.4mm solid #C62828',
    extraFrontCss: `.front::after{content:'* * *';position:absolute;bottom:3mm;left:0;right:0;text-align:center;font-size:7pt;color:#C6282840;letter-spacing:3px}`,
  },
  birthday: {
    label: 'Birthday',
    emoji: '🎂',
    desc: 'Celebratory',
    frontBg: '#FFFAF5',
    frontAccent: '#6A1B9A',
    accentBar: '#F06292',
    nameColor: '#6A1B9A',
    surnameColor: '#AD1457',
    eventColor: '#F06292',
    backBg: '#FCE4EC',
    backAccent: '#F06292',
    labelColor: '#AD1457',
    itemColor: '#6A1B9A',
    font: "'Georgia', serif",
    border: '0.4mm solid #F06292',
    extraFrontCss: `.front-accent{background:linear-gradient(90deg,#F06292,#CE93D8,#F06292)!important}`,
  },
}

function StylePicker({ onPick, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,41,66,0.65)', zIndex:1000, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:'24px 20px 32px', width:'100%', maxWidth:540, boxShadow:'0 -8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#0F2942', margin:0 }}>Choose Name Tag Style</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#7F8C8D' }}>x</button>
        </div>
        <p style={{ fontSize:13, color:'#7F8C8D', marginBottom:20 }}>Select a style for this print run.</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {Object.entries(TAG_STYLES).map(([key, s]) => (
            <button key={key} onClick={() => onPick(key)} style={{
              padding:'16px 12px', border:`2px solid ${s.accentBar}`, borderRadius:12,
              background:'#fff', cursor:'pointer', textAlign:'left', transition:'all 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background='#F4F7FB'}
              onMouseLeave={e => e.currentTarget.style.background='#fff'}
            >
              <div style={{ fontSize:28, marginBottom:6 }}>{s.emoji}</div>
              <div style={{ fontWeight:700, fontSize:13, color:'#0F2942' }}>{s.label}</div>
              <div style={{ fontSize:11, color:'#7F8C8D', marginTop:2 }}>{s.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function printNameTags(attendance, eventName, menu) {
  const main    = menu?.main    || ''
  const sides   = menu?.sides   || ''
  const dessert = menu?.dessert || ''
  const dietary = menu?.dietary || ''

  const BORDER = `<path d="M 16,8 L 244,8 A 8,8 0 0 0 252,16 L 252,126 A 8,8 0 0 0 244,134 L 16,134 A 8,8 0 0 0 8,126 L 8,16 A 8,8 0 0 0 16,8 Z" fill="none" stroke="#111" stroke-width="0.8"/>`

  const DIAMOND_LG = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="12" viewBox="0 0 150 12"><line x1="0" y1="6" x2="64" y2="6" stroke="#111" stroke-width="0.7"/><polygon points="75,1 81,6 75,11 69,6" fill="#111"/><line x1="86" y1="6" x2="150" y2="6" stroke="#111" stroke-width="0.7"/></svg>`
  const DIAMOND_SM = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="10" viewBox="0 0 100 10"><line x1="0" y1="5" x2="42" y2="5" stroke="#111" stroke-width="0.5"/><polygon points="50,1 55,5 50,9 45,5" fill="#111"/><line x1="58" y1="5" x2="100" y2="5" stroke="#111" stroke-width="0.5"/></svg>`

  const menuCourses = [
    main    ? `<div class="course-label">Main Course</div><div class="course-item">${main}</div>` : '',
    sides   ? `${main ? `<div class="divider">${DIAMOND_SM}</div>` : ''}<div class="course-label">Sides</div><div class="course-item">${sides}</div>` : '',
    dessert ? `<div class="divider">${DIAMOND_SM}</div><div class="course-label">Dessert</div><div class="course-item">${dessert}</div>` : '',
    dietary ? `<div class="dietary">${dietary}</div>` : '',
  ].filter(Boolean).join('')

  const tags = attendance.map(att => {
    const g = att.guests
    if (!g) return ''
    return `
      <div class="tag">
        <!-- BACK: top half, rotated 180deg -->
        <div class="half back">
          <svg class="border-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 142">${BORDER}</svg>
          <div class="back-content">
            <div class="menu-heading">
              <div class="rule"></div>
              <div class="menu-title">MENU</div>
              <div class="rule"></div>
            </div>
            <div class="divider">${DIAMOND_LG}</div>
            ${menuCourses || '<div class="no-menu">No menu set</div>'}
          </div>
        </div>
        <!-- Fold line -->
        <div class="fold"></div>
        <!-- FRONT: bottom half -->
        <div class="half front">
          <svg class="border-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 142">${BORDER}</svg>
          <div class="front-content">
            <div class="event-name">${eventName || ''}</div>
            <div class="divider">${DIAMOND_LG}</div>
            <div class="guest-first">${g.given_names}</div>
            <div class="guest-last">${g.surname}</div>
          </div>
        </div>
      </div>`
  }).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Palatino Linotype', Palatino, Georgia, serif; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .grid { display: flex; flex-wrap: wrap; gap: 5mm; }

    /* Card: 90mm wide x 100mm tall */
    .tag { width: 90mm; height: 100mm; display: flex; flex-direction: column; page-break-inside: avoid; break-inside: avoid; }

    /* Each half: 90mm x 50mm */
    .half { width: 90mm; height: 50mm; position: relative; display: flex; align-items: center; justify-content: center; }

    /* Back half is rotated 180deg so it reads correctly when folded */
    .back { transform: rotate(180deg); }

    /* Border SVG fills the half */
    .border-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }

    /* Fold line */
    .fold { height: 0; border-top: 0.3mm dashed #bbb; flex-shrink: 0; }

    /* Content sits above border SVG */
    .back-content, .front-content { position: relative; z-index: 1; text-align: center; padding: 0 8mm; width: 100%; }

    /* BACK styles */
    .menu-heading { display: flex; align-items: center; justify-content: center; gap: 3mm; margin-bottom: 1.5mm; }
    .rule { flex: 1; height: 0.3mm; background: #111; }
    .menu-title { font-size: 7.5pt; letter-spacing: 4px; text-transform: uppercase; font-weight: bold; color: #111; white-space: nowrap; }
    .divider { display: flex; justify-content: center; margin: 1.5mm 0; }
    .course-label { font-size: 6pt; letter-spacing: 3px; text-transform: uppercase; font-weight: bold; color: #111; margin-bottom: 0.8mm; }
    .course-item { font-size: 8pt; color: #111; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.3; margin-bottom: 1mm; }
    .dietary { font-size: 6pt; color: #666; font-style: italic; margin-top: 1mm; }
    .no-menu { font-size: 7pt; color: #ccc; font-style: italic; }

    /* FRONT styles */
    .event-name { font-size: 6.5pt; letter-spacing: 5px; text-transform: uppercase; color: #111; margin-bottom: 1mm; }
    .subtitle { font-size: 11pt; font-style: italic; color: #111; margin-bottom: 2mm; letter-spacing: 1px; }
    .guest-first { font-size: 22pt; font-weight: bold; color: #111; letter-spacing: 4px; line-height: 1.1; }
    .guest-last { font-size: 14pt; font-weight: normal; color: #111; letter-spacing: 4px; margin-top: 1mm; }

    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body>
  <div class="grid">${tags}</div>
  <script>setTimeout(() => window.print(), 600)</script>
  </body></html>`

  const w = window.open('', '_blank', 'width=900,height=700')
  w.document.write(html)
  w.document.close()
}

function MenuEditor({ event, onClose }) {
  const [menu, setMenu]     = useState({ main: event.menu?.main||'', sides: event.menu?.sides||'', dessert: event.menu?.dessert||'', dietary: event.menu?.dietary||'' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('events').update({ menu }).eq('id', event.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose(menu) }, 1200)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,41,66,0.6)', zIndex:1000, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:'24px 20px 32px', width:'100%', maxWidth:540, boxShadow:'0 -8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#0F2942', margin:0 }}>Event Menu</h2>
          <button onClick={() => onClose(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#7F8C8D' }}>x</button>
        </div>
        <p style={{ fontSize:13, color:'#7F8C8D', marginBottom:20, lineHeight:1.5 }}>
          This menu prints on the back of every name tag.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Main Course" value={menu.main} onChange={v => setMenu(m=>({...m,main:v}))} placeholder="e.g. Slow roasted lamb shoulder" />
          <Field label="Sides" value={menu.sides} onChange={v => setMenu(m=>({...m,sides:v}))} placeholder="e.g. Roast potatoes, green beans, gravy" />
          <Field label="Dessert" value={menu.dessert} onChange={v => setMenu(m=>({...m,dessert:v}))} placeholder="e.g. Sticky date pudding" />
          <Field label="Dietary notes" value={menu.dietary} onChange={v => setMenu(m=>({...m,dietary:v}))} placeholder="e.g. Vegetarian option available" />
        </div>
        <div style={{ marginTop:24, display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={() => onClose(null)} style={{ padding:'10px 20px', background:'#F4F7FB', color:'#7F8C8D', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding:'10px 24px', background:saved?'#27AE60':'#0F2942', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', transition:'background 0.3s' }}>
            {saving?'Saving...':saved?'Saved!':'Save Menu'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EventDetail({ event, onBack, onSeating }) {
  const [tab, setTab]               = useState('guests')
  const [attendance, setAttendance] = useState([])
  const [households, setHouseholds] = useState([])
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(null)
  const [showMenu, setShowMenu]         = useState(false)
  const [showStylePicker, setShowStylePicker] = useState(false)
  const [showEdit, setShowEdit]     = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [menu, setMenu]             = useState(event.menu || {})
  const [rooms, setRooms]           = useState(event.rooms || {})
  const [eventData, setEventData]   = useState(event)

  const ROOMS = [
    { id: 'deluxe',   name: 'Deluxe Guest Room',   desc: 'Queen bed + ensuite', icon: '👑' },
    { id: 'standard', name: 'Standard Guest Room',  desc: 'Queen bed + ensuite', icon: '🛏' },
    { id: 'nursery',  name: 'Nursery',              desc: 'Single + cot',        icon: '🍼' },
    { id: 'study',    name: 'Study',                desc: 'Single bed',          icon: '📚' },
  ]

  const isOvernight = !!eventData.end_date
  const fmt    = d => new Date(d).toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const fmtShort = d => new Date(d).toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' })
  const isPast = new Date(eventData.event_date) < new Date(new Date().setHours(0,0,0,0))
  const nights = isOvernight ? Math.round((new Date(eventData.end_date) - new Date(eventData.event_date)) / (1000*60*60*24)) : null

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: att }, { data: hh }, { data: ev }] = await Promise.all([
      supabase.from('attendance').select('*, guests(id, given_names, surname, household_id, is_householder, allergies)').eq('event_id', event.id),
      supabase.from('households').select('*').order('last_entertained', { ascending: true, nullsFirst: true }),
      supabase.from('events').select('menu, rooms, end_date').eq('id', event.id).single(),
    ])
    setAttendance(att||[])
    setHouseholds(hh||[])
    if (ev?.menu)  setMenu(ev.menu)
    if (ev?.rooms) setRooms(ev.rooms)
    if (ev?.end_date) setEventData(d => ({...d, end_date: ev.end_date}))
    setLoading(false)
  }

  async function deleteEvent() {
    setDeleting(true)
    await supabase.from('attendance').delete().eq('event_id', event.id)
    await supabase.from('events').delete().eq('id', event.id)
    onBack()
  }

  async function saveRooms(newRooms) {
    setRooms(newRooms)
    await supabase.from('events').update({ rooms: newRooms }).eq('id', event.id)
  }

  const attendedHHIds = new Set(attendance.map(a => a.guests?.household_id))

  async function addHousehold(hh) {
    setSaving(hh.id)
    const { data: hhGuests } = await supabase.from('guests').select('*').eq('household_id', hh.id)
    if (hhGuests?.length) {
      await supabase.from('attendance').insert(hhGuests.map(g => ({ event_id: event.id, guest_id: g.id, attended: true })))
      await supabase.from('households').update({ last_entertained: event.event_date, times_hosted: (hh.times_hosted||0)+1 }).eq('id', hh.id)
      await supabase.from('events').update({ total_guests: attendance.length + hhGuests.length }).eq('id', event.id)
      await fetchAll()
    }
    setSaving(null)
  }

  async function removeGuest(attId) {
    // Find the guest being removed so we can update their household
    const att = attendance.find(a => a.id === attId)
    const hhId = att?.guests?.household_id

    await supabase.from('attendance').delete().eq('id', attId)
    const newAttendance = attendance.filter(x => x.id !== attId)
    setAttendance(newAttendance)

    // Recalculate household last_entertained and times_hosted from remaining attendance
    if (hhId) {
      const { data: hhAttendance } = await supabase
        .from('attendance')
        .select('events(event_date)')
        .eq('attended', true)
        .in('guest_id', newAttendance.filter(a => a.guests?.household_id === hhId).map(a => a.guest_id))

      const dates = (hhAttendance || [])
        .map(a => a.events?.event_date)
        .filter(Boolean)
        .sort()
        .reverse()

      const lastEntertained = dates[0] || null
      // Count distinct events for this household from all attendance (not just this event)
      const { data: allHHAtt } = await supabase
        .from('attendance')
        .select('events(event_date, id), guests!inner(household_id)')
        .eq('guests.household_id', hhId)
        .eq('attended', true)

      const distinctEvents = new Set((allHHAtt || []).map(a => a.events?.id)).size

      await supabase.from('households').update({
        last_entertained: lastEntertained,
        times_hosted: distinctEvents,
      }).eq('id', hhId)
    }
  }

  async function toggleAttended(att) {
    const v = !att.attended
    await supabase.from('attendance').update({ attended: v }).eq('id', att.id)
    setAttendance(a => a.map(x => x.id===att.id ? {...x, attended:v} : x))
  }

  const weeksAgo = d => d ? Math.floor((Date.now()-new Date(d))/(7*24*60*60*1000)) : null

  const suggested = households.filter(hh => {
    if (attendedHHIds.has(hh.id)) return false
    if (search) return hh.householder?.toLowerCase().includes(search.toLowerCase()) || hh.locality?.toLowerCase().includes(search.toLowerCase())
    return true
  })

  const hasMenu = menu?.main || menu?.sides || menu?.dessert || menu?.dietary

  if (loading) return <Spinner />

  return (
    <>
      {showMenu && (
        <MenuEditor
          event={{...event, menu}}
          onClose={m => { if (m) setMenu(m); setShowMenu(false) }}
        />
      )}
      {showStylePicker && (
        <StylePicker
          onPick={key => { setShowStylePicker(false); printNameTags(attendance, event.name, menu, key) }}
          onClose={() => setShowStylePicker(false)}
        />
      )}
      <div style={{ maxWidth:600, margin:'0 auto' }} className="fade-in">
        {showDelete && (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,41,66,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 20px' }}>
            <div style={{ background:'#fff', borderRadius:16, padding:'28px 24px', maxWidth:400, width:'100%', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🗑️</div>
              <h3 style={{ color:'#0F2942', fontSize:18, fontWeight:800, marginBottom:8 }}>Delete this event?</h3>
              <p style={{ color:'#7F8C8D', fontSize:13, marginBottom:24 }}>This will permanently delete <strong>{eventData.name}</strong> and all its guest and attendance records. This cannot be undone.</p>
              <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                <button onClick={() => setShowDelete(false)} style={{ padding:'10px 24px', background:'#F4F7FB', color:'#7F8C8D', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>Cancel</button>
                <button onClick={deleteEvent} disabled={deleting} style={{ padding:'10px 24px', background:'#E74C3C', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
        {showEdit && (
          <EditEventForm event={eventData} onClose={(updated) => {
            if (updated) setEventData(d => ({...d, ...updated}))
            setShowEdit(false)
          }} />
        )}
        <div style={{ background:'linear-gradient(140deg, #0F2942 0%, #1B4F72 100%)', padding:'52px 24px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <button onClick={onBack} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:13, padding:0 }}>
              Back to Events
            </button>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setShowEdit(true)} style={{ padding:'5px 12px', background:'rgba(255,255,255,0.15)', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer' }}>Edit</button>
              <button onClick={() => setShowDelete(true)} style={{ padding:'5px 12px', background:'rgba(231,76,60,0.3)', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer' }}>Delete</button>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:4 }}>
            <div>
              <h1 style={{ color:'#fff', fontSize:24, fontWeight:800, margin:'0 0 4px' }}>{eventData.name}</h1>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, margin:0 }}>
                {isOvernight
                  ? `${fmtShort(eventData.event_date)} → ${fmtShort(eventData.end_date)} · ${nights} night${nights>1?'s':''}`
                  : fmt(eventData.event_date)
                } · {attendance.length} guests
              </p>
            </div>
            <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
              {!isOvernight && (
                <button onClick={onSeating} style={{ padding:'7px 12px', background:'rgba(255,255,255,0.15)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  Seating
                </button>
              )}
              <button onClick={() => setShowMenu(true)} style={{ padding:'7px 12px', background:hasMenu?'#27AE60':'rgba(255,255,255,0.15)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                {hasMenu ? 'Menu set' : 'Menu'}
              </button>
              <button onClick={() => printNameTags(attendance, eventData.name, menu)} style={{ padding:'7px 12px', background:'#E8A838', color:'#0F2942', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                Name Tags
              </button>
            </div>
          </div>
          {hasMenu && (
            <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:8, padding:'8px 14px', marginBottom:12, fontSize:12, color:'rgba(255,255,255,0.7)', display:'flex', gap:16, flexWrap:'wrap' }}>
              {menu.main    && <span>Main: <strong style={{color:'#fff'}}>{menu.main}</strong></span>}
              {menu.sides   && <span>Sides: <strong style={{color:'#fff'}}>{menu.sides}</strong></span>}
              {menu.dessert && <span>Dessert: <strong style={{color:'#fff'}}>{menu.dessert}</strong></span>}
              {menu.dietary && <span style={{fontStyle:'italic'}}>{menu.dietary}</span>}
            </div>
          )}
          <div style={{ display:'flex', gap:4, marginTop:8 }}>
            {[
              ['guests', 'Guest List'],
              ['suggest', 'Add Guests'],
              ...(isOvernight ? [['rooms', 'Rooms']] : []),
            ].map(([id,label]) => (
              <button key={id} onClick={() => setTab(id)} style={{ padding:'10px 18px', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, background:tab===id?'#fff':'transparent', color:tab===id?'#0F2942':'rgba(255,255,255,0.6)', borderRadius:'8px 8px 0 0' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:'16px 16px 32px' }}>
          {tab === 'guests' && (
            <div className="fade-in">
              {attendance.length === 0 ? (
                <div style={{ textAlign:'center', padding:'48px 24px', background:'#fff', borderRadius:14, boxShadow:'0 1px 6px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
                  <div style={{ fontWeight:700, color:'#0F2942', marginBottom:8 }}>No guests yet</div>
                  <div style={{ fontSize:13, color:'#7F8C8D' }}>Switch to Add Guests to invite households</div>
                </div>
              ) : attendance.map((att, i) => {
                const g = att.guests
                return (
                  <div key={att.id} className="fade-in" style={{ background:'#fff', borderRadius:12, padding:'12px 14px', marginBottom:8, display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 4px rgba(0,0,0,0.05)', opacity:att.attended?1:0.5, animationDelay:`${i*0.02}s` }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, background:g?.is_householder?'#0F2942':'#EBF2FA', color:g?.is_householder?'#E8A838':'#0F2942', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12 }}>
                      {g?.given_names?.[0]}{g?.surname?.[0]}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:13, color:'#0F2942', textDecoration:att.attended?'none':'line-through' }}>
                        {g ? `${g.given_names} ${g.surname}` : 'Unknown'}
                      </div>
                      {g?.allergies && <div style={{ fontSize:11, color:'#E74C3C', marginTop:2 }}>! {g.allergies}</div>}
                    </div>
                    {isPast && (
                      <button onClick={() => toggleAttended(att)} style={{ padding:'4px 10px', borderRadius:20, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, background:att.attended?'#D5F5E3':'#F4F7FB', color:att.attended?'#27AE60':'#BDC3C7' }}>
                        {att.attended?'Attended':'No show'}
                      </button>
                    )}
                    <button onClick={() => removeGuest(att.id)} style={{ background:'none', border:'none', color:'#E74C3C', cursor:'pointer', fontSize:16, padding:'0 4px', opacity:0.5 }}>x</button>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'suggest' && (
            <div className="fade-in">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search households..."
                style={{ width:'100%', padding:'12px 16px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14, outline:'none', background:'#fff', marginBottom:14, boxSizing:'border-box' }} />
              {suggested.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 24px', color:'#7F8C8D', fontSize:14 }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>All households invited!</div>
                </div>
              ) : suggested.map((hh, i) => {
                const never = !hh.last_entertained
                const weeks = weeksAgo(hh.last_entertained)
                const isSav = saving === hh.id
                return (
                  <div key={hh.id} className="fade-in" style={{ background:'#fff', borderRadius:14, padding:'14px 16px', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 1px 6px rgba(0,0,0,0.06)', borderLeft:`4px solid ${never?'#E8A838':weeks>12?'#E74C3C':'#D0D8E4'}`, animationDelay:`${i*0.03}s` }}>
                    <div style={{ flex:1, minWidth:0, marginRight:12 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:'#0F2942', marginBottom:3 }}>{hh.householder}</div>
                      <div style={{ fontSize:12, color:'#7F8C8D' }}>{hh.locality} - {hh.size} {hh.size===1?'person':'people'}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                      <div style={{ fontSize:11, fontWeight:700, borderRadius:20, padding:'3px 10px', background:never?'#FDF3DC':weeks>12?'#FEF2F2':'#F4F7FB', color:never?'#D4922A':weeks>12?'#E74C3C':'#BDC3C7' }}>
                        {never?'Never':`${weeks}w ago`}
                      </div>
                      <button onClick={() => addHousehold(hh)} disabled={isSav} style={{ padding:'7px 14px', background:isSav?'#BDC3C7':'#0F2942', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:isSav?'not-allowed':'pointer' }}>
                        {isSav?'...':'+ Add'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {tab === 'rooms' && isOvernight && (
            <div className="fade-in">
              <RoomAllocator
                rooms={ROOMS}
                roomMap={rooms}
                attendance={attendance}
                onSave={saveRooms}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function EditEventForm({ event, onClose }) {
  const [name, setName]       = useState(event.name || '')
  const [date, setDate]       = useState(event.event_date || '')
  const [endDate, setEndDate] = useState(event.end_date || '')
  const [saving, setSaving]   = useState(false)

  async function save() {
    if (!name || !date) return
    setSaving(true)
    await supabase.from('events').update({ name, event_date: date, end_date: endDate || null }).eq('id', event.id)
    setSaving(false)
    onClose({ name, event_date: date, end_date: endDate || null })
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,41,66,0.6)', zIndex:1000, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:'24px 20px 32px', width:'100%', maxWidth:540, boxShadow:'0 -8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#0F2942', margin:0 }}>Edit Event</h2>
          <button onClick={() => onClose(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#7F8C8D' }}>x</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Event Name" value={name} onChange={setName} placeholder="e.g. Dinner Party" />
          <Field label="Date / Check-in" value={date} onChange={setDate} type="date" />
          <Field label="Check-out (leave blank for single day)" value={endDate} onChange={setEndDate} type="date" />
        </div>
        <div style={{ marginTop:24, display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={() => onClose(null)} style={{ padding:'10px 20px', background:'#F4F7FB', color:'#7F8C8D', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding:'10px 24px', background:'#0F2942', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RoomAllocator({ rooms, roomMap, attendance, onSave }) {
  const [assignments, setAssignments] = useState({}) // guestId -> roomId
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const allGuests = attendance.map(a => a.guests).filter(Boolean)

  // Convert roomMap (roomId -> [guestIds]) to assignments (guestId -> roomId) on mount
  useEffect(() => {
    const a = {}
    if (roomMap) {
      Object.entries(roomMap).forEach(([roomId, guestIds]) => {
        if (Array.isArray(guestIds)) {
          guestIds.forEach(gid => { a[gid] = roomId })
        }
      })
    }
    setAssignments(a)
  }, [])

  function assignGuest(guestId, roomId) {
    setAssignments(prev => {
      const next = { ...prev }
      if (next[guestId] === roomId) {
        delete next[guestId]  // tap same room = unassign
      } else {
        next[guestId] = roomId
      }
      return next
    })
  }

  async function save() {
    // Convert assignments (guestId -> roomId) back to roomMap (roomId -> [guestIds])
    const roomMap = {}
    rooms.forEach(r => { roomMap[r.id] = [] })
    Object.entries(assignments).forEach(([guestId, roomId]) => {
      if (roomMap[roomId]) roomMap[roomId].push(guestId)
    })
    setSaving(true)
    await onSave(roomMap)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ paddingBottom:32 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <p style={{ fontSize:13, color:'#7F8C8D', margin:0 }}>Tap a room to assign. Tap again to unassign.</p>
        <button onClick={save} style={{ padding:'8px 20px', background:saved?'#27AE60':'#0F2942', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {allGuests.map(g => {
        const guestId      = g.id
        const assignedRoom = assignments[guestId] || null
        const name         = `${g.given_names} ${g.surname}`
        return (
          <div key={guestId} style={{ background:'#fff', borderRadius:12, padding:'14px 16px', marginBottom:10, boxShadow:'0 1px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight:700, fontSize:14, color:'#0F2942', marginBottom:10 }}>
              {name}
              {assignedRoom && (
                <span style={{ marginLeft:10, fontSize:11, color:'#27AE60', fontWeight:600 }}>
                  {rooms.find(r => r.id === assignedRoom)?.icon} {rooms.find(r => r.id === assignedRoom)?.name}
                </span>
              )}
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {rooms.map(r => {
                const isThis = assignedRoom === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => assignGuest(guestId, r.id)}
                    style={{
                      padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer',
                      border: isThis ? 'none' : '1.5px solid #E2E8F0',
                      background: isThis ? '#0F2942' : '#F4F7FB',
                      color: isThis ? '#E8A838' : '#7F8C8D',
                    }}
                  >
                    {r.icon} {r.name}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {allGuests.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 24px', color:'#7F8C8D', fontSize:13 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>👥</div>
          Add guests to this event first.
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type='text' }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#7F8C8D', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:14, outline:'none', boxSizing:'border-box', background:'#fff' }}
        onFocus={e => e.target.style.borderColor='#1B4F72'}
        onBlur={e  => e.target.style.borderColor='#E2E8F0'} />
    </div>
  )
}

function SectionLabel({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
      <span style={{ fontSize:11, fontWeight:700, color:'#7F8C8D', textTransform:'uppercase', letterSpacing:2 }}>{label}</span>
      <div style={{ flex:1, height:1, background:'#E2E8F0' }} />
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
