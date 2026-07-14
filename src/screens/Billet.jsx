import { useState, useEffect } from 'react'
import { supabase } from '../eat'

const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
const nights = (a, b) => a && b ? Math.round((new Date(b) - new Date(a)) / 86400000) : 0

// Sweep-line max concurrent occupancy across a host's guests (+ an optional candidate).
function maxOccupancy(guests, candidate) {
  const all = candidate ? [...guests, candidate] : guests
  if (all.length === 0) return 0
  const points = new Set()
  all.forEach(g => { points.add(g.arrival_date); points.add(g.departure_date) })
  const sorted = [...points].sort()
  let max = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    const day = sorted[i]
    const sum = all
      .filter(g => g.arrival_date <= day && g.departure_date > day)
      .reduce((s, g) => s + g.party_size, 0)
    if (sum > max) max = sum
  }
  return max
}

export default function Billet() {
  const [rounds, setRounds]   = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => { fetchRounds() }, [])

  async function fetchRounds() {
    const { data } = await supabase.from('billet_rounds').select('*').order('start_date', { ascending: false })
    setRounds(data || [])
    setLoading(false)
  }

  async function createRound(name, start, end) {
    const { data, error } = await supabase.from('billet_rounds').insert({ name, start_date: start || null, end_date: end || null }).select().single()
    if (!error) { setRounds(r => [data, ...r]); setSelected(data); setShowNew(false) }
  }

  if (loading) return <Spinner />
  if (selected) return <RoundDetail round={selected} onBack={() => { setSelected(null); fetchRounds() }} />

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }} className="fade-in">
      {showNew && <NewRoundForm onClose={() => setShowNew(false)} onCreate={createRound} />}
      <div style={{ background: 'linear-gradient(140deg, #0F2942 0%, #1B4F72 100%)', padding: '52px 24px 28px' }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Billeting</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>Match arriving guests with hosts</p>
      </div>
      <div style={{ padding: '20px 16px 32px' }}>
        <button onClick={() => setShowNew(true)} style={{
          width: '100%', padding: '16px 20px', marginBottom: 20,
          background: 'linear-gradient(135deg, #E8A838 0%, #D4922A 100%)', border: 'none', borderRadius: 12,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 16px rgba(232,168,56,0.3)',
        }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#0F2942' }}>+ New Round</span>
          <span style={{ fontSize: 22, color: '#0F2942', opacity: 0.7 }}>→</span>
        </button>

        {rounds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏘</div>
            <div style={{ fontWeight: 700, color: '#0F2942', marginBottom: 8 }}>No rounds yet</div>
            <div style={{ fontSize: 13, color: '#7F8C8D' }}>Create one for e.g. "AgQuip Field Days 2027"</div>
          </div>
        ) : rounds.map((r, i) => (
          <div key={r.id} onClick={() => setSelected(r)} className="fade-in" style={{
            background: '#fff', borderRadius: 14, padding: '16px', marginBottom: 10, cursor: 'pointer',
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)', borderLeft: '4px solid #E8A838', animationDelay: `${i * 0.04}s`,
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0F2942', marginBottom: 4 }}>{r.name}</div>
            <div style={{ fontSize: 13, color: '#7F8C8D' }}>
              {r.start_date ? fmtDate(r.start_date) : 'No dates set'}{r.end_date ? ` → ${fmtDate(r.end_date)}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NewRoundForm({ onClose, onCreate }) {
  const [name, setName]   = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd]     = useState('')
  const [saving, setSaving] = useState(false)

  async function handle() {
    if (!name) return
    setSaving(true)
    await onCreate(name, start, end)
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,41,66,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 540, boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F2942', margin: 0 }}>New Round</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#7F8C8D' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Name" value={name} onChange={setName} placeholder="e.g. AgQuip Field Days 2027" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Start Date" value={start} onChange={setStart} type="date" />
            <Field label="End Date" value={end} onChange={setEnd} type="date" />
          </div>
        </div>
        <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: '#F4F7FB', color: '#7F8C8D', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handle} disabled={!name || saving} style={{ padding: '10px 28px', background: name ? '#0F2942' : '#BDC3C7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: name ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Creating...' : 'Create Round'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RoundDetail({ round, onBack }) {
  const [tab, setTab]         = useState('board')
  const [hosts, setHosts]     = useState([])
  const [guests, setGuests]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: h }, { data: g }] = await Promise.all([
      supabase.from('billet_hosts').select('*').eq('round_id', round.id).order('name'),
      supabase.from('billet_guests').select('*').eq('round_id', round.id).order('arrival_date'),
    ])
    setHosts(h || [])
    setGuests(g || [])
    setLoading(false)
  }

  if (loading) return <Spinner />

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }} className="fade-in">
      <div style={{ background: 'linear-gradient(140deg, #0F2942 0%, #1B4F72 100%)', padding: '52px 24px 0' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13, marginBottom: 12, padding: 0 }}>← Rounds</button>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>{round.name}</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 12px' }}>
          {hosts.length} hosts · {guests.length} guest parties · {guests.filter(g => !g.host_id).length} unassigned
        </p>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['board', 'Board'], ['hosts', 'Hosts'], ['guests', 'Guests'], ['summary', 'Summary']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: tab === id ? '#fff' : 'transparent', color: tab === id ? '#0F2942' : 'rgba(255,255,255,0.6)',
              borderRadius: '8px 8px 0 0',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 16px 32px' }}>
        {tab === 'board'   && <BoardTab hosts={hosts} guests={guests} onChange={fetchAll} />}
        {tab === 'hosts'   && <HostsTab round={round} hosts={hosts} guests={guests} onChange={fetchAll} />}
        {tab === 'guests'  && <GuestsTab round={round} hosts={hosts} guests={guests} onChange={fetchAll} />}
        {tab === 'summary' && <SummaryTab round={round} hosts={hosts} guests={guests} />}
      </div>
    </div>
  )
}

// ── Board ────────────────────────────────────────────────────────────────
function BoardTab({ hosts, guests, onChange }) {
  const [dragId, setDragId]   = useState(null)
  const [warning, setWarning] = useState(null)

  const unassigned = guests.filter(g => !g.host_id)

  async function assign(guest, host) {
    const others = guests.filter(g => g.host_id === host.id && g.id !== guest.id)
    const occ = maxOccupancy(others, guest)
    if (occ > host.capacity) {
      setWarning(`Heads up: ${host.name} would have ${occ} people on the busiest night, over their capacity of ${host.capacity}.`)
    } else {
      setWarning(null)
    }
    await supabase.from('billet_guests').update({ host_id: host.id }).eq('id', guest.id)
    onChange()
  }

  async function unassign(guest) {
    await supabase.from('billet_guests').update({ host_id: null }).eq('id', guest.id)
    setWarning(null)
    onChange()
  }

  function GuestCard({ g, draggable = true }) {
    return (
      <div
        draggable={draggable}
        onDragStart={() => setDragId(g.id)}
        onDragEnd={() => setDragId(null)}
        style={{
          background: '#fff', borderRadius: 10, padding: '10px 12px', marginBottom: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: draggable ? 'grab' : 'default',
          borderLeft: '3px solid #E8A838', opacity: dragId === g.id ? 0.4 : 1,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: '#0F2942' }}>{g.contact_name}</div>
        <div style={{ fontSize: 11, color: '#7F8C8D', marginTop: 2 }}>
          {g.party_size} {g.party_size === 1 ? 'person' : 'people'} · {fmtDate(g.arrival_date)} → {fmtDate(g.departure_date)}
        </div>
        {g.host_id && (
          <button onClick={() => unassign(g)} style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: '#E74C3C', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Unassign
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      {warning && (
        <div style={{ background: '#FEF2F2', color: '#E74C3C', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠ {warning}</span>
          <button onClick={() => setWarning(null)} style={{ background: 'none', border: 'none', color: '#E74C3C', cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>✕</button>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={() => { const g = guests.find(x => x.id === dragId); if (g) unassign(g) }}
          style={{ background: '#fff', borderRadius: 14, padding: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', minHeight: 200 }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
            Unassigned ({unassigned.length})
          </div>
          {unassigned.length === 0 ? (
            <div style={{ fontSize: 12, color: '#BDC3C7', textAlign: 'center', padding: '20px 0' }}>All guests assigned</div>
          ) : unassigned.map(g => <GuestCard key={g.id} g={g} />)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {hosts.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 24px', color: '#7F8C8D', fontSize: 13, background: '#fff', borderRadius: 14 }}>
              Add hosts first, in the Hosts tab.
            </div>
          ) : hosts.map(h => {
            const assigned = guests.filter(g => g.host_id === h.id)
            const occ = maxOccupancy(assigned)
            const over = occ > h.capacity
            return (
              <div
                key={h.id}
                onDragOver={e => e.preventDefault()}
                onDrop={() => { const g = guests.find(x => x.id === dragId); if (g) assign(g, h) }}
                style={{ background: '#fff', borderRadius: 14, padding: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', minHeight: 140 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0F2942' }}>{h.name}</div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px',
                    background: over ? '#FEF2F2' : '#F0FFF4', color: over ? '#E74C3C' : '#27AE60',
                  }}>
                    {occ}/{h.capacity}
                  </div>
                </div>
                {h.locality && <div style={{ fontSize: 11, color: '#7F8C8D', marginBottom: 8 }}>{h.locality}</div>}
                {assigned.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#D0D8E4', border: '1.5px dashed #E2E8F0', borderRadius: 8, padding: '14px', textAlign: 'center' }}>
                    Drop a guest here
                  </div>
                ) : assigned.map(g => <GuestCard key={g.id} g={g} draggable />)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Hosts ────────────────────────────────────────────────────────────────
function HostsTab({ round, hosts, guests, onChange }) {
  const [editing, setEditing] = useState(null)
  const [adding, setAdding]   = useState(false)

  async function save(form) {
    if (form.id) {
      await supabase.from('billet_hosts').update({
        name: form.name, contact: form.contact, capacity: Number(form.capacity) || 1,
        locality: form.locality, notes: form.notes,
      }).eq('id', form.id)
    } else {
      await supabase.from('billet_hosts').insert({
        round_id: round.id, name: form.name, contact: form.contact,
        capacity: Number(form.capacity) || 1, locality: form.locality, notes: form.notes,
      })
    }
    setEditing(null); setAdding(false); onChange()
  }

  async function remove(id) {
    await supabase.from('billet_hosts').delete().eq('id', id)
    onChange()
  }

  return (
    <div>
      {(editing || adding) && (
        <HostEditor host={editing} onClose={() => { setEditing(null); setAdding(false) }} onSave={save} />
      )}
      <button onClick={() => setAdding(true)} style={{
        width: '100%', padding: '14px', marginBottom: 16, background: '#0F2942', color: '#fff',
        border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
      }}>+ Add Host</button>

      {hosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: '#7F8C8D', fontSize: 13 }}>No hosts yet</div>
      ) : hosts.map(h => {
        const occ = maxOccupancy(guests.filter(g => g.host_id === h.id))
        return (
          <div key={h.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0F2942' }}>{h.name}</div>
                <div style={{ fontSize: 12, color: '#7F8C8D', marginTop: 3 }}>
                  {h.contact}{h.locality ? ` · ${h.locality}` : ''} · capacity {occ}/{h.capacity}
                </div>
                {h.notes && <div style={{ fontSize: 12, color: '#95A5A6', marginTop: 4 }}>{h.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => setEditing(h)} style={{ padding: '5px 10px', background: '#F4F7FB', color: '#0F2942', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => remove(h.id)} style={{ padding: '5px 10px', background: '#FEF2F2', color: '#E74C3C', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function HostEditor({ host, onClose, onSave }) {
  const [form, setForm] = useState({
    id: host?.id, name: host?.name || '', contact: host?.contact || '',
    capacity: host?.capacity ?? 1, locality: host?.locality || '', notes: host?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handle() {
    if (!form.name) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,41,66,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 540, boxShadow: '0 -8px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F2942', margin: 0 }}>{host ? 'Edit Host' : 'Add Host'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#7F8C8D' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Name" value={form.name} onChange={v => set('name', v)} placeholder="e.g. Brown Family" />
          <Field label="Contact (phone/email)" value={form.contact} onChange={v => set('contact', v)} placeholder="0412 345 678" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Capacity (people)" value={form.capacity} onChange={v => set('capacity', v)} type="number" />
            <Field label="Locality" value={form.locality} onChange={v => set('locality', v)} placeholder="e.g. Tamworth" />
          </div>
          <Field label="Notes" value={form.notes} onChange={v => set('notes', v)} placeholder="e.g. No pets, happy to take families" />
        </div>
        <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: '#F4F7FB', color: '#7F8C8D', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handle} disabled={!form.name || saving} style={{ padding: '10px 28px', background: form.name ? '#0F2942' : '#BDC3C7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: form.name ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Saving...' : 'Save Host'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Guests ───────────────────────────────────────────────────────────────
function GuestsTab({ round, hosts, guests, onChange }) {
  const [editing, setEditing] = useState(null)
  const [adding, setAdding]   = useState(false)

  const hostName = id => hosts.find(h => h.id === id)?.name

  async function save(form) {
    const payload = {
      contact_name: form.contact_name, phone: form.phone,
      party_size: Number(form.party_size) || 1,
      arrival_date: form.arrival_date, departure_date: form.departure_date,
      notes: form.notes,
    }
    if (form.id) {
      await supabase.from('billet_guests').update(payload).eq('id', form.id)
    } else {
      await supabase.from('billet_guests').insert({ ...payload, round_id: round.id })
    }
    setEditing(null); setAdding(false); onChange()
  }

  async function remove(id) {
    await supabase.from('billet_guests').delete().eq('id', id)
    onChange()
  }

  return (
    <div>
      {(editing || adding) && (
        <GuestForm guest={editing} onClose={() => { setEditing(null); setAdding(false) }} onSave={save} />
      )}
      <button onClick={() => setAdding(true)} style={{
        width: '100%', padding: '14px', marginBottom: 16, background: '#0F2942', color: '#fff',
        border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
      }}>+ Add Arriving Guest</button>

      {guests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: '#7F8C8D', fontSize: 13 }}>No guests yet</div>
      ) : guests.map(g => (
        <div key={g.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F2942' }}>{g.contact_name}</div>
              <div style={{ fontSize: 12, color: '#7F8C8D', marginTop: 3 }}>
                {g.party_size} {g.party_size === 1 ? 'person' : 'people'} · {fmtDate(g.arrival_date)} → {fmtDate(g.departure_date)} ({nights(g.arrival_date, g.departure_date)} nights)
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {g.host_id
                  ? <span style={{ color: '#27AE60', fontWeight: 700 }}>→ {hostName(g.host_id)}</span>
                  : <span style={{ color: '#E8A838', fontWeight: 700 }}>Unassigned</span>}
              </div>
              {g.notes && <div style={{ fontSize: 12, color: '#95A5A6', marginTop: 4 }}>{g.notes}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => setEditing(g)} style={{ padding: '5px 10px', background: '#F4F7FB', color: '#0F2942', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
              <button onClick={() => remove(g.id)} style={{ padding: '5px 10px', background: '#FEF2F2', color: '#E74C3C', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function GuestForm({ guest, onClose, onSave }) {
  const [form, setForm] = useState({
    id: guest?.id, contact_name: guest?.contact_name || '', phone: guest?.phone || '',
    party_size: guest?.party_size ?? 1, arrival_date: guest?.arrival_date || '',
    departure_date: guest?.departure_date || '', notes: guest?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.contact_name && form.arrival_date && form.departure_date

  async function handle() {
    if (!valid) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,41,66,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 540, boxShadow: '0 -8px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F2942', margin: 0 }}>{guest ? 'Edit Guest' : 'Add Arriving Guest'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#7F8C8D' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Contact Name" value={form.contact_name} onChange={v => set('contact_name', v)} placeholder="e.g. Sarah Jensen" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Phone" value={form.phone} onChange={v => set('phone', v)} placeholder="0412 345 678" />
            <Field label="Party Size" value={form.party_size} onChange={v => set('party_size', v)} type="number" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Arrival Date" value={form.arrival_date} onChange={v => set('arrival_date', v)} type="date" />
            <Field label="Departure Date" value={form.departure_date} onChange={v => set('departure_date', v)} type="date" />
          </div>
          <Field label="Notes" value={form.notes} onChange={v => set('notes', v)} placeholder="e.g. Allergic to nuts, has a dog" />
        </div>
        <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: '#F4F7FB', color: '#7F8C8D', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handle} disabled={!valid || saving} style={{ padding: '10px 28px', background: valid ? '#0F2942' : '#BDC3C7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: valid ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Saving...' : 'Save Guest'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Summary / print ─────────────────────────────────────────────────────
function SummaryTab({ round, hosts, guests }) {
  function print() {
    const rows = hosts.map(h => {
      const assigned = guests.filter(g => g.host_id === h.id)
      const items = assigned.map(g => `
        <tr>
          <td>${g.contact_name}</td>
          <td>${g.party_size}</td>
          <td>${fmtDate(g.arrival_date)} → ${fmtDate(g.departure_date)}</td>
          <td>${g.phone || ''}</td>
          <td>${g.notes || ''}</td>
        </tr>`).join('')
      return `
        <h2>${h.name} <span class="meta">${h.contact || ''}${h.locality ? ' · ' + h.locality : ''} · capacity ${h.capacity}</span></h2>
        ${assigned.length ? `<table><thead><tr><th>Guest</th><th>People</th><th>Dates</th><th>Phone</th><th>Notes</th></tr></thead><tbody>${items}</tbody></table>` : '<p class="none">No guests assigned</p>'}
      `
    }).join('')

    const unassigned = guests.filter(g => !g.host_id)
    const unassignedRows = unassigned.map(g => `
      <tr>
        <td>${g.contact_name}</td>
        <td>${g.party_size}</td>
        <td>${fmtDate(g.arrival_date)} → ${fmtDate(g.departure_date)}</td>
        <td>${g.phone || ''}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${round.name} — Billeting Summary</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #0F2942; }
        h1 { margin-bottom: 4px; }
        h2 { margin-top: 28px; margin-bottom: 6px; font-size: 16px; border-bottom: 2px solid #E8A838; padding-bottom: 4px; }
        .meta { font-size: 12px; font-weight: normal; color: #7F8C8D; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
        th { color: #7F8C8D; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
        .none { color: #BDC3C7; font-size: 13px; font-style: italic; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>${round.name}</h1>
      <p class="meta">Billeting summary — generated ${new Date().toLocaleDateString('en-AU')}</p>
      ${rows}
      <h2>Unassigned <span class="meta">${unassigned.length} parties</span></h2>
      ${unassigned.length ? `<table><thead><tr><th>Guest</th><th>People</th><th>Dates</th><th>Phone</th></tr></thead><tbody>${unassignedRows}</tbody></table>` : '<p class="none">None — everyone is placed</p>'}
      <script>setTimeout(() => window.print(), 400)</script>
      </body></html>`

    const w = window.open('', '_blank', 'width=900,height=700')
    w.document.write(html)
    w.document.close()
  }

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0F2942', marginBottom: 6 }}>Print / Export Summary</div>
        <p style={{ fontSize: 13, color: '#7F8C8D', marginBottom: 16, lineHeight: 1.5 }}>
          A per-host list of who's staying, with contact details — handy to print or save as PDF and pass along to guests.
        </p>
        <button onClick={print} style={{ padding: '12px 24px', background: '#E8A838', color: '#0F2942', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Open Printable Summary
        </button>
      </div>

      {hosts.map(h => {
        const assigned = guests.filter(g => g.host_id === h.id)
        if (assigned.length === 0) return null
        return (
          <div key={h.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0F2942' }}>{h.name}</div>
            <div style={{ fontSize: 12, color: '#7F8C8D', marginBottom: 8 }}>{h.contact}</div>
            {assigned.map(g => (
              <div key={g.id} style={{ fontSize: 12, color: '#0F2942', padding: '4px 0', borderTop: '1px solid #F4F7FB' }}>
                {g.contact_name} · {g.party_size}p · {fmtDate(g.arrival_date)} → {fmtDate(g.departure_date)}
              </div>
            ))}
          </div>
        )
      })}
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

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #E8A838', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <div style={{ color: '#7F8C8D', fontSize: 13, fontWeight: 500 }}>Loading...</div>
    </div>
  )
}
