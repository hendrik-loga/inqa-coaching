// src/App.jsx
import { useState, useEffect, useCallback } from 'react'
import { auth, tenants, phases, modules, documents, notes, members } from './lib/supabase'

// ── Design Tokens ─────────────────────────────────────────────
const C = {
  navy: '#0d1b3e',
  blue: '#1a56db',
  purple: '#7e3af2',
  green: '#0e9f6e',
  orange: '#ff8c00',
  red: '#e02424',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  gray600: '#6b7280',
  gray900: '#111827',
}

const statusColor = { done: C.green, active: C.blue, pending: C.gray400 }
const statusLabel = { done: 'Abgeschlossen', active: 'Laufend', pending: 'Ausstehend' }
const roleLabel = { owner: 'Inhaber', coach: 'Coach', member: 'Mitglied' }
const docTypeLabel = { protocol: 'Protokoll', report: 'Bericht', other: 'Dokument' }
const docTypeIcon = { protocol: '📋', report: '📊', other: '📄' }

// ── Kleine UI-Bausteine ───────────────────────────────────────
const Btn = ({ children, onClick, variant = 'primary', small, disabled, style = {} }) => {
  const base = {
    padding: small ? '6px 14px' : '10px 20px',
    borderRadius: 9,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    fontSize: small ? 12 : 14,
    transition: 'opacity .15s',
    opacity: disabled ? 0.5 : 1,
    ...style
  }
  const variants = {
    primary: { background: C.blue, color: '#fff' },
    danger: { background: '#fff5f5', color: C.red, border: `1px solid #fca5a5` },
    ghost: { background: 'transparent', color: C.gray600, border: `1px solid ${C.gray200}` },
  }
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>
}

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>}
    <input style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} {...props} />
  </div>
)

const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>}
    <select style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, background: '#fff' }} {...props}>{children}</select>
  </div>
)

const Card = ({ children, style = {} }) => (
  <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: `1px solid ${C.gray200}`, boxShadow: '0 2px 8px rgba(0,0,0,.04)', ...style }}>{children}</div>
)

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '90%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.navy }}>{title}</h2>
        <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: C.gray400 }}>×</button>
      </div>
      {children}
    </div>
  </div>
)

