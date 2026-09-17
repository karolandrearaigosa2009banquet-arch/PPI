import { useState } from 'react'
import { supabase } from './supabaseClient'

const documentTypes = ['rc', 'ti', 'cc', 'ce']

export default function Login() {
  const [view, setView] = useState('login')
  const [form, setForm] = useState({
    documentType: documentTypes[0],
    documentNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
  })
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setStatus(null)
    if (view === 'signup' && form.password !== form.confirmPassword) return setStatus({ error: 'Las contraseñas no coinciden.' })
    if (view === 'signup' && form.password.length < 8) return setStatus({ error: 'Usa una contraseña de mínimo 8 caracteres.' })
    setBusy(true)
    const action = view === 'login'
      ? supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
      : supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            full_name: `${form.firstName} ${form.lastName}`.trim(),
            document_type: form.documentType,
            document_number: form.documentNumber.trim(),
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
          },
        },
      })
    const { data, error } = await action
    setBusy(false)
    if (error) return setStatus({ error: view === 'login' ? 'No pudimos iniciar sesión. Revisa tu correo y contraseña.' : error.message })
    if (view === 'signup' && !data.session) setStatus({ success: 'Cuenta creada. Revisa tu correo para confirmar tu registro.' })
  }

  const recover = async () => {
    if (!form.email) return setStatus({ error: 'Escribe tu correo para recibir el enlace de recuperación.' })
    setBusy(true); const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), { redirectTo: window.location.origin }); setBusy(false)
    setStatus(error ? { error: error.message } : { success: 'Si existe una cuenta con ese correo, recibirás un enlace de recuperación.' })
  }

  return <section className="auth-layout">
    <div className="welcome-panel"><span className="kicker">Centro de Salud Santo Domingo Savio I</span><h1>Tu voz también cuida.</h1><p>Radica, consulta y recibe respuesta a tus peticiones, quejas y reclamos en un espacio claro y protegido.</p><div className="feature-list"><span>✓ Registro y seguimiento en línea</span><span>✓ Respuestas desde el equipo de atención</span><span>✓ Información tratada de forma segura</span></div></div>
    <div className="auth-card"><div className="switcher"><button type="button" className={view === 'login' ? 'active' : ''} onClick={() => { setView('login'); setStatus(null) }}>Inicio de sesión</button><button type="button" className={view === 'signup' ? 'active' : ''} onClick={() => { setView('signup'); setStatus(null) }}>Registrarse</button></div><h2>{view === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h2><p className="muted">{view === 'login' ? 'Ingresa para consultar tus trámites.' : 'Solo te tomará un minuto.'}</p>
      <form onSubmit={submit} className="form-stack">{view === 'signup' && <>
        <label htmlFor="register-document-type">Tipo de documento<select id="register-document-type" name="documentType" value={form.documentType} onChange={set} required>{documentTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label htmlFor="register-document-number">Número de documento<input id="register-document-number" name="documentNumber" value={form.documentNumber} onChange={set} inputMode="numeric" pattern="\\d{5,20}" required placeholder="Ej. 123456789" /></label>
        <label htmlFor="register-first-name">Nombre<input id="register-first-name" name="firstName" value={form.firstName} onChange={set} autoComplete="given-name" required placeholder="Ej. Ana" /></label>
        <label htmlFor="register-last-name">Apellido<input id="register-last-name" name="lastName" value={form.lastName} onChange={set} autoComplete="family-name" required placeholder="Ej. Gómez" /></label>
        <label htmlFor="register-email">Correo<input id="register-email" name="email" type="email" value={form.email} onChange={set} autoComplete="email" required placeholder="nombre@correo.com" /></label>
        <label htmlFor="register-phone">Teléfono<input id="register-phone" name="phone" type="tel" value={form.phone} onChange={set} autoComplete="tel" inputMode="numeric" pattern="\\d{7,15}" required placeholder="Ej. 3001234567" /></label>
        <label htmlFor="register-address">Dirección<input id="register-address" name="address" value={form.address} onChange={set} autoComplete="street-address" required placeholder="Ej. Calle 10 # 20-30" /></label>
      </>}
        {view === 'login' && <label htmlFor="login-email">Correo electrónico<input id="login-email" name="email" type="email" value={form.email} onChange={set} autoComplete="email" required placeholder="nombre@correo.com" /></label>}
        <label htmlFor={view === 'login' ? 'login-password' : 'register-password'}>Contraseña<input id={view === 'login' ? 'login-password' : 'register-password'} name="password" type="password" value={form.password} onChange={set} autoComplete={view === 'login' ? 'current-password' : 'new-password'} required placeholder="Mínimo 8 caracteres" /></label>
        {view === 'signup' && <label htmlFor="register-confirm-password">Confirmar contraseña<input id="register-confirm-password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={set} autoComplete="new-password" required placeholder="Repite tu contraseña" /></label>}{status && <div className={`alert ${status.error ? 'alert-error' : 'alert-success'}`}>{status.error || status.success}</div>}<button className="btn btn-primary" disabled={busy}>{busy ? 'Procesando…' : view === 'login' ? 'Ingresar al sistema' : 'Crear cuenta'}</button></form>{view === 'login' && <button className="text-button" disabled={busy} onClick={recover}>¿Olvidaste tu contraseña?</button>}<p className="fine-print">Al continuar aceptas el uso de tus datos exclusivamente para gestionar tu PQR.</p></div>
  </section>
}
