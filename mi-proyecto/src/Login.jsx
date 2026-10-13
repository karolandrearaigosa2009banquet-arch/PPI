import { useEffect, useState } from 'react'
import { getAppUrl, supabase } from './supabaseClient'

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

function friendlyError(error) {
  const message = String(error?.message || '')
  const code = error?.code || ''
  const wait = message.match(/after (\d+) seconds?/i)

  if (code === 'over_email_send_rate_limit' || error?.status === 429 || wait) {
    return `Por seguridad, espera ${wait ? wait[1] : 60} segundos antes de pedir otro código.`
  }
  if (code === 'user_already_exists' || /already registered/i.test(message)) {
    return 'Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.'
  }
  if (code === 'otp_expired' || /expired or is invalid|invalid.*token/i.test(message)) {
    return 'El código no es válido o ya venció. Solicita uno nuevo.'
  }
  if (code === 'same_password' || /different from the old password/i.test(message)) {
    return 'La nueva contraseña debe ser diferente a la anterior.'
  }
  if (code === 'weak_password' || /password should be/i.test(message)) {
    return 'La contraseña es muy débil. Usa mínimo 8 caracteres.'
  }
  if (/rate limit/i.test(message)) {
    return 'Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.'
  }
  return 'No pudimos completar la acción. Inténtalo de nuevo en unos minutos.'
}