const Badge = ({ children, color = C.blue }) => (
  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: color + '18', color }}>{children}</span>
)

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
    <div style={{ width: 32, height: 32, border: `3px solid ${C.gray200}`, borderTopColor: C.blue, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
)

// ── AUTH SCREEN ───────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    setError(''); setLoading(true)
    try {
      if (mode === 'register') {
        const { error } = await auth.signUp(email, password, name)
        if (error) throw error
        setSuccess('Bestätigungsmail gesendet! Bitte E-Mail prüfen.')
      } else {
        const { error } = await auth.signIn(email, password)
        if (error) throw error
        onAuth()
      }
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 32px 80px rgba(0,0,0,.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, background: C.blue, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, fontWeight: 900, color: '#fff' }}>IQ</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.navy, fontFamily: 'Georgia, serif' }}>INQA Coaching</h1>
          <p style={{ margin: '4px 0 0', color: C.gray600, fontSize: 13 }}>Coaching-Plattform für INQA-Coaches</p>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: C.gray100, borderRadius: 10, padding: 4 }}>
          {[['login', 'Anmelden'], ['register', 'Registrieren']].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: mode === m ? '#fff' : 'transparent', color: mode === m ? C.navy : C.gray600, boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,.1)' : 'none', transition: 'all .15s' }}>{l}</button>
          ))}
        </div>

        {mode === 'register' && <Input label="Vollständiger Name" value={name} onChange={e => setName(e.target.value)} placeholder="Max Mustermann" />}
        <Input label="E-Mail-Adresse" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mail@beispiel.de" />
        <Input label="Passwort" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mindestens 6 Zeichen" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />

        {error && <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: C.red, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        {success && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', color: C.green, fontSize: 13, marginBottom: 14 }}>{success}</div>}

        <Btn onClick={handleSubmit} disabled={loading} style={{ width: '100%', textAlign: 'center' }}>
          {loading ? 'Bitte warten…' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
        </Btn>
      </div>
    </div>
  )
}

// ── TENANT SELECTOR ───────────────────────────────────────────
function TenantSelector({ user, onSelect, onNewTenant }) {
  const [myTenants, setMyTenants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tenants.getMyTenants().then(data => { setMyTenants(data); setLoading(false) })
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: C.gray50 }}>
      {/* Header */}
      <div style={{ background: C.navy, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: C.blue, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12, color: '#fff' }}>IQ</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: 'Georgia, serif' }}>INQA Coaching Plattform</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#93c5fd', fontSize: 13 }}>{user?.email}</span>
          <Btn variant="ghost" small onClick={() => auth.signOut()} style={{ color: '#93c5fd', borderColor: '#1e3a6e' }}>Abmelden</Btn>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.navy, fontFamily: 'Georgia, serif' }}>Meine Kunden</h1>
            <p style={{ margin: '4px 0 0', color: C.gray600, fontSize: 13 }}>Wähle einen Kunden oder lege einen neuen an.</p>
          </div>
          <Btn onClick={onNewTenant}>+ Neuer Kunde</Btn>
        </div>

        {loading ? <Spinner /> : myTenants.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
            <h3 style={{ color: C.navy, marginBottom: 8 }}>Noch kein Kunde angelegt</h3>
            <p style={{ color: C.gray600, fontSize: 13, marginBottom: 20 }}>Lege deinen ersten INQA-Coaching-Kunden an.</p>
            <Btn onClick={onNewTenant}>+ Ersten Kunden anlegen</Btn>
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {myTenants.map(t => (
              <Card key={t.id} style={{ cursor: 'pointer', transition: 'box-shadow .2s', display: 'flex', alignItems: 'center', gap: 20 }}
                onClick={() => onSelect(t)}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: C.blue + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏢</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.navy }}>{t.company_name || t.name}</div>
                  <div style={{ fontSize: 12, color: C.gray600, marginTop: 2 }}>
                    {t.model} · {t.vorgang_id ? `ID: ${t.vorgang_id}` : 'Keine Vorgangs-ID'} · Start: {t.start_date || '–'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge color={t.status === 'active' ? C.green : C.gray400}>{t.status === 'active' ? 'Aktiv' : 'Abgeschlossen'}</Badge>
                  <Badge color={C.purple}>{roleLabel[t.myRole]}</Badge>
                </div>
                <span style={{ color: C.gray400, fontSize: 18 }}>›</span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── NEW TENANT FORM ───────────────────────────────────────────
function NewTenantForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ name: '', companyName: '', vorgangId: '', model: 'Klassisches Modell', startDate: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    if (!form.companyName.trim()) return setError('Unternehmensname ist erforderlich.')
    setLoading(true); setError('')
    try {
      const tenant = await tenants.create(form.name, form.companyName, form.vorgangId, form.model, form.startDate || null)
      onCreated(tenant)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.gray50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card style={{ width: '100%', maxWidth: 480 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800, color: C.navy }}>Neuen Kunden anlegen</h2>
        <Input label="Unternehmensname *" value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Musterfirma GmbH" />
        <Input label="Kurzbezeichnung (intern)" value={form.name} onChange={e => set('name', e.target.value)} placeholder="z.B. Musterfirma" />
        <Input label="Vorgangs-ID (Z-EU-S)" value={form.vorgangId} onChange={e => set('vorgangId', e.target.value)} placeholder="VA1234567" />
        <Select label="Modell" value={form.model} onChange={e => set('model', e.target.value)}>
          <option>Klassisches Modell</option>
          <option>Kleines Modell</option>
        </Select>
        <Input label="Startdatum" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Btn variant="ghost" onClick={onCancel}>Abbrechen</Btn>
          <Btn onClick={handleCreate} disabled={loading}>{loading ? 'Anlegen…' : 'Kunden anlegen'}</Btn>
        </div>
      </Card>
    </div>
  )
}

// ── MEMBER MANAGEMENT ─────────────────────────────────────────
function MembersPanel({ tenant, myRole }) {
  const [memberList, setMemberList] = useState([])
  const [inviteList, setInviteList] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState(null)
  const isAdmin = myRole === 'owner' || myRole === 'coach'

  useEffect(() => {
    Promise.all([members.getForTenant(tenant.id), isAdmin ? members.getInvitations(tenant.id) : Promise.resolve([])])
      .then(([m, i]) => { setMemberList(m); setInviteList(i); setLoading(false) })
  }, [tenant.id])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const inv = await members.invite(tenant.id, inviteEmail, inviteRole)
      setInviteList(prev => [inv, ...prev])
      setInviteResult({ token: inv.token, email: inv.email })
      setInviteEmail('')
    } catch (e) { alert(e.message) }
    setInviting(false)
  }

  if (loading) return <Spinner />

  const inviteLink = inviteResult ? `${window.location.origin}?invite=${inviteResult.token}` : null

  return (
    <div>
      {isAdmin && (
        <Card style={{ marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: C.navy }}>Mitglied einladen</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="E-Mail-Adresse"
              style={{ flex: 1, padding: '9px 12px', border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13 }} />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              style={{ padding: '9px 12px', border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13 }}>
              <option value="member">Mitglied</option>
              <option value="coach">Coach</option>
            </select>
            <Btn onClick={handleInvite} disabled={inviting}>{inviting ? '…' : 'Einladen'}</Btn>
          </div>
          {inviteResult && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #86efac' }}>
              <div style={{ fontSize: 13, color: C.green, fontWeight: 600, marginBottom: 6 }}>✓ Einladungslink für {inviteResult.email}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{ flex: 1, fontSize: 11, background: '#fff', padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.gray200}`, wordBreak: 'break-all' }}>{inviteLink}</code>
                <button onClick={() => navigator.clipboard.writeText(inviteLink)} style={{ padding: '6px 12px', border: `1px solid ${C.gray200}`, borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>Kopieren</button>
              </div>
              <div style={{ fontSize: 11, color: C.gray600, marginTop: 6 }}>Link an das Teammitglied senden. Gültig 7 Tage.</div>
            </div>
          )}
        </Card>
      )}

      <Card>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: C.navy }}>Aktive Mitglieder ({memberList.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {memberList.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: C.gray50, borderRadius: 10, border: `1px solid ${C.gray200}` }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.blue + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: C.blue }}>
                {(m.profile?.full_name || m.profile?.email || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{m.profile?.full_name || '–'}</div>
                <div style={{ fontSize: 11, color: C.gray600 }}>{m.profile?.email}</div>
              </div>
              <Badge color={m.role === 'owner' ? C.orange : m.role === 'coach' ? C.purple : C.blue}>{roleLabel[m.role]}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {isAdmin && inviteList.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: C.navy }}>Ausstehende Einladungen</h3>
          {inviteList.map(inv => (
            <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${C.gray100}` }}>
              <span style={{ flex: 1, fontSize: 13, color: C.gray600 }}>✉ {inv.email}</span>
              <Badge color={C.orange}>{roleLabel[inv.role]}</Badge>
              <span style={{ fontSize: 11, color: C.gray400 }}>läuft ab: {new Date(inv.expires_at).toLocaleDateString('de-DE')}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

// ── PHASES VIEW ───────────────────────────────────────────────
function PhasesView({ tenant }) {
  const [phaseList, setPhaseList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    phases.getForTenant(tenant.id).then(data => { setPhaseList(data); setLoading(false) })
  }, [tenant.id])

  const toggleStep = async (phaseId, stepId, currentDone) => {
    await phases.toggleStep(stepId, !currentDone)
    setPhaseList(prev => prev.map(p => p.id !== phaseId ? p : {
      ...p, steps: p.steps.map(s => s.id !== stepId ? s : { ...s, done: !currentDone })
    }))
  }

  if (loading) return <Spinner />

  const allSteps = phaseList.flatMap(p => p.steps)
  const progress = allSteps.length ? Math.round(allSteps.filter(s => s.done).length / allSteps.length * 100) : 0

  return (
    <div>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>Gesamtfortschritt</span>
          <span style={{ fontSize: 13, color: C.gray600 }}>{progress}%</span>
        </div>
        <div style={{ background: C.gray200, borderRadius: 99, height: 8 }}>
          <div style={{ background: C.blue, width: `${progress}%`, height: '100%', borderRadius: 99, transition: 'width .4s' }} />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {phaseList.map(phase => {
          const done = phase.steps.filter(s => s.done).length
          const pct = phase.steps.length ? Math.round(done / phase.steps.length * 100) : 0
          const isSelected = selected === phase.id
          return (
            <div key={phase.id} onClick={() => setSelected(isSelected ? null : phase.id)}
              style={{ background: isSelected ? '#f0f5ff' : '#fff', border: `2px solid ${isSelected ? phase.color : C.gray200}`, borderRadius: 14, padding: '18px 20px', cursor: 'pointer', transition: 'all .2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: phase.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{phase.months}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginTop: 2 }}>{phase.label}</div>
                  <div style={{ fontSize: 12, color: C.gray600 }}>{phase.subtitle}</div>
                </div>
                <Badge color={statusColor[phase.status]}>{statusLabel[phase.status]}</Badge>
              </div>
              <div style={{ fontSize: 12, color: C.gray600, marginBottom: 4 }}>{done}/{phase.steps.length} Schritte · {pct}%</div>
              <div style={{ background: C.gray200, borderRadius: 99, height: 5 }}>
                <div style={{ background: phase.color, width: `${pct}%`, height: '100%', borderRadius: 99 }} />
              </div>
              {isSelected && (
                <div style={{ marginTop: 16, borderTop: `1px solid ${C.gray200}`, paddingTop: 14 }}>
                  {phase.steps.map(step => (
                    <div key={step.id} onClick={e => { e.stopPropagation(); toggleStep(phase.id, step.id, step.done) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${step.done ? phase.color : C.gray200}`, background: step.done ? phase.color : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                        {step.done && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>}
                      </div>
                      <span style={{ fontSize: 13, color: step.done ? '#374151' : C.gray600, flex: 1 }}>{step.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MODULES VIEW ──────────────────────────────────────────────
function ModulesView({ tenant }) {
  const [moduleList, setModuleList] = useState([])
  const [noteList, setNoteList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [noteText, setNoteText] = useState('')

  useEffect(() => {
    Promise.all([modules.getForTenant(tenant.id), notes.getForTenant(tenant.id)])
      .then(([m, n]) => { setModuleList(m); setNoteList(n); setLoading(false) })
  }, [tenant.id])

  const addModule = async (type, title, icon) => {
    const m = await modules.create(tenant.id, type, title, icon)
    setModuleList(prev => [...prev, m])
    setShowAddModal(false)
  }

  const updateModuleData = async (moduleId, newData) => {
    await modules.updateData(moduleId, newData)
    setModuleList(prev => prev.map(m => m.id !== moduleId ? m : { ...m, data: newData }))
  }

  const removeModule = async (moduleId) => {
    await modules.remove(moduleId)
    setModuleList(prev => prev.filter(m => m.id !== moduleId))
  }

  const addNote = async () => {
    if (!noteText.trim()) return
    const n = await notes.create(tenant.id, noteText)
    setNoteList(prev => [n, ...prev])
    setNoteText('')
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn onClick={() => setShowAddModal(true)}>+ Modul hinzufügen</Btn>
      </div>

      {/* Notizen */}
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: C.navy }}>📝 Team-Notizen</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Notiz eingeben…" rows={2}
            style={{ flex: 1, padding: '8px 12px', border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13, resize: 'none' }} />
          <Btn onClick={addNote}>+</Btn>
        </div>
        {noteList.map(n => (
          <div key={n.id} style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', marginBottom: 8 }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}>{n.text}</p>
            <span style={{ fontSize: 11, color: C.gray400 }}>{n.author?.full_name || n.author_name} · {new Date(n.created_at).toLocaleDateString('de-DE')}</span>
          </div>
        ))}
        {noteList.length === 0 && <p style={{ color: C.gray400, fontSize: 13, textAlign: 'center', padding: 16 }}>Noch keine Notizen.</p>}
      </Card>

      {/* Dynamische Module */}
      {moduleList.map(mod => (
        <Card key={mod.id} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{mod.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: C.navy }}>{mod.title}</span>
            </div>
            <Btn variant="danger" small onClick={() => removeModule(mod.id)}>Entfernen</Btn>
          </div>
          {mod.module_type === 'issue-map' && <IssueMap data={mod.data} onChange={d => updateModuleData(mod.id, d)} />}
          {mod.module_type === 'scrum' && <ScrumBoard data={mod.data} onChange={d => updateModuleData(mod.id, d)} />}
        </Card>
      ))}

      {showAddModal && (
        <Modal title="Modul hinzufügen" onClose={() => setShowAddModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { type: 'issue-map', title: 'Issue Map', icon: '🗺️', desc: 'Probleme und Herausforderungen erfassen' },
              { type: 'scrum', title: 'Sprint Board', icon: '🏃', desc: 'Aufgaben agil managen mit Sprint-Struktur' },
            ].map(opt => (
              <button key={opt.type} onClick={() => addModule(opt.type, opt.title, opt.icon)}
                style={{ padding: '14px 18px', border: `2px solid ${C.gray200}`, borderRadius: 12, background: C.gray50, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>{opt.icon} {opt.title}</div>
                <div style={{ fontSize: 12, color: C.gray600, marginTop: 2 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

// Issue Map & Scrum (kompakt)
function IssueMap({ data, onChange }) {
  const issues = data.issues || []
  const [text, setText] = useState(''); const [cat, setCat] = useState('Prozesse'); const [pri, setPri] = useState('mittel')
  const priColor = { hoch: C.red, mittel: C.orange, niedrig: C.green }
  const add = () => { if (!text.trim()) return; onChange({ ...data, issues: [...issues, { id: `i${Date.now()}`, text, category: cat, priority: pri }] }); setText('') }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Neues Problem…" style={{ flex: 1, minWidth: 140, padding: '7px 10px', border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 13 }} />
        <select value={cat} onChange={e => setCat(e.target.value)} style={{ padding: '7px 10px', border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 12 }}>
          {['Prozesse', 'Technologie', 'Personal', 'Kultur', 'Strategie'].map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={pri} onChange={e => setPri(e.target.value)} style={{ padding: '7px 10px', border: `1px solid ${C.gray200}`, borderRadius: 8, fontSize: 12 }}>
          <option value="hoch">Hoch</option><option value="mittel">Mittel</option><option value="niedrig">Niedrig</option>
        </select>
        <Btn onClick={add} small>+</Btn>
      </div>
      {issues.map(i => (
        <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: C.gray50, borderRadius: 8, border: `1px solid ${C.gray200}`, marginBottom: 6 }}>
          <Badge color={priColor[i.priority]}>{i.priority}</Badge>
          <span style={{ flex: 1, fontSize: 13 }}>{i.text}</span>
          <Badge color={C.gray600}>{i.category}</Badge>
          <button onClick={() => onChange({ ...data, issues: issues.filter(x => x.id !== i.id) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray400, fontSize: 16 }}>×</button>
        </div>
      ))}
      {issues.length === 0 && <p style={{ color: C.gray400, fontSize: 13, textAlign: 'center', padding: 12 }}>Noch keine Probleme erfasst.</p>}
    </div>
  )
}

function ScrumBoard({ data, onChange }) {
  const sprints = data.sprints || []
  const cols = ['todo', 'in-progress', 'done']
  const colLabel = { todo: 'To Do', 'in-progress': 'In Arbeit', done: 'Erledigt' }
  const colColor = { todo: C.gray600, 'in-progress': C.orange, done: C.green }
  const move = (spId, tId, st) => onChange({ ...data, sprints: sprints.map(sp => sp.id !== spId ? sp : { ...sp, tasks: sp.tasks.map(t => t.id !== tId ? t : { ...t, status: st }) }) })
  const addTask = (spId, text) => { if (!text.trim()) return; onChange({ ...data, sprints: sprints.map(sp => sp.id !== spId ? sp : { ...sp, tasks: [...sp.tasks, { id: `t${Date.now()}`, text, status: 'todo' }] }) }) }
  return (
    <div>
      {sprints.map(sp => (
        <div key={sp.id} style={{ marginBottom: 16, padding: 14, background: C.gray50, borderRadius: 10, border: `1px solid ${C.gray200}` }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 10 }}>{sp.name}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {cols.map(col => (
              <div key={col} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: `1px solid ${C.gray200}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colColor[col], marginBottom: 6, textTransform: 'uppercase' }}>{colLabel[col]}</div>
                {sp.tasks.filter(t => t.status === col).map(task => (
                  <div key={task.id} style={{ background: C.gray50, borderRadius: 6, padding: '5px 8px', marginBottom: 4, fontSize: 12, borderLeft: `3px solid ${colColor[col]}` }}>
                    {task.text}
                    <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                      {cols.filter(c => c !== col).map(c => <button key={c} onClick={() => move(sp.id, task.id, c)} style={{ fontSize: 10, padding: '1px 5px', border: `1px solid ${C.gray200}`, borderRadius: 4, background: '#fff', cursor: 'pointer', color: C.gray600 }}>→ {colLabel[c]}</button>)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <TaskInput onAdd={t => addTask(sp.id, t)} />
        </div>
      ))}
    </div>
  )
}

function TaskInput({ onAdd }) {
  const [v, setV] = useState('')
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
      <input value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === 'Enter' && (onAdd(v), setV(''))} placeholder="Aufgabe hinzufügen…" style={{ flex: 1, padding: '5px 8px', border: `1px solid ${C.gray200}`, borderRadius: 6, fontSize: 12 }} />
      <button onClick={() => { onAdd(v); setV('') }} style={{ padding: '5px 10px', background: C.blue, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>+</button>
    </div>
  )
}

// ── DOCUMENTS VIEW ────────────────────────────────────────────
function DocumentsView({ tenant }) {
  const [docList, setDocList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', phase: 'Initialphase', type: 'protocol' })

  useEffect(() => {
    documents.getForTenant(tenant.id).then(data => { setDocList(data); setLoading(false) })
  }, [tenant.id])

  const addDoc = async () => {
    const doc = await documents.create(tenant.id, form.title, form.phase, form.type)
    setDocList(prev => [doc, ...prev])
    setShowModal(false); setForm({ title: '', phase: 'Initialphase', type: 'protocol' })
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn onClick={() => setShowModal(true)}>+ Dokument hinzufügen</Btn>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {docList.map(doc => (
          <Card key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: C.blue + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{docTypeIcon[doc.doc_type]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.navy }}>{doc.title}</div>
              <div style={{ fontSize: 12, color: C.gray600, marginTop: 2 }}>{doc.phase_label} · {new Date(doc.created_at).toLocaleDateString('de-DE')}</div>
            </div>
            <Badge color={C.blue}>{docTypeLabel[doc.doc_type]}</Badge>
          </Card>
        ))}
        {docList.length === 0 && <Card style={{ textAlign: 'center', padding: 40, color: C.gray400 }}>Noch keine Dokumente erfasst.</Card>}
      </div>
      {showModal && (
        <Modal title="Dokument eintragen" onClose={() => setShowModal(false)}>
          <Input label="Titel" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Fortschrittsbericht 1" />
          <Select label="Phase" value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))}>
            {['Initialphase', 'Arbeitsphase 1', 'Arbeitsphase 2', 'Arbeitsphase 3', 'Lernphase'].map(p => <option key={p}>{p}</option>)}
          </Select>
          <Select label="Typ" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="protocol">Protokoll</option>
            <option value="report">Bericht</option>
            <option value="other">Sonstiges</option>
          </Select>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Abbrechen</Btn>
            <Btn onClick={addDoc}>Hinzufügen</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── OVERVIEW ──────────────────────────────────────────────────
function OverviewView({ tenant }) {
  const [phaseList, setPhaseList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    phases.getForTenant(tenant.id).then(data => { setPhaseList(data); setLoading(false) })
  }, [tenant.id])

  if (loading) return <Spinner />

  const allSteps = phaseList.flatMap(p => p.steps)
  const progress = allSteps.length ? Math.round(allSteps.filter(s => s.done).length / allSteps.length * 100) : 0
  const activePhase = phaseList.find(p => p.status === 'active')

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Gesamtfortschritt', value: `${progress}%`, color: C.blue },
          { label: 'Aktuelle Phase', value: activePhase?.label ?? '–', color: C.purple },
          { label: 'Modell', value: tenant.model, color: C.green },
          { label: 'Vorgangs-ID', value: tenant.vorgang_id || '–', color: C.orange },
        ].map((s, i) => (
          <Card key={i}>
            <div style={{ fontSize: 11, color: C.gray600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'Georgia, serif' }}>{s.value}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 12 }}>Phasenfortschritt</div>
        <div style={{ display: 'flex', gap: 4, height: 10, borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
          {phaseList.map(p => {
            const pct = p.steps.length ? Math.round(p.steps.filter(s => s.done).length / p.steps.length * 100) : 0
            const share = allSteps.length ? (p.steps.length / allSteps.length) * 100 : 20
            return (
              <div key={p.id} style={{ flex: share, background: C.gray200, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ background: p.color, width: `${pct}%`, height: '100%' }} />
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 18, left: '10%', right: '10%', height: 2, background: C.gray200 }} />
          {phaseList.map((p, i) => (
            <div key={p.id} style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', margin: '0 auto', background: p.status === 'done' ? p.color : p.status === 'active' ? '#fff' : C.gray100, border: `3px solid ${p.status === 'pending' ? C.gray200 : p.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: p.status === 'active' ? `0 0 0 4px ${p.color}30` : 'none' }}>
                {p.status === 'done' ? <svg width="12" height="10" viewBox="0 0 12 10"><path d="M1 5l4 4 6-8" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" /></svg> : <span style={{ fontSize: 11, fontWeight: 800, color: p.status === 'active' ? p.color : C.gray400 }}>{i + 1}</span>}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginTop: 6 }}>{p.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── MAIN DASHBOARD ────────────────────────────────────────────
function Dashboard({ tenant, myRole, onBack, onSignOut }) {
  const [view, setView] = useState('overview')
  const navItems = [['overview', '📊 Übersicht'], ['phases', '🗓 Phasen'], ['modules', '🧩 Module'], ['docs', '📁 Dokumente'], ['members', '👥 Team']]

  return (
    <div style={{ minHeight: '100vh', background: C.gray50 }}>
      {/* Header */}
      <div style={{ background: C.navy, padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', height: 56, gap: 16 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>‹</button>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'Georgia, serif' }}>{tenant.company_name || tenant.name}</div>
            <div style={{ color: '#93c5fd', fontSize: 11 }}>{tenant.model} · {tenant.vorgang_id || 'Keine ID'}</div>
          </div>
          <div style={{ display: 'flex', gap: 2, marginLeft: 16, flex: 1, overflowX: 'auto' }}>
            {navItems.map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: view === v ? C.blue : 'transparent', color: view === v ? '#fff' : '#93c5fd', whiteSpace: 'nowrap', transition: 'all .15s' }}>{l}</button>
            ))}
          </div>
          <Btn variant="ghost" small onClick={onSignOut} style={{ color: '#93c5fd', borderColor: '#1e3a6e', flexShrink: 0 }}>Abmelden</Btn>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {view === 'overview' && <OverviewView tenant={tenant} />}
        {view === 'phases' && <PhasesView tenant={tenant} />}
        {view === 'modules' && <ModulesView tenant={tenant} />}
        {view === 'docs' && <DocumentsView tenant={tenant} />}
        {view === 'members' && <MembersPanel tenant={tenant} myRole={myRole} />}
      </div>
    </div>
  )
}

// ── ROOT ──────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null)
  const [screen, setScreen] = useState('loading') // loading | auth | tenants | newTenant | dashboard
  const [activeTenant, setActiveTenant] = useState(null)
  const [myRole, setMyRole] = useState(null)

  useEffect(() => {
    auth.getUser().then(u => {
      setUser(u)
      setScreen(u ? 'tenants' : 'auth')
    })
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) { setScreen('auth'); setActiveTenant(null) }
      else if (screen === 'auth') setScreen('tenants')
    })
    return () => subscription.unsubscribe()
  }, [])

  // Einladungs-Token aus URL prüfen
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('invite')
    if (token && user) {
      members.acceptInvitation(token).then(tenantId => {
        window.history.replaceState({}, '', window.location.pathname)
        setScreen('tenants')
      }).catch(e => alert('Einladung ungültig oder abgelaufen.'))
    }
  }, [user])

  const handleSelectTenant = (tenant) => {
    setActiveTenant(tenant)
    setMyRole(tenant.myRole)
    setScreen('dashboard')
  }

  const handleSignOut = () => { auth.signOut(); setScreen('auth'); setActiveTenant(null) }

  if (screen === 'loading') return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: C.gray600 }}><Spinner /></div>
  if (screen === 'auth') return <AuthScreen onAuth={() => setScreen('tenants')} />
  if (screen === 'newTenant') return <NewTenantForm onCreated={t => { setActiveTenant({ ...t, myRole: 'owner' }); setMyRole('owner'); setScreen('dashboard') }} onCancel={() => setScreen('tenants')} />
  if (screen === 'tenants') return <TenantSelector user={user} onSelect={handleSelectTenant} onNewTenant={() => setScreen('newTenant')} />
  if (screen === 'dashboard') return <Dashboard tenant={activeTenant} myRole={myRole} onBack={() => setScreen('tenants')} onSignOut={handleSignOut} />
  return null
}
