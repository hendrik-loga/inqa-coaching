// src/App.jsx
import { useState, useEffect, useRef } from 'react'
import { auth, tenants, phases, modules, documents, notes, members } from './lib/supabase'
import { supabase } from './lib/supabase'

// ── Design Tokens ─────────────────────────────────────────────
const C = {
  navy: '#0d1b3e', blue: '#1a56db', purple: '#7e3af2',
  green: '#0e9f6e', orange: '#ff8c00', red: '#e02424',
  yellow: '#f59e0b',
  gray50: '#f9fafb', gray100: '#f3f4f6', gray200: '#e5e7eb',
  gray400: '#9ca3af', gray600: '#6b7280', gray900: '#111827',
}
const roleLabel = { owner: 'Inhaber', coach: 'Coach', member: 'Mitglied' }
const docTypeLabel = { protocol: 'Protokoll', report: 'Bericht', other: 'Dokument' }
const docTypeIcon = { protocol: '📋', report: '📊', other: '📄' }
const statusColor = { done: C.green, active: C.blue, pending: C.gray400 }
const statusLabel = { done: 'Abgeschlossen', active: 'Laufend', pending: 'Ausstehend' }
const ampelColor = { green: C.green, yellow: C.yellow, red: C.red }
const ampelEmoji = { green: '🟢', yellow: '🟡', red: '🔴' }

// ── UI Primitives ─────────────────────────────────────────────
const Btn = ({ children, onClick, variant = 'primary', small, disabled, style = {} }) => {
  const base = { padding: small ? '5px 12px' : '9px 18px', borderRadius: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: small ? 12 : 13, opacity: disabled ? 0.5 : 1, transition: 'all .15s', ...style }
  const variants = { primary: { background: C.blue, color: '#fff' }, danger: { background: '#fff5f5', color: C.red, border: `1px solid #fca5a5` }, ghost: { background: 'transparent', color: C.gray600, border: `1px solid ${C.gray200}` }, success: { background: C.green, color: '#fff' } }
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>
}
const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>}
    <input style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} {...props} />
  </div>
)
const Sel = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>}
    <select style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, background: '#fff' }} {...props}>{children}</select>
  </div>
)
const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{ background: '#fff', borderRadius: 14, padding: '18px 22px', border: `1px solid ${C.gray200}`, boxShadow: '0 2px 8px rgba(0,0,0,.04)', cursor: onClick ? 'pointer' : 'default', ...style }}>{children}</div>
)
const Modal = ({ title, onClose, children, wide }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: wide ? 800 : 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.navy }}>{title}</h2>
        <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: C.gray400 }}>×</button>
      </div>
      {children}
    </div>
  </div>
)
const Badge = ({ children, color = C.blue }) => (
  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: color + '18', color, whiteSpace: 'nowrap' }}>{children}</span>
)
const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
    <div style={{ width: 28, height: 28, border: `3px solid ${C.gray200}`, borderTopColor: C.blue, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
)
const SectionTitle = ({ children }) => <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: C.navy }}>{children}</h3>

// ── AUTH ──────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('')
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('')
  const handle = async () => {
    setError(''); setLoading(true)
    try {
      if (mode === 'register') { const { error } = await auth.signUp(email, password, name); if (error) throw error; setSuccess('Bestätigungsmail gesendet!') }
      else { const { error } = await auth.signIn(email, password); if (error) throw error; onAuth() }
    } catch (e) { setError(e.message) }
    setLoading(false)
  }
  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 32px 80px rgba(0,0,0,.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, background: C.blue, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 18, fontWeight: 900, color: '#fff' }}>IQ</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.navy }}>INQA Coaching</h1>
          <p style={{ margin: '4px 0 0', color: C.gray600, fontSize: 12 }}>Coaching-Plattform</p>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: C.gray100, borderRadius: 10, padding: 4 }}>
          {[['login', 'Anmelden'], ['register', 'Registrieren']].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: mode === m ? '#fff' : 'transparent', color: mode === m ? C.navy : C.gray600 }}>{l}</button>
          ))}
        </div>
        {mode === 'register' && <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Max Mustermann" />}
        <Input label="E-Mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mail@beispiel.de" />
        <Input label="Passwort" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
        {error && <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', color: C.red, fontSize: 12, marginBottom: 12 }}>{error}</div>}
        {success && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 12px', color: C.green, fontSize: 12, marginBottom: 12 }}>{success}</div>}
        <Btn onClick={handle} disabled={loading} style={{ width: '100%', textAlign: 'center' }}>{loading ? 'Bitte warten…' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}</Btn>
      </div>
    </div>
  )
}

// ── TENANT LIST ───────────────────────────────────────────────
function TenantList({ user, onSelect, onNew, onSignOut }) {
  const [list, setList] = useState([]); const [loading, setLoading] = useState(true)
  useEffect(() => { tenants.getMyTenants().then(d => { setList(d); setLoading(false) }) }, [])

  const setAmpel = async (e, id, ampel) => {
    e.stopPropagation()
    await tenants.update(id, { ampel })
    setList(prev => prev.map(t => t.id === id ? { ...t, ampel } : t))
  }

  return (
    <div style={{ minHeight: '100vh', background: C.gray50 }}>
      <div style={{ background: C.navy, padding: '0 28px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: C.blue, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: '#fff' }}>IQ</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>INQA Coaching Plattform</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ color: '#93c5fd', fontSize: 12 }}>{user?.email}</span>
          <Btn variant="ghost" small onClick={onSignOut} style={{ color: '#93c5fd', borderColor: '#1e3a6e' }}>Abmelden</Btn>
        </div>
      </div>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.navy }}>Meine Kunden</h1>
            <p style={{ margin: '3px 0 0', color: C.gray600, fontSize: 12 }}>{list.length} Kunden insgesamt</p>
          </div>
          <Btn onClick={onNew}>+ Neuer Kunde</Btn>
        </div>

        {/* Statistik-Leiste */}
        {list.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Aktive Kunden', value: list.filter(t => t.status === 'active').length, color: C.blue },
              { label: 'Abgeschlossen', value: list.filter(t => t.status === 'completed').length, color: C.green },
              { label: 'Im Zeitplan 🟢', value: list.filter(t => t.ampel === 'green').length, color: C.green },
              { label: 'Kritisch 🔴', value: list.filter(t => t.ampel === 'red').length, color: C.red },
            ].map((s, i) => (
              <Card key={i} style={{ padding: '14px 18px' }}>
                <div style={{ fontSize: 11, color: C.gray600, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              </Card>
            ))}
          </div>
        )}

        {loading ? <Spinner /> : list.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
            <h3 style={{ color: C.navy, marginBottom: 8 }}>Noch kein Kunde angelegt</h3>
            <Btn onClick={onNew}>+ Ersten Kunden anlegen</Btn>
          </Card>
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.gray50, borderBottom: `1px solid ${C.gray200}` }}>
                  {['Ampel', 'Unternehmen', 'Modell', 'Phase', 'Fortschritt', 'Start', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: C.gray600, textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((t, i) => (
                  <tr key={t.id} onClick={() => onSelect(t)} style={{ borderBottom: i < list.length - 1 ? `1px solid ${C.gray100}` : 'none', cursor: 'pointer', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.gray50}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {['green', 'yellow', 'red'].map(a => (
                          <button key={a} onClick={e => setAmpel(e, t.id, a)} style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', opacity: t.ampel === a ? 1 : 0.25, transition: 'opacity .15s' }}>{ampelEmoji[a]}</button>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{t.company_name || t.name}</div>
                      <div style={{ fontSize: 11, color: C.gray400 }}>{t.vorgang_id || '–'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: C.gray600 }}>{t.model}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: C.gray600 }}>–</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ background: C.gray200, borderRadius: 99, height: 5, width: 80 }}>
                        <div style={{ background: C.blue, width: '0%', height: '100%', borderRadius: 99 }} />
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: C.gray600 }}>{t.start_date || '–'}</td>
                    <td style={{ padding: '12px 14px' }}><Badge color={t.status === 'active' ? C.green : C.gray400}>{t.status === 'active' ? 'Aktiv' : 'Abgeschlossen'}</Badge></td>
                    <td style={{ padding: '12px 14px', color: C.gray400, fontSize: 16 }}>›</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  )
}

