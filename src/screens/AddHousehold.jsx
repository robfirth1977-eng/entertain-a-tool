import { useState } from 'react'
import { supabase } from '../eat'

const LOCALITIES = ['Tamworth','Armidale','Brisbane','Penrith','Nambour','Warragul','Adelaide','Cowra','Sydney','Melbourne']

function genId(surname, givenName) {
  const s = surname.replace(/\s/g,'').toUpperCase().slice(0,3).padEnd(3,'X')
  const g = givenName.replace(/\s/g,'').toUpperCase().slice(0,4).padEnd(4,'X')
  return s + g
}

function calcAge(dob) {
  if (!dob) return null
  const [y, m] = dob.split('-').map(Number)
  const today  = new Date()
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < m) age--
  return age >= 0 ? age : null
}

const emptyMember = () => ({ givenNames: '', surname: '', dob: '', gender: '' })

export default function AddHousehold({ onDone }) {
  const [step, setStep]           = useState(1)
  const [hh, setHh]               = useState({ givenNames: '', surname: '', dob: '', gender: 'M', locality: 'Tamworth' })
  const [members, setMembers]     = useState([])
  const [newMember, setNewMember] = useState(emptyMember())
  const [saving, setSaving]       = useState(false)
  const [done, setDone]           = useState(false)

  const hhId    = hh.surname && hh.givenNames ? genId(hh.surname, hh.givenNames) : '——'
  const canNext = hh.givenNames && hh.surname && hh.dob

  function addMember() {
    if (!newMember.givenNames) return
    setMembers(m => [...m, { ...newMember }])
    setNewMember(emptyMember())
  }

  async function save() {
    setSaving(true)
    const allPeople = [{ ...hh, isHouseholder: true }, ...members.map(m => ({ ...m, isHouseholder: false }))]
    const memberNames = allPeople.map(p => `${p.givenNames} ${p.surname || hh.surname}`.trim()).join(', ')

    const { error: hhErr } = await supabase.from('households').insert({
      id:           hhId,
      householder:  `${hh.givenNames} ${hh.surname}`.trim(),
      members:      memberNames,
      locality:     hh.locality,
      size:         allPeople.length,
      times_hosted: 0,
      invite:       true,
    })

    if (!hhErr) {
      const guestRows = allPeople.map(p => ({
        household_id:   hhId,
        given_names:    p.givenNames,
        surname:        p.isHouseholder ? hh.surname : (p.surname || hh.surname),
        gender:         p.gender || null,
        dob:            p.dob ? `${p.dob}-01` : null,
        is_householder: p.isHouseholder,
        locality:       hh.locality,
      }))
      await supabase.from('guests').insert(guestRows)
    }

    setSaving(false)
    setDone(true)
  }

  if (done) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }} className="fade-in">
        <div style={{ fontSize: 60, marginBottom: 20 }}>🎉</div>
        <h2 style={{ color: '#0F2942', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Household Added!</h2>
        <p style={{ color: '#7F8C8D', fontSize: 14, marginBottom: 32 }}>
          {`${hh.givenNames} ${hh.surname}`} and family are now in your tracker.
        </p>
        <button onClick={() => { setStep(1); setHh({ givenNames:'', surname:'', dob:'', gender:'M', locality:'Tamworth' }); setMembers([]); setDone(false) }}
          style={btnStyle('#EBF2FA', '#0F2942', 'transparent')}>
          Add Another
        </button>
        <button onClick={onDone} style={{ ...btnStyle('#0F2942', '#fff', '#0F2942'), marginLeft: 12 }}>
          View Households
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }} className="fade-in">

      {/* Header */}
      <div style={{ background: 'linear-gradient(140deg, #0F2942 0%, #1B4F72 100%)', padding: '52px 24px 28px' }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 16px' }}>Add Household</h1>
        {/* Steps */}
        <div style={{ display: 'flex', gap: 8 }}>
          {['Householder', 'Family', 'Save'].map((label, i) => {
            const s = i + 1
            const active = step === s, done = step > s
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? '#27AE60' : active ? '#E8A838' : 'rgba(255,255,255,0.2)',
                  color: done || active ? '#0F2942' : 'rgba(255,255,255,0.5)',
                }}>
                  {done ? '✓' : s}
                </div>
                <span style={{ fontSize: 12, color: active ? '#E8A838' : done ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)', fontWeight: active ? 700 : 400 }}>
                  {label}
                </span>
                {s < 3 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>›</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '24px 16px 32px' }}>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="fade-in">
            <Card title="Householder Details">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Given Name(s) *" value={hh.givenNames}  onChange={v => setHh(h=>({...h,givenNames:v}))}  placeholder="e.g. David" />
                <Field label="Surname *"        value={hh.surname}     onChange={v => setHh(h=>({...h,surname:v}))}     placeholder="e.g. Brown" />
                <Field label="Birth Month *"    value={hh.dob}         onChange={v => setHh(h=>({...h,dob:v}))}         type="month" />
                <SelectField label="Gender"     value={hh.gender}      onChange={v => setHh(h=>({...h,gender:v}))}      options={['M','F']} />
                <div style={{ gridColumn: '1/-1' }}>
                  <ComboField label="Locality"  value={hh.locality}    onChange={v => setHh(h=>({...h,locality:v}))}    options={LOCALITIES} />
                </div>
              </div>
              {hh.surname && hh.givenNames && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: '#EBF2FA', borderRadius: 8, borderLeft: '3px solid #1B4F72', fontSize: 13, color: '#0F2942' }}>
                  <strong>ID:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{hhId}</span>
                  {hh.dob && <span style={{ marginLeft: 16, color: '#7F8C8D' }}>Age: {calcAge(hh.dob)}</span>}
                </div>
              )}
            </Card>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button disabled={!canNext} onClick={() => setStep(2)} style={btnStyle(canNext ? '#0F2942' : '#BDC3C7', '#fff', 'transparent')}>
                Next →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="fade-in">
            <Card title={`Family Members — ${hh.givenNames} ${hh.surname} household`}>
              {members.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  {members.map((m, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '9px 12px', background: '#F4F7FB', borderRadius: 8, marginBottom: 6 }}>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0F2942' }}>
                        {m.givenNames} {m.surname || hh.surname}
                        {m.dob && <span style={{ color: '#7F8C8D', fontWeight: 400, marginLeft: 8 }}>age {calcAge(m.dob)}</span>}
                      </span>
                      <button onClick={() => setMembers(ms => ms.filter((_,j)=>j!==i))}
                        style={{ background: 'none', border: 'none', color: '#E74C3C', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ background: '#F4F7FB', borderRadius: 10, padding: 16, border: '1px dashed #BDC3C7' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>+ Add member</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Given Name(s)" value={newMember.givenNames} onChange={v => setNewMember(m=>({...m,givenNames:v}))} placeholder="First name" />
                  <Field label={`Surname (blank = ${hh.surname})`} value={newMember.surname} onChange={v => setNewMember(m=>({...m,surname:v}))} placeholder={hh.surname} />
                  <Field label="Birth Month" value={newMember.dob} onChange={v => setNewMember(m=>({...m,dob:v}))} type="month" />
                  <SelectField label="Gender" value={newMember.gender} onChange={v => setNewMember(m=>({...m,gender:v}))} options={['','M','F']} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <button disabled={!newMember.givenNames} onClick={addMember}
                    style={btnStyle(newMember.givenNames ? '#1B4F72' : '#BDC3C7', '#fff', 'transparent', true)}>
                    Add Member
                  </button>
                </div>
              </div>
            </Card>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(1)} style={btnStyle('transparent', '#0F2942', '#0F2942')}>← Back</button>
              <button onClick={() => setStep(3)} style={btnStyle('#0F2942', '#fff', 'transparent')}>
                {members.length === 0 ? 'Skip →' : `Continue (${members.length + 1} people) →`}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="fade-in">
            <Card title="Ready to Save">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                {[
                  ['Household ID', hhId],
                  ['People', members.length + 1],
                  ['Locality', hh.locality],
                ].map(([label, val]) => (
                  <div key={label} style={{ padding: '12px 18px', background: '#0F2942', borderRadius: 10, color: '#fff', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{val}</div>
                    <div style={{ fontSize: 11, color: '#8bb8e8', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '12px 16px', background: '#F4F7FB', borderRadius: 8, fontSize: 13, color: '#7F8C8D', lineHeight: 1.6 }}>
                <strong style={{ color: '#0F2942' }}>Members:</strong><br />
                {[`${hh.givenNames} ${hh.surname}`, ...members.map(m => `${m.givenNames} ${m.surname || hh.surname}`)].join(', ')}
              </div>
            </Card>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(2)} style={btnStyle('transparent', '#0F2942', '#0F2942')}>← Back</button>
              <button onClick={save} disabled={saving} style={btnStyle(saving ? '#BDC3C7' : '#27AE60', '#fff', 'transparent')}>
                {saving ? 'Saving...' : '✓ Save Household'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #F4F7FB', fontSize: 13, fontWeight: 700, color: '#0F2942' }}>{title}</div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7F8C8D', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
        onFocus={e => e.target.style.borderColor = '#1B4F72'}
        onBlur={e  => e.target.style.borderColor = '#E2E8F0'}
      />
    </div>
  )
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7F8C8D', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
        {options.map(o => <option key={o} value={o}>{o || '—'}</option>)}
      </select>
    </div>
  )
}

function ComboField({ label, value, options, onChange }) {
  const id = label.replace(/\s/g,'') + '_list'
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7F8C8D', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      <input list={id} value={value} onChange={e => onChange(e.target.value)} placeholder="Type or choose..."
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
        onFocus={e => e.target.style.borderColor = '#1B4F72'}
        onBlur={e  => e.target.style.borderColor = '#E2E8F0'}
      />
      <datalist id={id}>{options.map(o => <option key={o} value={o} />)}</datalist>
    </div>
  )
}

function btnStyle(bg, color, border, small = false) {
  return {
    padding: small ? '8px 16px' : '11px 24px',
    background: bg, color, border: `1.5px solid ${border === 'transparent' ? 'transparent' : border}`,
    borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: bg === '#BDC3C7' ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
  }
}
