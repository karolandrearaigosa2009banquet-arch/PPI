import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Login() {
  const [view, setView] = useState('login')
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  const submit = async (event) => {
    event.preventDefault(); setStatus(null)
    if (view === 'signup' && form.password !== form.confirmPassword) return setStatus({ error: 'Las contraseñas no coinciden.' })
    if (view === 'signup' && form.password.length < 8) return setStatus({ error: 'Usa una contraseña de mínimo 8 caracteres.' })
    setBusy(true)
    const action = view === 'login'
      ? supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
      : supabase.auth.signUp({ email: form.email.trim(), password: form.password, options: { data: { full_name: form.fullName.trim() } } })
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
    <div className="auth-card"><div className="switcher"><button className={view === 'login' ? 'active' : ''} onClick={() => { setView('login'); setStatus(null) }}>Ingresar</button><button className={view === 'signup' ? 'active' : ''} onClick={() => { setView('signup'); setStatus(null) }}>Crear cuenta</button></div><h2>{view === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h2><p className="muted">{view === 'login' ? 'Ingresa para consultar tus trámites.' : 'Solo te tomará un minuto.'}</p>
      <form onSubmit={submit} className="form-stack">{view === 'signup' && <label>Nombre completo<input value={form.fullName} onChange={set('fullName')} autoComplete="name" required placeholder="Ej. Ana Gómez" /></label>}<label>Correo electrónico<input type="email" value={form.email} onChange={set('email')} autoComplete="email" required placeholder="nombre@correo.com" /></label><label>Contraseña<input type="password" value={form.password} onChange={set('password')} autoComplete={view === 'login' ? 'current-password' : 'new-password'} required placeholder="Mínimo 8 caracteres" /></label>{view === 'signup' && <label>Confirmar contraseña<input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" required placeholder="Repite tu contraseña" /></label>}{status && <div className={`alert ${status.error ? 'alert-error' : 'alert-success'}`}>{status.error || status.success}</div>}<button className="btn btn-primary" disabled={busy}>{busy ? 'Procesando…' : view === 'login' ? 'Ingresar al sistema' : 'Crear cuenta'}</button></form>{view === 'login' && <button className="text-button" disabled={busy} onClick={recover}>¿Olvidaste tu contraseña?</button>}<p className="fine-print">Al continuar aceptas el uso de tus datos exclusivamente para gestionar tu PQR.</p></div>
  </section>
}
