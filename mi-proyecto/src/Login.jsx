import { useState } from 'react'
import { supabase } from './supabaseClient'

const DOCUMENT_OPTIONS = [
  { value: 'rc', label: 'RC' },
  { value: 'ti', label: 'TI' },
  { value: 'cc', label: 'CC' },
  { value: 'ce', label: 'CE' },
]

const initialLoginForm = {
  email: '',
  password: '',
}

const initialSignupForm = {
  documentType: 'cc',
  documentNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  password: '',
  confirmPassword: '',
}

export default function Login() {
  const [view, setView] = useState('login')
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [signupForm, setSignupForm] = useState(initialSignupForm)
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

  const updateLogin = (field) => (event) => {
    setLoginForm({ ...loginForm, [field]: event.target.value })
  }

  const updateSignup = (field) => (event) => {
    setSignupForm({ ...signupForm, [field]: event.target.value })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus(null)

    if (!supabase) {
      setStatus({ error: 'La configuración de Supabase no está lista.' })
      return
    }

    if (view === 'login') {
      const email = loginForm.email.trim()
      const password = loginForm.password

      if (!email || !password) {
        setStatus({ error: 'Escribe tu correo y contraseña para iniciar sesión.' })
        return
      }

      setBusy(true)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setBusy(false)

      if (error) {
        setStatus({ error: 'No pudimos iniciar sesión. Revisa tu correo y contraseña.' })
        return
      }

      setStatus({ success: 'Inicio de sesión correcto.' })
      return
    }

    const firstName = signupForm.firstName.trim()
    const lastName = signupForm.lastName.trim()
    const email = signupForm.email.trim()
    const documentNumber = signupForm.documentNumber.trim()
    const phone = signupForm.phone.trim()
    const address = signupForm.address.trim()

    if (!signupForm.documentType) {
      setStatus({ error: 'Selecciona un tipo de documento.' })
      return
    }

    if (!documentNumber) {
      setStatus({ error: 'Escribe el número de documento.' })
      return
    }

    if (!firstName || !lastName) {
      setStatus({ error: 'Escribe tu nombre y apellido.' })
      return
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus({ error: 'Escribe un correo válido.' })
      return
    }

    if (!phone || !/^\d{7,15}$/.test(phone.replace(/\D/g, ''))) {
      setStatus({ error: 'Escribe un teléfono válido.' })
      return
    }

    if (!address) {
      setStatus({ error: 'Escribe tu dirección.' })
      return
    }

    if (signupForm.password.length < 8) {
      setStatus({ error: 'Usa una contraseña de mínimo 8 caracteres.' })
      return
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setStatus({ error: 'Las contraseñas no coinciden.' })
      return
    }

    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password: signupForm.password,
      options: {
        data: {
          full_name: `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
          document_type: signupForm.documentType,
          document_number: documentNumber,
          phone,
          address,
        },
      },
    })
    setBusy(false)

    if (error) {
      setStatus({ error: error.message })
      return
    }

    if (!data.session) {
      setStatus({ success: 'Cuenta creada. Revisa tu correo para confirmar el registro.' })
      setSignupForm(initialSignupForm)
      return
    }

    setStatus({ success: 'Cuenta creada correctamente.' })
  }

  const handleRecover = async () => {
    if (!supabase) {
      setStatus({ error: 'La configuración de Supabase no está lista.' })
      return
    }

    if (!loginForm.email.trim()) {
      setStatus({ error: 'Escribe tu correo para recibir el enlace de recuperación.' })
      return
    }

    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(loginForm.email.trim(), {
      redirectTo: window.location.origin,
    })
    setBusy(false)

    setStatus(
      error
        ? { error: error.message }
        : { success: 'Si existe una cuenta con ese correo, recibirás un enlace de recuperación.' },
    )
  }

  return (
    <section className="auth-layout">
      <div className="welcome-panel">
        <span className="kicker">Centro de Salud Santo Domingo Savio I</span>
        <h1>Tu voz también cuida.</h1>
        <p>
          Radica, consulta y recibe respuesta a tus peticiones, quejas y reclamos en un
          solo lugar.
        </p>
        <div className="feature-list">
          <span>✓ Atención ágil y segura</span>
          <span>✓ Seguimiento claro de cada caso</span>
          <span>✓ Comunicación directa con la institución</span>
        </div>
      </div>

      <div className="auth-card">
        <div className="switcher">
          <button
            type="button"
            className={view === 'login' ? 'active' : ''}
            onClick={() => {
              setView('login')
              setStatus(null)
            }}
          >
            Inicio de sesión
          </button>
          <button
            type="button"
            className={view === 'signup' ? 'active' : ''}
            onClick={() => {
              setView('signup')
              setStatus(null)
            }}
          >
            Registrarse
          </button>
        </div>

        {status && (
          <div className={`alert ${status.error ? 'alert-error' : 'alert-success'}`}>
            <span>{status.error || status.success}</span>
            <button type="button" onClick={() => setStatus(null)} aria-label="Cerrar alerta">
              ×
            </button>
          </div>
        )}

        {view === 'login' ? (
          <form className="form-stack" onSubmit={handleSubmit}>
            <h2>Inicio de sesión</h2>
            <p className="muted">Accede con tu correo electrónico y contraseña.</p>

            <label htmlFor="login-email">
              Correo electrónico
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={loginForm.email}
                onChange={updateLogin('email')}
                placeholder="correo@ejemplo.com"
                required
              />
            </label>

            <label htmlFor="login-password">
              Contraseña
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={updateLogin('password')}
                placeholder="••••••••"
                required
              />
            </label>

            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Procesando...' : 'Iniciar sesión'}
            </button>

            <button type="button" className="text-button" onClick={handleRecover}>
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        ) : (
          <form className="form-stack" onSubmit={handleSubmit}>
            <h2>Registrarse</h2>
            <p className="muted">Completa tus datos para crear tu cuenta.</p>

            <label htmlFor="documentType">
              Tipo de documento
              <select
                id="documentType"
                name="documentType"
                value={signupForm.documentType}
                onChange={updateSignup('documentType')}
                required
              >
                {DOCUMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="documentNumber">
              Número de documento
              <input
                id="documentNumber"
                name="documentNumber"
                type="text"
                value={signupForm.documentNumber}
                onChange={updateSignup('documentNumber')}
                placeholder="1234567890"
                required
              />
            </label>

            <label htmlFor="firstName">
              Nombre
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                value={signupForm.firstName}
                onChange={updateSignup('firstName')}
                placeholder="Tu nombre"
                required
              />
            </label>

            <label htmlFor="lastName">
              Apellido
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                value={signupForm.lastName}
                onChange={updateSignup('lastName')}
                placeholder="Tu apellido"
                required
              />
            </label>

            <label htmlFor="signup-email">
              Correo
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                value={signupForm.email}
                onChange={updateSignup('email')}
                placeholder="correo@ejemplo.com"
                required
              />
            </label>

            <label htmlFor="phone">
              Teléfono
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={signupForm.phone}
                onChange={updateSignup('phone')}
                placeholder="3001234567"
                required
              />
            </label>

            <label htmlFor="address">
              Dirección
              <input
                id="address"
                name="address"
                type="text"
                autoComplete="street-address"
                value={signupForm.address}
                onChange={updateSignup('address')}
                placeholder="Calle 123 # 45-67"
                required
              />
            </label>

            <label htmlFor="signup-password">
              Contraseña
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={signupForm.password}
                onChange={updateSignup('password')}
                placeholder="Mínimo 8 caracteres"
                required
              />
            </label>

            <label htmlFor="confirmPassword">
              Confirmar contraseña
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={signupForm.confirmPassword}
                onChange={updateSignup('confirmPassword')}
                placeholder="Repite tu contraseña"
                required
              />
            </label>

            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
