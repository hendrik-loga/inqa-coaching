import { useState, useRef, useEffect, useCallback } from 'react'
import { createWorker } from 'tesseract.js'
import { parseBusinessCard } from '../utils/businessCardParser'
import { generateVCard } from '../utils/vCardGenerator'

const NAVY = '#00004a'
const RED  = '#c0003c'

export default function ScannerApp() {
  const [step, setStep] = useState('camera')   // camera | processing | preview | done
  const [progress, setProgress] = useState(0)
  const [contact, setContact] = useState(null)
  const [error, setError] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Start rear camera
  const startCamera = useCallback(async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (e) {
      setError('Kamerazugriff nicht möglich. Bitte in den Browser-Einstellungen erlauben.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    startCamera()
    return stopCamera
  }, [startCamera, stopCamera])

  // Capture photo and run OCR
  async function captureAndScan() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width  = video.videoWidth  || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d').drawImage(video, 0, 0)
    stopCamera()
    setProgress(0)
    setStep('processing')

    try {
      const worker = await createWorker(['deu', 'eng'], 1, {
        logger: m => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100))
        },
      })
      const { data: { text } } = await worker.recognize(canvas)
      await worker.terminate()

      const parsed = parseBusinessCard(text)
      setContact(parsed)
      setStep('preview')
    } catch (e) {
      setError('Texterkennung fehlgeschlagen. Bitte erneut versuchen.')
      setStep('camera')
      startCamera()
    }
  }

  async function saveContact() {
    const vcf = generateVCard(contact)
    const fileName = `${contact.lastName || contact.firstName || 'kontakt'}.vcf`
    const file = new File([vcf], fileName, { type: 'text/vcard' })

    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: [contact.firstName, contact.lastName].filter(Boolean).join(' ') })
      } else {
        const url = URL.createObjectURL(new Blob([vcf], { type: 'text/vcard' }))
        window.location.href = url
      }
      setStep('done')
    } catch (e) {
      if (e.name !== 'AbortError') setError('Speichern fehlgeschlagen: ' + e.message)
    }
  }

  function reset() {
    setStep('camera')
    setContact(null)
    setError('')
    startCamera()
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ background: NAVY, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>IC</div>
        <span style={{ fontWeight: 600, fontSize: 16 }}>Visitenkarten Scanner</span>
      </div>

      {error && (
        <div style={{ background: '#7f1d1d', padding: '12px 16px', fontSize: 14 }}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* ── CAMERA STEP ── */}
      {step === 'camera' && (
        <div style={{ position: 'relative', height: 'calc(100dvh - 60px)' }}>
          <video ref={videoRef} autoPlay playsInline muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />

          {/* Card guide overlay */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ position: 'relative', width: '85vw', aspectRatio: '1.75', border: '2px solid rgba(255,255,255,0.8)', borderRadius: 10 }}>
              {/* Corner marks */}
              {[['0%','0%','topLeft'],['100%','0%','topRight'],['0%','100%','bottomLeft'],['100%','100%','bottomRight']].map(([l,t,k]) => (
                <CornerMark key={k} left={l} top={t} />
              ))}
              <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.55)', padding: '3px 10px', borderRadius: 6, fontSize: 12, whiteSpace: 'nowrap' }}>
                Visitenkarte in den Rahmen legen
              </div>
            </div>
          </div>

          {/* Capture button */}
          <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)' }}>
            <button onClick={captureAndScan} style={{ width: 76, height: 76, borderRadius: '50%', background: '#fff', border: '4px solid rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CameraIcon />
            </button>
          </div>
        </div>
      )}

      {/* ── PROCESSING STEP ── */}
      {step === 'processing' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100dvh - 60px)', gap: 20, padding: 24 }}>
          <canvas ref={canvasRef} style={{ maxWidth: '90%', maxHeight: '40vh', borderRadius: 10, display: 'block' }} />
          <div style={{ width: '80%', background: '#1a1a2e', borderRadius: 8, overflow: 'hidden', height: 8 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: RED, transition: 'width 0.3s' }} />
          </div>
          <p style={{ fontSize: 15, color: '#ccc' }}>Visitenkarte wird analysiert… {progress}%</p>
        </div>
      )}

      {/* Hidden canvas (used during camera step too) */}
      {step === 'camera' && <canvas ref={canvasRef} style={{ display: 'none' }} />}

      {/* ── PREVIEW STEP ── */}
      {step === 'preview' && contact && (
        <div style={{ background: '#f8fafc', color: '#111', minHeight: 'calc(100dvh - 60px)', overflowY: 'auto' }}>
          <div style={{ padding: '20px 16px 0', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: `${NAVY}15`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <PersonIcon color={NAVY} />
            </div>
            <h2 style={{ margin: 0, fontSize: 18, color: NAVY }}>Kontakt prüfen & speichern</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>Erkannte Daten können bearbeitet werden</p>
          </div>

          <div style={{ padding: '0 16px 32px' }}>
            <FieldGroup title="Name">
              <Field label="Vorname"    value={contact.firstName}  onChange={v => setContact(c => ({...c, firstName: v}))} />
              <Field label="Nachname"   value={contact.lastName}   onChange={v => setContact(c => ({...c, lastName: v}))} />
              <Field label="Position"   value={contact.jobTitle}   onChange={v => setContact(c => ({...c, jobTitle: v}))} />
              <Field label="Unternehmen" value={contact.company}   onChange={v => setContact(c => ({...c, company: v}))} />
            </FieldGroup>

            <FieldGroup title="Kontakt">
              <Field label="Telefon"    value={contact.phone}    onChange={v => setContact(c => ({...c, phone: v}))}    inputMode="tel" />
              <Field label="Mobil"      value={contact.mobile}   onChange={v => setContact(c => ({...c, mobile: v}))}   inputMode="tel" />
              <Field label="E-Mail"     value={contact.email}    onChange={v => setContact(c => ({...c, email: v}))}    inputMode="email" />
              <Field label="Website"    value={contact.website}  onChange={v => setContact(c => ({...c, website: v}))}  inputMode="url" />
            </FieldGroup>

            <FieldGroup title="Adresse">
              <Field label="Straße"  value={contact.street}     onChange={v => setContact(c => ({...c, street: v}))} />
              <Field label="PLZ"     value={contact.postalCode} onChange={v => setContact(c => ({...c, postalCode: v}))} inputMode="numeric" />
              <Field label="Stadt"   value={contact.city}       onChange={v => setContact(c => ({...c, city: v}))} />
              <Field label="Land"    value={contact.country}    onChange={v => setContact(c => ({...c, country: v}))} />
            </FieldGroup>

            <button onClick={saveContact} style={{ width: '100%', padding: '15px', background: NAVY, color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
              📇 Zu Kontakten hinzufügen
            </button>
            <button onClick={reset} style={{ width: '100%', padding: '14px', background: '#e5e7eb', color: '#111', border: 'none', borderRadius: 12, fontSize: 15, cursor: 'pointer', marginTop: 10 }}>
              🔄 Neu scannen
            </button>
          </div>
        </div>
      )}

      {/* ── DONE STEP ── */}
      {step === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100dvh - 60px)', gap: 16, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 64 }}>✅</div>
          <h2 style={{ margin: 0 }}>Kontakt gespeichert!</h2>
          <p style={{ color: '#ccc', margin: 0 }}>Der Kontakt wurde zu Ihren Kontakten hinzugefügt.</p>
          <button onClick={reset} style={{ padding: '14px 32px', background: RED, color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
            Nächste Visitenkarte scannen
          </button>
        </div>
      )}
    </div>
  )
}

// ── Small components ──────────────────────────────────────────

function CornerMark({ left, top }) {
  const isRight  = left  === '100%'
  const isBottom = top   === '100%'
  return (
    <div style={{
      position: 'absolute', left, top,
      width: 18, height: 18,
      borderTop:    isBottom ? 'none' : '2.5px solid #fff',
      borderBottom: isBottom ? '2.5px solid #fff' : 'none',
      borderLeft:   isRight  ? 'none' : '2.5px solid #fff',
      borderRight:  isRight  ? '2.5px solid #fff' : 'none',
      transform: `translate(${isRight ? '-100%' : '0'}, ${isBottom ? '-100%' : '0'})`,
    }} />
  )
}

function FieldGroup({ title, children }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, paddingLeft: 4 }}>{title}</div>
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, inputMode = 'text' }) {
  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid #f1f1f1' }}>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{label}</div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        inputMode={inputMode}
        autoCapitalize={inputMode === 'text' ? 'words' : 'none'}
        autoCorrect="off"
        style={{ width: '100%', border: 'none', outline: 'none', fontSize: 15, background: 'transparent', color: '#111' }}
      />
    </div>
  )
}

function CameraIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function PersonIcon({ color }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