export default function Login({ recovering = false, onRecoveryStart = () => {}, onRecoveryDone = () => {} }) {
  const [view, setView] = useState('login')
  const [signupStep, setSignupStep] = useState(1)
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [signupForm, setSignupForm] = useState(initialSignupForm)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [recoverEmail, setRecoverEmail] = useState('')
  const [recoverCode, setRecoverCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  // Si el usuario llega desde el enlace del correo de recuperación, pedimos la nueva contraseña.
  useEffect(() => {
    if (recovering) setView('reset')
  }, [recovering])

  const updateLogin = (field) => (event) => {
    setLoginForm({ ...loginForm, [field]: event.target.value })
  }

  const updateSignup = (field) => (event) => {
    setSignupForm({ ...signupForm, [field]: event.target.value })
  }

  const signupSteps = [
    { title: 'Documento', description: 'Identifícate para crear tu cuenta.' },
    { title: 'Datos personales', description: 'Cuéntanos cómo te llamas.' },
    { title: 'Contacto', description: 'Indica cómo podemos comunicarnos contigo.' },
    { title: 'Seguridad', description: 'Protege el acceso a tu cuenta.' },
  ]

  const canContinue = () => {
    if (signupStep === 1) return Boolean(signupForm.documentType && signupForm.documentNumber.trim())
    if (signupStep === 2) return Boolean(signupForm.firstName.trim() && signupForm.lastName.trim())
    if (signupStep === 3) return Boolean(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupForm.email.trim())
      && /^\d{7,15}$/.test(signupForm.phone.replace(/\D/g, ''))
      && signupForm.address.trim(),
    )
    return signupForm.password.length >= 8 && signupForm.password === signupForm.confirmPassword
  }

  const nextSignupStep = () => {
    if (!canContinue()) {
      setStatus({ error: 'Completa correctamente los campos de este paso antes de continuar.' })
      return
    }
    setStatus(null)
    setSignupStep((step) => Math.min(step + 1, signupSteps.length))
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
      setStatus({ error: friendlyError(error) })
      return
    }

    // Supabase responde "ok" sin enviar correo cuando el correo ya está registrado.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setStatus({ error: 'Este correo ya tiene una cuenta. Inicia sesión o usa "¿Olvidaste tu contraseña?".' })
      return
    }

    if (!data.session) {
      setVerificationEmail(email)
      setVerificationCode('')
      setView('verify')
      setStatus({ success: 'Te enviamos un código de verificación a tu correo.' })
      return
    }

    setStatus({ success: 'Cuenta creada correctamente.' })
  }

  const handleVerify = async (event) => {
    event.preventDefault()
    if (!supabase) return

    const token = verificationCode.trim()
    if (!/^\d{8}$/.test(token)) {
      setStatus({ error: 'Escribe el código de 8 dígitos que recibiste por correo.' })
      return
    }

    setBusy(true)
    const { data, error } = await supabase.auth.verifyOtp({
      email: verificationEmail,
      token,
      type: 'signup',
    })
    setBusy(false)

    if (error || !data.session) {
      setStatus({ error: error ? friendlyError(error) : 'No pudimos verificar el código. Solicita uno nuevo e inténtalo otra vez.' })
      return
    }

    setStatus({ success: 'Correo verificado. Ya puedes enviar tu PQR.' })
    setSignupForm(initialSignupForm)
  }

  const resendVerificationCode = async () => {
    if (!supabase || !verificationEmail) return
    setBusy(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email: verificationEmail })
    setBusy(false)
    setStatus(error ? { error: friendlyError(error) } : { success: 'Enviamos un nuevo código a tu correo.' })
  }

  const sendRecoveryCode = async () => {
    const email = recoverEmail.trim()
    if (!supabase) {
      setStatus({ error: 'La configuración de Supabase no está lista.' })
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus({ error: 'Escribe un correo válido para recibir el código.' })
      return false
    }

    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: getAppUrl() })
    setBusy(false)

    if (error) {
      const wait = String(error.message || '').match(/after (\d+) seconds?/i)
      if (wait) {
        // Ya se envió un código hace poco: dejamos escribirlo en lugar de bloquear al usuario.
        setCooldown(Number(wait[1]))
        setStatus({ success: `Ya te enviamos un código hace poco. Escríbelo aquí; si no lo encuentras, podrás pedir otro en ${wait[1]} segundos.` })
        return 'limited'
      }
      setStatus({ error: friendlyError(error) })
      return false
    }
    setCooldown(60)
    return 'sent'
  }

  const handleRecover = async (event) => {
    event.preventDefault()
    setStatus(null)
    const result = await sendRecoveryCode()
    if (!result) return
    setRecoverCode('')
    setView('recover-code')
    if (result === 'sent') {
      setStatus({ success: 'Si existe una cuenta con ese correo, te enviamos un código de recuperación. Revisa también la carpeta de spam.' })
    }
  }

  const resendRecoveryCode = async () => {
    setStatus(null)
    if ((await sendRecoveryCode()) === 'sent') setStatus({ success: 'Enviamos un nuevo código a tu correo.' })
  }

  const handleRecoverCode = async (event) => {
    event.preventDefault()
    if (!supabase) return

    const token = recoverCode.trim()
    if (!/^\d{6,8}$/.test(token)) {
      setStatus({ error: 'Escribe el código numérico que recibiste por correo.' })
      return
    }

    setBusy(true)
    onRecoveryStart()
    const { data, error } = await supabase.auth.verifyOtp({
      email: recoverEmail.trim(),
      token,
      type: 'recovery',
    })
    setBusy(false)

    if (error || !data.session) {
      onRecoveryDone()
      setStatus({ error: 'El código no es válido o ya venció. Solicita uno nuevo e inténtalo otra vez.' })
      return
    }

    setView('reset')
    setStatus({ success: 'Código correcto. Crea tu nueva contraseña.' })
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    if (!supabase) return

    if (newPassword.length < 8) {
      setStatus({ error: 'Usa una contraseña de mínimo 8 caracteres.' })
      return
    }
    if (newPassword !== confirmNewPassword) {
      setStatus({ error: 'Las contraseñas no coinciden.' })
      return
    }

    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setBusy(false)

    if (error) {
      setStatus({ error: friendlyError(error) })
      return
    }

    setNewPassword('')
    setConfirmNewPassword('')
    setRecoverCode('')
    setView('login')
    onRecoveryDone('Contraseña actualizada correctamente.')
  }

  const cancelRecovery = async () => {
    if (supabase) await supabase.auth.signOut()
    setNewPassword('')
    setConfirmNewPassword('')
    setStatus(null)
    setView('login')
    onRecoveryDone()
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
              setSignupStep(1)
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

            <button type="button" className="text-button" onClick={() => { setRecoverEmail(loginForm.email); setStatus(null); setView('recover') }}>
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        ) : view === 'recover' ? (
          <form className="form-stack" onSubmit={handleRecover}>
            <h2>Recupera tu cuenta</h2>
            <p className="muted">Escribe tu correo y te enviaremos un código para crear una nueva contraseña.</p>
            <label htmlFor="recover-email">
              Correo electrónico
              <input
                id="recover-email"
                name="recoverEmail"
                type="email"
                autoComplete="email"
                value={recoverEmail}
                onChange={(event) => setRecoverEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
                required
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={busy || cooldown > 0}>
              {busy ? 'Enviando...' : cooldown > 0 ? `Espera ${cooldown} s` : 'Enviar código'}
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoverEmail.trim())) {
                  setStatus({ error: 'Escribe tu correo para poder ingresar el código.' })
                  return
                }
                setStatus(null)
                setRecoverCode('')
                setView('recover-code')
              }}
            >
              Ya tengo un código
            </button>
            <button type="button" className="text-button" onClick={() => { setView('login'); setStatus(null) }}>
              Volver al inicio de sesión
            </button>
          </form>
        ) : view === 'recover-code' ? (
          <form className="form-stack" onSubmit={handleRecoverCode}>
            <h2>Código de recuperación</h2>
            <p className="muted">Escribe el código enviado a <strong>{recoverEmail}</strong>.</p>
            <label htmlFor="recover-code">
              Código de recuperación
              <input
                id="recover-code"
                name="recoverCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength="8"
                value={recoverCode}
                onChange={(event) => setRecoverCode(event.target.value.replace(/\D/g, ''))}
                placeholder="12345678"
                required
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Verificando...' : 'Verificar código'}
            </button>
            <button type="button" className="text-button" disabled={busy || cooldown > 0} onClick={resendRecoveryCode}>
              {cooldown > 0 ? `Reenviar código (${cooldown} s)` : 'Reenviar código'}
            </button>
            <button type="button" className="text-button" onClick={() => { setView('recover'); setStatus(null) }}>
              Cambiar correo
            </button>
          </form>
        ) : view === 'reset' ? (
          <form className="form-stack" onSubmit={handleResetPassword}>
            <h2>Nueva contraseña</h2>
            <p className="muted">Crea una contraseña nueva para tu cuenta.</p>
            <label htmlFor="new-password">
              Nueva contraseña
              <input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
              />
            </label>
            <label htmlFor="confirm-new-password">
              Confirmar nueva contraseña
              <input
                id="confirm-new-password"
                name="confirmNewPassword"
                type="password"
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                placeholder="Repite tu contraseña"
                required
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Guardando...' : 'Guardar contraseña'}
            </button>
            <button type="button" className="text-button" onClick={cancelRecovery}>
              Cancelar
            </button>
          </form>
        ) : view === 'verify' ? (
          <form className="form-stack" onSubmit={handleVerify}>
            <h2>Verifica tu correo</h2>
            <p className="muted">Escribe el código de 8 dígitos enviado a <strong>{verificationEmail}</strong>. Al verificarlo entrarás directamente a enviar tu PQR.</p>
            <label htmlFor="verification-code">
              Código de verificación
              <input
                id="verification-code"
                name="verificationCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength="8"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))}
                placeholder="12345678"
                required
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Verificando...' : 'Verificar y continuar'}
            </button>
            <button type="button" className="text-button" disabled={busy} onClick={resendVerificationCode}>
              Reenviar código
            </button>
            <button type="button" className="text-button" onClick={() => { setView('signup'); setStatus(null) }}>
              Volver al registro
            </button>
          </form>
        ) : (
          <form className="form-stack" onSubmit={handleSubmit}>
            <h2>Registrarse</h2>
            <p className="muted">Completa tus datos paso a paso para crear tu cuenta.</p>

            <ol className="signup-progress" aria-label="Progreso del registro">
              {signupSteps.map((step, index) => (
                <li key={step.title} className={signupStep === index + 1 ? 'active' : signupStep > index + 1 ? 'complete' : ''}>
                  <span>{index + 1}</span>{step.title}
                </li>
              ))}
            </ol>
            <p className="step-description">Paso {signupStep} de {signupSteps.length}: {signupSteps[signupStep - 1].description}</p>

            {signupStep === 1 && <><label htmlFor="documentType">
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
            </label></>}

            {signupStep === 2 && <><label htmlFor="firstName">
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
            </label></>}

            {signupStep === 3 && <><label htmlFor="signup-email">
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
            </label></>}

            {signupStep === 4 && <><label htmlFor="signup-password">
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
            </label></>}

            <div className="step-actions">
              {signupStep > 1 && <button type="button" className="btn btn-ghost" onClick={() => { setStatus(null); setSignupStep((step) => step - 1) }}>Anterior</button>}
              {signupStep < signupSteps.length ? (
                <button type="button" className="btn btn-primary" onClick={nextSignupStep}>Siguiente</button>
              ) : (
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creando cuenta...' : 'Crear cuenta'}</button>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