// ── NEW TENANT ────────────────────────────────────────────────
function NewTenantForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ name: '', companyName: '', vorgangId: '', model: 'Klassisches Modell', startDate: '' })
  const [loading, setLoading] = useState(false); const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handle = async () => {
    if (!form.companyName.trim()) return setError('Unternehmensname erforderlich.')
    setLoading(true); setError('')
    try {
      const t = await tenants.create(form.name, form.companyName, form.vorgangId, form.model, form.startDate || null)
      onCreated(t)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }
  return (
    <div style={{ minHeight: '100vh', background: C.gray50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card style={{ width: '100%', maxWidth: 460 }}>
        <h2 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 800, color: C.navy }}>Neuen Kunden anlegen</h2>
        <Input label="Unternehmensname *" value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Musterfirma GmbH" />
        <Input label="Kurzbezeichnung" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Musterfirma" />
        <Input label="Vorgangs-ID (Z-EU-S)" value={form.vorgangId} onChange={e => set('vorgangId', e.target.value)} placeholder="VA1234567" />
        <Sel label="Modell" value={form.model} onChange={e => set('model', e.target.value)}>
          <option>Klassisches Modell</option><option>Kleines Modell</option>
        </Sel>
        <Input label="Startdatum" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        {error && <div style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onCancel}>Abbrechen</Btn>
          <Btn onClick={handle} disabled={loading}>{loading ? 'Anlegen…' : 'Kunden anlegen'}</Btn>
        </div>
      </Card>
    </div>
  )
}

