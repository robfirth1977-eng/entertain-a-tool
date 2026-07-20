import { useState, useEffect } from 'react'
import { supabase } from '../eat'

export default function Guests() {
  const [guests, setGuests]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [editing, setEditing]       = useState(null)
  const [showRemoved, setShowRemoved] = useState(false)

  useEffect(() => { fetchGuests() }, [])

  async function fetchGuests() {
    const { data } = await supabase
      .from('guests')
      .select('*')
      .order('surname', { ascending: true })
    setGuests(data || [])
    setLoading(false)
  }

  async function saveGuest(updated) {
    const { error } = await supabase
      .from('guests')
      .update({
        given_names: updated.given_names,
        surname:     updated.surname,
        gender:      updated.gender || null,
        dob:         updated.dob    || null,
        locality:    updated.locality || null,
        allergies:   updated.allergies || null,
        notes:       updated.notes    || null,
      })
      .eq('id', updated.id)

    if (!error) {
      setGuests(gs => gs.map(g => g.id === updated.id ? { ...g, ...updated } : g))
      setEditing(null)
    }
  }

  const filtered = guests.filter(g => {
    if (!showRemoved && g.active === false) return false
    return !search ||
      `${g.given_names} ${g.surname}`.toLowerCase().includes(search.toLowerCase()) ||
      g.locality?.toLowerCase().includes(search.toLowerCase())
  })
  const removedCount = guests.filter(g => g.active === false).length

  const calcAge = (dob) => {
    if (!dob) return null
    const b = new Date(dob), today = new Date()
    let age = today.getFullYear() - b.getFullYear()
    if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--
    return age
  }

  if (loading) return <Spinner />

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }} className="fade-in">

      {editing && (
        <GuestEditor guest={editing} onClose={() => setEditing(null)} onSave={saveGuest} />
      )}

      <div style={{ background: 'linear-gradient(140deg, #0F2942 0%, #1B4F72 100%)', padding: '52px 24px 28px' }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Guests</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>{guests.length} people — tap to edit</p>
      </div>

      <div style={{ padding: '16px 16px 32px' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or locality..."
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 10,
            border: '1.5px solid #E2E8F0', fontSize: 14, outline: 'none',
            background: '#fff', marginBottom: 12, boxSizing: 'border-box',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}
        />

        {removedCount > 0 && (
          <button onClick={() => setShowRemoved(s => !s)} style={{
            display: 'block', marginBottom: 12, fontSize: 12, fontWeight: 700, color: '#7F8C8D',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}>
            {showRemoved ? 'Hide' : 'Show'} {removedCount} removed {removedCount === 1 ? 'person' : 'people'}
          </button>
        )}

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#7F8C8D', fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            No guests found
          </div>
        ) : (
          filtered.map((g, i) => {
            const age  = calcAge(g.dob)
            const name = `${g.given_names} ${g.surname}`
            return (
              <div key={g.id} onClick={() => setEditing(g)} className="fade-in" style={{
                background: '#fff', borderRadius: 12, padding: '13px 16px',
                marginBottom: 8, display: 'flex', alignItems: 'center',
                boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                cursor: 'pointer', transition: 'transform 0.15s', opacity: g.active === false ? 0.6 : 1,
                animationDelay: `${i * 0.02}s`,
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: g.is_householder ? '#0F2942' : '#EBF2FA',
                  color: g.is_householder ? '#E8A838' : '#0F2942',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14, marginRight: 12,
                }}>
                  {g.given_names?.[0]}{g.surname?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0F2942' }}>{name}</div>
                  <div style={{ fontSize: 12, color: '#7F8C8D', marginTop: 2 }}>
                    {g.locality}{age ? ` · ${age}` : ''}
                    {g.gender ? ` · ${g.gender}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {g.active === false && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#E74C3C', background: '#FEF2F2', borderRadius: 20, padding: '3px 8px' }}>
                      REMOVED
                    </div>
                  )}
                  {g.is_householder && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#E8A838', background: '#FDF3DC', borderRadius: 20, padding: '3px 8px' }}>
                      HOST
                    </div>
                  )}
                  <div style={{ fontSize: 18, color: '#D0D8E4' }}>›</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const LOCALITIES = ['Tamworth','Armidale','Brisbane','Penrith','Nambour','Warragul','Adelaide','Cowra','Sydney','Melbourne']

function GuestEditor({ guest, onClose, onSave }) {
  const [form, setForm] = useState({
    id:          guest.id,
    given_names: guest.given_names || '',
    surname:     guest.surname     || '',
    gender:      guest.gender      || '',
    dob:         guest.dob ? guest.dob.slice(0, 7) : '',
    locality:    guest.locality    || '',
    allergies:   guest.allergies   || '',
    notes:       guest.notes       || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  async function handle() {
    setSaving(true)
    const toSave = {
      ...form,
      dob: form.dob ? `${form.dob}-01` : null,
    }
    await onSave(toSave)
    setSaving(false)
    setSaved(true)
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,41,66,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 540, boxShadow: '0 -8px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F2942', margin: 0 }}>Edit Guest</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#7F8C8D' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Given Name(s)" value={form.given_names} onChange={v => set('given_names', v)} placeholder="First name" />
            <Field label="Surname"       value={form.surname}     onChange={v => set('surname', v)}     placeholder="Last name" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Birth Month" value={form.dob} onChange={v => set('dob', v)} type="month" />
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7F8C8D', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Gender</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                <option value="">-</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7F8C8D', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Locality</label>
            <input list="locality_list" value={form.locality} onChange={e => set('locality', e.target.value)} placeholder="Type or choose..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
              onFocus={e => e.target.style.borderColor = '#1B4F72'}
              onBlur={e  => e.target.style.borderColor = '#E2E8F0'}
            />
            <datalist id="locality_list">{LOCALITIES.map(l => <option key={l} value={l} />)}</datalist>
          </div>
          <Field label="Allergies / Dietary" value={form.allergies} onChange={v => set('allergies', v)} placeholder="e.g. Nut allergy" />
          <Field label="Notes"               value={form.notes}     onChange={v => set('notes', v)}     placeholder="Any other notes" />
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: '#F4F7FB', color: '#7F8C8D', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handle} disabled={saving} style={{ padding: '10px 28px', background: saved ? '#27AE60' : '#0F2942', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.3s' }}>
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
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

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #E8A838', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <div style={{ color: '#7F8C8D', fontSize: 13, fontWeight: 500 }}>Loading...</div>
    </div>
  )
}