// ── OVERVIEW ──────────────────────────────────────────────────
function OverviewView({ tenant, onAmpelChange }) {
  const [phaseList, setPhaseList] = useState([]); const [loading, setLoading] = useState(true)
  useEffect(() => { phases.getForTenant(tenant.id).then(d => { setPhaseList(d); setLoading(false) }) }, [tenant.id])
  if (loading) return <Spinner />
  const allSteps = phaseList.flatMap(p => p.steps)
  const progress = allSteps.length ? Math.round(allSteps.filter(s => s.done).length / allSteps.length * 100) : 0
  const activePhase = phaseList.find(p => p.status === 'active')
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Fortschritt', value: `${progress}%`, color: C.blue },
          { label: 'Aktuelle Phase', value: activePhase?.label ?? '–', color: C.purple },
          { label: 'Modell', value: tenant.model, color: C.green },
          { label: 'Vorgangs-ID', value: tenant.vorgang_id || '–', color: C.orange },
        ].map((s, i) => <Card key={i} style={{ padding: '14px 18px' }}><div style={{ fontSize: 11, color: C.gray600, marginBottom: 2 }}>{s.label}</div><div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div></Card>)}
      </div>
      {/* Ampel */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle>Projektstatus (Ampel)</SectionTitle>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['green', 'Im Zeitplan'], ['yellow', 'Leichte Verzögerung'], ['red', 'Kritisch']].map(([a, l]) => (
            <button key={a} onClick={() => onAmpelChange(a)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `2px solid ${tenant.ampel === a ? ampelColor[a] : C.gray200}`, background: tenant.ampel === a ? ampelColor[a] + '15' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: tenant.ampel === a ? ampelColor[a] : C.gray600 }}>
              {ampelEmoji[a]} {l}
            </button>
          ))}
        </div>
      </Card>
      {/* Phasen Timeline */}
      <Card>
        <SectionTitle>Phasenübersicht</SectionTitle>
        <div style={{ background: C.gray200, borderRadius: 99, height: 8, marginBottom: 16 }}>
          <div style={{ background: C.blue, width: `${progress}%`, height: '100%', borderRadius: 99, transition: 'width .4s' }} />
        </div>
        <div style={{ display: 'flex', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 17, left: '5%', right: '5%', height: 2, background: C.gray200 }} />
          {phaseList.map((p, i) => (
            <div key={p.id} style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', margin: '0 auto', background: p.status === 'done' ? p.color : p.status === 'active' ? '#fff' : C.gray100, border: `3px solid ${p.status === 'pending' ? C.gray200 : p.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: p.status === 'active' ? `0 0 0 4px ${p.color}30` : 'none' }}>
                {p.status === 'done' ? <svg width="11" height="9" viewBox="0 0 11 9"><path d="M1 4.5l3.5 3.5 5.5-7" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" /></svg> : <span style={{ fontSize: 11, fontWeight: 800, color: p.status === 'active' ? p.color : C.gray400 }}>{i + 1}</span>}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginTop: 5 }}>{p.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── PHASES ────────────────────────────────────────────────────
function PhasesView({ tenant }) {
  const [phaseList, setPhaseList] = useState([]); const [loading, setLoading] = useState(true); const [selected, setSelected] = useState(null)
  useEffect(() => { phases.getForTenant(tenant.id).then(d => { setPhaseList(d); setLoading(false) }) }, [tenant.id])
  const toggleStep = async (phaseId, stepId, current) => {
    await phases.toggleStep(stepId, !current)
    setPhaseList(prev => prev.map(p => p.id !== phaseId ? p : { ...p, steps: p.steps.map(s => s.id !== stepId ? s : { ...s, done: !current }) }))
  }
  const setPhaseStatus = async (phaseId, status) => {
    const { error } = await supabase.from('phases').update({ status }).eq('id', phaseId)
    if (!error) setPhaseList(prev => prev.map(p => p.id !== phaseId ? p : { ...p, status }))
  }
  if (loading) return <Spinner />
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 14 }}>
      {phaseList.map(phase => {
        const done = phase.steps.filter(s => s.done).length
        const pct = phase.steps.length ? Math.round(done / phase.steps.length * 100) : 0
        const isSel = selected === phase.id
        return (
          <div key={phase.id} style={{ background: isSel ? '#f0f5ff' : '#fff', border: `2px solid ${isSel ? phase.color : C.gray200}`, borderRadius: 14, padding: '16px 18px', cursor: 'pointer' }} onClick={() => setSelected(isSel ? null : phase.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: phase.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{phase.months}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{phase.label}</div>
                <div style={{ fontSize: 11, color: C.gray600 }}>{phase.subtitle}</div>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <select value={phase.status} onChange={e => setPhaseStatus(phase.id, e.target.value)}
                  style={{ fontSize: 11, padding: '3px 8px', border: `1px solid ${statusColor[phase.status]}`, borderRadius: 20, background: statusColor[phase.status] + '15', color: statusColor[phase.status], fontWeight: 600, cursor: 'pointer' }}>
                  <option value="pending">Ausstehend</option>
                  <option value="active">Laufend</option>
                  <option value="done">Abgeschlossen</option>
                </select>
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.gray600, marginBottom: 3 }}>{done}/{phase.steps.length} · {pct}%</div>
            <div style={{ background: C.gray200, borderRadius: 99, height: 5 }}><div style={{ background: phase.color, width: `${pct}%`, height: '100%', borderRadius: 99 }} /></div>
            {isSel && (
              <div style={{ marginTop: 14, borderTop: `1px solid ${C.gray200}`, paddingTop: 12 }}>
                {phase.steps.map(s => (
                  <div key={s.id} onClick={e => { e.stopPropagation(); toggleStep(phase.id, s.id, s.done) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${s.done ? phase.color : C.gray200}`, background: s.done ? phase.color : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {s.done && <svg width="9" height="7" viewBox="0 0 9 7"><path d="M1 3.5l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>}
                    </div>
                    <span style={{ fontSize: 12, color: s.done ? '#374151' : C.gray600 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── TERMINE ───────────────────────────────────────────────────
function TermineView({ tenant, currentUser }) {
  const [termine, setTermine] = useState([]); const [loading, setLoading] = useState(true); const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', slots: ['', '', ''] })

  useEffect(() => {
    supabase.from('termine').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false })
      .then(({ data }) => { setTermine(data || []); setLoading(false) })
  }, [tenant.id])

  const addSlot = () => setForm(f => ({ ...f, slots: [...f.slots, ''] }))
  const setSlot = (i, v) => setForm(f => { const s = [...f.slots]; s[i] = v; return { ...f, slots: s } })

  const createTermin = async () => {
    const slots = form.slots.filter(s => s.trim()).map(s => ({ datetime: s, votes: [] }))
    if (!form.title || slots.length === 0) return
    const { data } = await supabase.from('termine').insert({ tenant_id: tenant.id, title: form.title, slots, created_by: currentUser.id, status: 'open' }).select().single()
    setTermine(prev => [data, ...prev]); setShowModal(false); setForm({ title: '', slots: ['', '', ''] })
  }

  const vote = async (terminId, slotIdx, available) => {
    const termin = termine.find(t => t.id === terminId)
    const slots = termin.slots.map((s, i) => {
      if (i !== slotIdx) return s
      const votes = (s.votes || []).filter(v => v.userId !== currentUser.id)
      return { ...s, votes: [...votes, { userId: currentUser.id, email: currentUser.email, available }] }
    })
    await supabase.from('termine').update({ slots }).eq('id', terminId)
    setTermine(prev => prev.map(t => t.id !== terminId ? t : { ...t, slots }))
  }

  const finalize = async (terminId, slotIdx) => {
    const termin = termine.find(t => t.id === terminId)
    const finalSlot = termin.slots[slotIdx].datetime
    await supabase.from('termine').update({ status: 'finalized', final_slot: finalSlot }).eq('id', terminId)
    setTermine(prev => prev.map(t => t.id !== terminId ? t : { ...t, status: 'finalized', final_slot: finalSlot }))
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn onClick={() => setShowModal(true)}>+ Termine vorschlagen</Btn>
      </div>
      {termine.length === 0 && <Card style={{ textAlign: 'center', padding: 40, color: C.gray400 }}>Noch keine Terminabstimmungen.</Card>}
      {termine.map(t => (
        <Card key={t.id} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>{t.title}</div>
              {t.status === 'finalized' && <div style={{ fontSize: 12, color: C.green, marginTop: 2 }}>✓ Termin: <strong>{t.final_slot}</strong></div>}
            </div>
            <Badge color={t.status === 'finalized' ? C.green : C.blue}>{t.status === 'finalized' ? 'Festgelegt' : 'Offen'}</Badge>
          </div>
          {t.status === 'open' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(t.slots || []).map((slot, i) => {
                const myVote = (slot.votes || []).find(v => v.userId === currentUser.id)
                const yesCount = (slot.votes || []).filter(v => v.available).length
                const noCount = (slot.votes || []).filter(v => !v.available).length
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: C.gray50, borderRadius: 10, border: `1px solid ${C.gray200}` }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.navy }}>{slot.datetime}</span>
                    <span style={{ fontSize: 12, color: C.green }}>✓ {yesCount}</span>
                    <span style={{ fontSize: 12, color: C.red }}>✗ {noCount}</span>
                    <button onClick={() => vote(t.id, i, true)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${myVote?.available === true ? C.green : C.gray200}`, background: myVote?.available === true ? C.green + '20' : '#fff', cursor: 'pointer', fontSize: 12, color: C.green, fontWeight: 600 }}>✓ Ja</button>
                    <button onClick={() => vote(t.id, i, false)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${myVote?.available === false ? C.red : C.gray200}`, background: myVote?.available === false ? C.red + '20' : '#fff', cursor: 'pointer', fontSize: 12, color: C.red, fontWeight: 600 }}>✗ Nein</button>
                    <button onClick={() => finalize(t.id, i)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.purple}`, background: C.purple + '15', cursor: 'pointer', fontSize: 11, color: C.purple, fontWeight: 600 }}>Festlegen</button>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      ))}
      {showModal && (
        <Modal title="Termine vorschlagen" onClose={() => setShowModal(false)}>
          <Input label="Titel / Anlass" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Planungssitzung Arbeitsphase 2" />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Terminvorschläge</label>
            {form.slots.map((s, i) => (
              <input key={i} value={s} onChange={e => setSlot(i, e.target.value)} placeholder={`Termin ${i + 1}, z.B. Mo 14.04. 10:00 Uhr`}
                style={{ width: '100%', padding: '7px 10px', border: `1px solid ${C.gray200}`, borderRadius: 7, fontSize: 12, marginBottom: 6, boxSizing: 'border-box' }} />
            ))}
            <button onClick={addSlot} style={{ fontSize: 12, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Weiteren Termin hinzufügen</button>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Abbrechen</Btn>
            <Btn onClick={createTermin}>Abstimmung starten</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── HAUSAUFGABEN ──────────────────────────────────────────────
function HausaufgabenView({ tenant, currentUser }) {
  const [tasks, setTasks] = useState([]); const [memberList, setMemberList] = useState([]); const [loading, setLoading] = useState(true); const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', assignee_id: '', due_date: '' })

  useEffect(() => {
    Promise.all([
      supabase.from('hausaufgaben').select('*').eq('tenant_id', tenant.id).order('due_date'),
      supabase.from('tenant_members').select('*, profile:profiles(full_name, email)').eq('tenant_id', tenant.id)
    ]).then(([{ data: t }, { data: m }]) => { setTasks(t || []); setMemberList(m || []); setLoading(false) })
  }, [tenant.id])

  const create = async () => {
    if (!form.title.trim()) return
    const assignee = memberList.find(m => m.user_id === form.assignee_id)
    const { data } = await supabase.from('hausaufgaben').insert({
      tenant_id: tenant.id, title: form.title, description: form.description,
      assignee_id: form.assignee_id || null, assignee_name: assignee?.profile?.full_name || assignee?.profile?.email || 'Alle',
      due_date: form.due_date || null, status: 'open', created_by: currentUser.id
    }).select().single()
    setTasks(prev => [...prev, data]); setShowModal(false); setForm({ title: '', description: '', assignee_id: '', due_date: '' })
  }

  const toggleStatus = async (id, current) => {
    const status = current === 'open' ? 'done' : 'open'
    await supabase.from('hausaufgaben').update({ status }).eq('id', id)
    setTasks(prev => prev.map(t => t.id !== id ? t : { ...t, status }))
  }

  const remove = async (id) => {
    await supabase.from('hausaufgaben').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  if (loading) return <Spinner />
  const open = tasks.filter(t => t.status === 'open')
  const done = tasks.filter(t => t.status === 'done')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn onClick={() => setShowModal(true)}>+ Hausaufgabe erstellen</Btn>
      </div>
      <Card style={{ marginBottom: 14 }}>
        <SectionTitle>Offen ({open.length})</SectionTitle>
        {open.length === 0 && <p style={{ color: C.gray400, fontSize: 13, textAlign: 'center', padding: 16 }}>Alle Hausaufgaben erledigt 🎉</p>}
        {open.map(task => (
          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.gray100}` }}>
            <button onClick={() => toggleStatus(task.id, task.status)} style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${C.gray200}`, background: '#fff', cursor: 'pointer', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{task.title}</div>
              {task.description && <div style={{ fontSize: 11, color: C.gray600, marginTop: 1 }}>{task.description}</div>}
            </div>
            <Badge color={C.purple}>{task.assignee_name || 'Alle'}</Badge>
            {task.due_date && <span style={{ fontSize: 11, color: new Date(task.due_date) < new Date() ? C.red : C.gray400 }}>📅 {new Date(task.due_date).toLocaleDateString('de-DE')}</span>}
            <button onClick={() => remove(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray400, fontSize: 16 }}>×</button>
          </div>
        ))}
      </Card>
      {done.length > 0 && (
        <Card>
          <SectionTitle>Erledigt ({done.length})</SectionTitle>
          {done.map(task => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.gray100}`, opacity: 0.6 }}>
              <button onClick={() => toggleStatus(task.id, task.status)} style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${C.green}`, background: C.green, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
              </button>
              <span style={{ flex: 1, fontSize: 13, color: C.gray600, textDecoration: 'line-through' }}>{task.title}</span>
              <Badge color={C.purple}>{task.assignee_name || 'Alle'}</Badge>
            </div>
          ))}
        </Card>
      )}
      {showModal && (
        <Modal title="Hausaufgabe erstellen" onClose={() => setShowModal(false)}>
          <Input label="Titel *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Was soll gemacht werden?" />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Beschreibung</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ width: '100%', padding: '7px 10px', border: `1px solid ${C.gray200}`, borderRadius: 7, fontSize: 12, resize: 'none', boxSizing: 'border-box' }} />
          </div>
          <Sel label="Zugewiesen an" value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
            <option value="">Alle Mitglieder</option>
            {memberList.map(m => <option key={m.user_id} value={m.user_id}>{m.profile?.full_name || m.profile?.email}</option>)}
          </Sel>
          <Input label="Fälligkeitsdatum" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Abbrechen</Btn>
            <Btn onClick={create}>Erstellen</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── SPRINTBOARD ───────────────────────────────────────────────
function SprintboardView({ tenant }) {
  const [tasks, setTasks] = useState([]); const [loading, setLoading] = useState(true); const [newText, setNewText] = useState('')
  const cols = ['todo', 'in-progress', 'done']
  const colLabel = { todo: 'To Do', 'in-progress': 'In Arbeit', done: 'Erledigt' }
  const colColor = { todo: C.gray600, 'in-progress': C.orange, done: C.green }

  useEffect(() => {
    supabase.from('sprint_tasks').select('*').eq('tenant_id', tenant.id).order('created_at')
      .then(({ data }) => { setTasks(data || []); setLoading(false) })
  }, [tenant.id])

  const add = async () => {
    if (!newText.trim()) return
    const { data } = await supabase.from('sprint_tasks').insert({ tenant_id: tenant.id, title: newText, status: 'todo' }).select().single()
    setTasks(prev => [...prev, data]); setNewText('')
  }

  const move = async (id, status) => {
    await supabase.from('sprint_tasks').update({ status }).eq('id', id)
    setTasks(prev => prev.map(t => t.id !== id ? t : { ...t, status }))
  }

  const remove = async (id) => {
    await supabase.from('sprint_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Neue Aufgabe hinzufügen…"
          style={{ flex: 1, padding: '9px 14px', border: `1px solid ${C.gray200}`, borderRadius: 9, fontSize: 13 }} />
        <Btn onClick={add}>+ Hinzufügen</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {cols.map(col => (
          <div key={col} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: `1px solid ${C.gray200}`, minHeight: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, background: colColor[col] }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: colColor[col], textTransform: 'uppercase', letterSpacing: 0.5 }}>{colLabel[col]}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: C.gray400 }}>{tasks.filter(t => t.status === col).length}</span>
            </div>
            {tasks.filter(t => t.status === col).map(task => (
              <div key={task.id} style={{ background: C.gray50, borderRadius: 8, padding: '8px 10px', marginBottom: 8, borderLeft: `3px solid ${colColor[col]}` }}>
                <div style={{ fontSize: 12, color: C.navy, marginBottom: 6 }}>{task.title}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {cols.filter(c => c !== col).map(c => (
                    <button key={c} onClick={() => move(task.id, c)} style={{ fontSize: 10, padding: '2px 6px', border: `1px solid ${C.gray200}`, borderRadius: 4, background: '#fff', cursor: 'pointer', color: C.gray600 }}>→ {colLabel[c]}</button>
                  ))}
                  <button onClick={() => remove(task.id)} style={{ fontSize: 10, padding: '2px 6px', border: `1px solid #fca5a5`, borderRadius: 4, background: '#fff5f5', cursor: 'pointer', color: C.red, marginLeft: 'auto' }}>×</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MODULE ────────────────────────────────────────────────────
function ModuleView({ tenant }) {
  const [moduleList, setModuleList] = useState([]); const [loading, setLoading] = useState(true); const [showAdd, setShowAdd] = useState(false)

  useEffect(() => { modules.getForTenant(tenant.id).then(d => { setModuleList(d); setLoading(false) }) }, [tenant.id])

  const addModule = async (type, title, icon) => {
    const m = await modules.create(tenant.id, type, title, icon)
    setModuleList(prev => [...prev, m]); setShowAdd(false)
  }
  const updateData = async (id, data) => {
    await modules.updateData(id, data)
    setModuleList(prev => prev.map(m => m.id !== id ? m : { ...m, data }))
  }
  const removeModule = async (id) => {
    await modules.remove(id); setModuleList(prev => prev.filter(m => m.id !== id))
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn onClick={() => setShowAdd(true)}>+ Modul hinzufügen</Btn>
      </div>
      {moduleList.length === 0 && <Card style={{ textAlign: 'center', padding: 40, color: C.gray400 }}>Noch keine Module aktiviert.</Card>}
      {moduleList.map(mod => (
        <Card key={mod.id} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{mod.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: C.navy }}>{mod.title}</span>
            </div>
            <Btn variant="danger" small onClick={() => removeModule(mod.id)}>Entfernen</Btn>
          </div>
          {mod.module_type === 'issue-map' && <IssueMapModule data={mod.data} onChange={d => updateData(mod.id, d)} />}
          {mod.module_type === 'eisenhower' && <EisenhowerModule data={mod.data} onChange={d => updateData(mod.id, d)} />}
          {mod.module_type === 'prozess' && <ProzessModule data={mod.data} onChange={d => updateData(mod.id, d)} />}
          {mod.module_type === 'todo' && <TodoModule data={mod.data} onChange={d => updateData(mod.id, d)} />}
        </Card>
      ))}
      {showAdd && (
        <Modal title="Modul hinzufügen" onClose={() => setShowAdd(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { type: 'issue-map', title: 'Issue Map', icon: '🗺️', desc: 'Problemlandkarte mit Kategorien und Prioritäten' },
              { type: 'eisenhower', title: 'Eisenhower-Matrix', icon: '🎯', desc: 'Aufgaben nach Wichtigkeit und Dringlichkeit' },
              { type: 'prozess', title: 'Prozesslandkarte', icon: '🔄', desc: 'Prozesse visualisieren mit Pfeilen und Kästen' },
              { type: 'todo', title: 'ToDo-Liste', icon: '📋', desc: 'Einfache gemeinsame Aufgabenliste' },
            ].map(opt => (
              <button key={opt.type} onClick={() => addModule(opt.type, opt.title, opt.icon)}
                style={{ padding: '12px 16px', border: `2px solid ${C.gray200}`, borderRadius: 10, background: C.gray50, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{opt.icon} {opt.title}</div>
                <div style={{ fontSize: 12, color: C.gray600, marginTop: 2 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

// Module Implementations
function IssueMapModule({ data, onChange }) {
  const issues = data.issues || []
  const [text, setText] = useState(''); const [cat, setCat] = useState('Prozesse'); const [pri, setPri] = useState('mittel')
  const priColor = { hoch: C.red, mittel: C.orange, niedrig: C.green }
  const add = () => { if (!text.trim()) return; onChange({ ...data, issues: [...issues, { id: `i${Date.now()}`, text, category: cat, priority: pri }] }); setText('') }
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Problem beschreiben…" style={{ flex: 1, minWidth: 120, padding: '6px 10px', border: `1px solid ${C.gray200}`, borderRadius: 7, fontSize: 12 }} />
        <select value={cat} onChange={e => setCat(e.target.value)} style={{ padding: '6px 8px', border: `1px solid ${C.gray200}`, borderRadius: 7, fontSize: 12 }}>
          {['Prozesse', 'Technologie', 'Personal', 'Kultur', 'Strategie'].map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={pri} onChange={e => setPri(e.target.value)} style={{ padding: '6px 8px', border: `1px solid ${C.gray200}`, borderRadius: 7, fontSize: 12 }}>
          <option value="hoch">Hoch</option><option value="mittel">Mittel</option><option value="niedrig">Niedrig</option>
        </select>
        <Btn onClick={add} small>+</Btn>
      </div>
      {issues.map(i => (
        <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: C.gray50, borderRadius: 8, marginBottom: 6, border: `1px solid ${C.gray200}` }}>
          <Badge color={priColor[i.priority]}>{i.priority}</Badge>
          <span style={{ flex: 1, fontSize: 13 }}>{i.text}</span>
          <Badge color={C.gray600}>{i.category}</Badge>
          <button onClick={() => onChange({ ...data, issues: issues.filter(x => x.id !== i.id) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray400 }}>×</button>
        </div>
      ))}
    </div>
  )
}

function EisenhowerModule({ data, onChange }) {
  const tasks = data.tasks || []
  const [text, setText] = useState(''); const [quad, setQuad] = useState('A')
  const quads = { A: { label: 'A — Wichtig & Dringend', color: C.red }, B: { label: 'B — Wichtig & Nicht dringend', color: C.blue }, C: { label: 'C — Nicht wichtig & Dringend', color: C.orange }, D: { label: 'D — Nicht wichtig & Nicht dringend', color: C.gray600 } }
  const add = () => { if (!text.trim()) return; onChange({ ...data, tasks: [...tasks, { id: `e${Date.now()}`, text, quad }] }); setText('') }
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Aufgabe…" style={{ flex: 1, minWidth: 120, padding: '6px 10px', border: `1px solid ${C.gray200}`, borderRadius: 7, fontSize: 12 }} />
        <select value={quad} onChange={e => setQuad(e.target.value)} style={{ padding: '6px 8px', border: `1px solid ${C.gray200}`, borderRadius: 7, fontSize: 12 }}>
          {Object.entries(quads).map(([k, v]) => <option key={k} value={k}>{k}</option>)}
        </select>
        <Btn onClick={add} small>+</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {Object.entries(quads).map(([k, v]) => (
          <div key={k} style={{ background: v.color + '08', borderRadius: 10, padding: '10px 12px', border: `1px solid ${v.color}30`, minHeight: 80 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: v.color, marginBottom: 8 }}>{v.label}</div>
            {tasks.filter(t => t.quad === k).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ flex: 1, fontSize: 12, color: C.navy }}>{t.text}</span>
                <button onClick={() => onChange({ ...data, tasks: tasks.filter(x => x.id !== t.id) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray400, fontSize: 14 }}>×</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function ProzessModule({ data, onChange }) {
  const nodes = data.nodes || []
  const [label, setLabel] = useState('')
  const add = () => { if (!label.trim()) return; onChange({ ...data, nodes: [...nodes, { id: `n${Date.now()}`, label, type: 'process' }] }); setLabel('') }
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <input value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Prozessschritt benennen…" style={{ flex: 1, padding: '6px 10px', border: `1px solid ${C.gray200}`, borderRadius: 7, fontSize: 12 }} />
        <Btn onClick={add} small>+ Schritt</Btn>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
        {nodes.map((node, i) => (
          <div key={node.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ background: C.blue + '15', border: `2px solid ${C.blue}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: C.blue, position: 'relative', cursor: 'default' }}>
              {node.label}
              <button onClick={() => onChange({ ...data, nodes: nodes.filter(n => n.id !== node.id) })} style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%', background: C.red, border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            {i < nodes.length - 1 && <div style={{ fontSize: 18, color: C.blue, margin: '0 4px' }}>→</div>}
          </div>
        ))}
        {nodes.length === 0 && <p style={{ color: C.gray400, fontSize: 12, padding: 12 }}>Noch keine Prozessschritte.</p>}
      </div>
    </div>
  )
}

function TodoModule({ data, onChange }) {
  const items = data.items || []
  const [text, setText] = useState('')
  const add = () => { if (!text.trim()) return; onChange({ ...data, items: [...items, { id: `td${Date.now()}`, text, done: false }] }); setText('') }
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Aufgabe…" style={{ flex: 1, padding: '6px 10px', border: `1px solid ${C.gray200}`, borderRadius: 7, fontSize: 12 }} />
        <Btn onClick={add} small>+</Btn>
      </div>
      {items.map(item => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${C.gray100}` }}>
          <button onClick={() => onChange({ ...data, items: items.map(i => i.id !== item.id ? i : { ...i, done: !i.done }) })}
            style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${item.done ? C.green : C.gray200}`, background: item.done ? C.green : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {item.done && <svg width="9" height="7" viewBox="0 0 9 7"><path d="M1 3.5l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>}
          </button>
          <span style={{ flex: 1, fontSize: 13, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? C.gray400 : C.navy }}>{item.text}</span>
          <button onClick={() => onChange({ ...data, items: items.filter(i => i.id !== item.id) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray400 }}>×</button>
        </div>
      ))}
    </div>
  )
}

// ── DOCUMENTS ─────────────────────────────────────────────────
function DocumentsView({ tenant }) {
  const [docList, setDocList] = useState([]); const [loading, setLoading] = useState(true); const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', phase: 'Initialphase', type: 'protocol' })
  useEffect(() => { documents.getForTenant(tenant.id).then(d => { setDocList(d); setLoading(false) }) }, [tenant.id])
  const add = async () => {
    const doc = await documents.create(tenant.id, form.title, form.phase, form.type)
    setDocList(prev => [doc, ...prev]); setShowModal(false); setForm({ title: '', phase: 'Initialphase', type: 'protocol' })
  }
  if (loading) return <Spinner />
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><Btn onClick={() => setShowModal(true)}>+ Dokument hinzufügen</Btn></div>
      {docList.map(doc => (
        <Card key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', marginBottom: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: C.blue + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{docTypeIcon[doc.doc_type]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: C.navy }}>{doc.title}</div>
            <div style={{ fontSize: 11, color: C.gray600, marginTop: 1 }}>{doc.phase_label} · {new Date(doc.created_at).toLocaleDateString('de-DE')}</div>
          </div>
          <Badge color={C.blue}>{docTypeLabel[doc.doc_type]}</Badge>
        </Card>
      ))}
      {docList.length === 0 && <Card style={{ textAlign: 'center', padding: 40, color: C.gray400 }}>Noch keine Dokumente.</Card>}
      {showModal && (
        <Modal title="Dokument eintragen" onClose={() => setShowModal(false)}>
          <Input label="Titel" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Sel label="Phase" value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))}>
            {['Initialphase', 'Arbeitsphase 1', 'Arbeitsphase 2', 'Arbeitsphase 3', 'Lernphase'].map(p => <option key={p}>{p}</option>)}
          </Sel>
          <Sel label="Typ" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="protocol">Protokoll</option><option value="report">Bericht</option><option value="other">Sonstiges</option>
          </Sel>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Abbrechen</Btn>
            <Btn onClick={add}>Hinzufügen</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── TEAM ──────────────────────────────────────────────────────
function TeamView({ tenant }) {
  const [memberList, setMemberList] = useState([]); const [inviteList, setInviteList] = useState([]); const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState(''); const [role, setRole] = useState('member'); const [inviting, setInviting] = useState(false); const [inviteResult, setInviteResult] = useState(null)
  useEffect(() => {
    Promise.all([members.getForTenant(tenant.id), members.getInvitations(tenant.id)])
      .then(([m, i]) => { setMemberList(m); setInviteList(i); setLoading(false) })
  }, [tenant.id])
  const invite = async () => {
    if (!email.trim()) return; setInviting(true)
    const inv = await members.invite(tenant.id, email, role)
    setInviteList(prev => [inv, ...prev]); setInviteResult(inv); setEmail(''); setInviting(false)
  }
  const inviteLink = inviteResult ? `${window.location.origin}?invite=${inviteResult.token}` : null
  if (loading) return <Spinner />
  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle>Mitglied einladen</SectionTitle>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-Mail-Adresse" style={{ flex: 1, padding: '8px 12px', border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13 }} />
          <select value={role} onChange={e => setRole(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13 }}>
            <option value="member">Mitglied</option><option value="coach">Coach</option>
          </select>
          <Btn onClick={invite} disabled={inviting}>{inviting ? '…' : 'Einladen'}</Btn>
        </div>
        {inviteResult && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: '#f0fdf4', borderRadius: 9, border: '1px solid #86efac' }}>
            <div style={{ fontSize: 12, color: C.green, fontWeight: 600, marginBottom: 6 }}>✓ Einladungslink erstellt</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <code style={{ flex: 1, fontSize: 11, background: '#fff', padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.gray200}`, wordBreak: 'break-all' }}>{inviteLink}</code>
              <button onClick={() => navigator.clipboard.writeText(inviteLink)} style={{ padding: '5px 10px', border: `1px solid ${C.gray200}`, borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 11 }}>Kopieren</button>
            </div>
            <div style={{ fontSize: 11, color: C.gray400, marginTop: 4 }}>Gültig 7 Tage. An das Teammitglied senden.</div>
          </div>
        )}
      </Card>
      <Card>
        <SectionTitle>Mitglieder ({memberList.length})</SectionTitle>
        {memberList.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: `1px solid ${C.gray100}` }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.blue + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.blue }}>
              {(m.profile?.full_name || m.profile?.email || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{m.profile?.full_name || '–'}</div>
              <div style={{ fontSize: 11, color: C.gray400 }}>{m.profile?.email}</div>
            </div>
            <Badge color={m.role === 'owner' ? C.orange : m.role === 'coach' ? C.purple : C.blue}>{roleLabel[m.role]}</Badge>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ── DASHBOARD ─────────────────────────────────────────────────
function Dashboard({ tenant: initialTenant, onBack, onSignOut, currentUser }) {
  const [tenant, setTenant] = useState(initialTenant)
  const [view, setView] = useState('overview')
  const nav = [['overview', '📊 Übersicht'], ['phases', '🗓 Phasen'], ['termine', '📅 Termine'], ['hausaufgaben', '✅ Hausaufgaben'], ['sprint', '🏃 Sprintboard'], ['docs', '📁 Dokumente'], ['modules', '🧩 Module'], ['team', '👥 Team']]

  const handleAmpelChange = async (ampel) => {
    await tenants.update(tenant.id, { ampel })
    setTenant(prev => ({ ...prev, ampel }))
  }

  return (
    <div style={{ minHeight: '100vh', background: C.gray50 }}>
      <div style={{ background: C.navy, padding: '0 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', height: 52, gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', fontSize: 18, padding: 4 }}>‹</button>
          <div style={{ marginRight: 8 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{tenant.company_name || tenant.name}</div>
            <div style={{ color: '#93c5fd', fontSize: 10 }}>{tenant.model} · {tenant.vorgang_id || '–'}</div>
          </div>
          <div style={{ display: 'flex', gap: 1, flex: 1, overflowX: 'auto' }}>
            {nav.map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: view === v ? C.blue : 'transparent', color: view === v ? '#fff' : '#93c5fd', whiteSpace: 'nowrap' }}>{l}</button>
            ))}
          </div>
          <Btn variant="ghost" small onClick={onSignOut} style={{ color: '#93c5fd', borderColor: '#1e3a6e', flexShrink: 0 }}>Abmelden</Btn>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        {view === 'overview' && <OverviewView tenant={tenant} onAmpelChange={handleAmpelChange} />}
        {view === 'phases' && <PhasesView tenant={tenant} />}
        {view === 'termine' && <TermineView tenant={tenant} currentUser={currentUser} />}
        {view === 'hausaufgaben' && <HausaufgabenView tenant={tenant} currentUser={currentUser} />}
        {view === 'sprint' && <SprintboardView tenant={tenant} />}
        {view === 'docs' && <DocumentsView tenant={tenant} />}
        {view === 'modules' && <ModuleView tenant={tenant} />}
        {view === 'team' && <TeamView tenant={tenant} />}
      </div>
    </div>
  )
}

// ── ROOT ──────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null); const [screen, setScreen] = useState('loading'); const [activeTenant, setActiveTenant] = useState(null)

  useEffect(() => {
    auth.getUser().then(u => { setUser(u); setScreen(u ? 'tenants' : 'auth') })
    const { data: { subscription } } = auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) { setScreen('auth'); setActiveTenant(null) }
      else if (screen === 'auth') setScreen('tenants')
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('invite')
    if (token && user) {
      members.acceptInvitation(token).then(() => { window.history.replaceState({}, '', window.location.pathname); setScreen('tenants') }).catch(() => alert('Einladung ungültig oder abgelaufen.'))
    }
  }, [user])

  if (screen === 'loading') return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
  if (screen === 'auth') return <AuthScreen onAuth={() => setScreen('tenants')} />
  if (screen === 'new') return <NewTenantForm onCreated={t => { setActiveTenant({ ...t, myRole: 'owner' }); setScreen('dashboard') }} onCancel={() => setScreen('tenants')} />
  if (screen === 'tenants') return <TenantList user={user} onSelect={t => { setActiveTenant(t); setScreen('dashboard') }} onNew={() => setScreen('new')} onSignOut={() => auth.signOut()} />
  if (screen === 'dashboard') return <Dashboard tenant={activeTenant} currentUser={user} onBack={() => setScreen('tenants')} onSignOut={() => auth.signOut()} />
  return null
}
