import { useEffect, useState } from 'react'
import { getAppUrl, supabase } from './supabaseClient'
import { DOCUMENT_OPTIONS, normalizeAddress, normalizeEmail, normalizeName, normalizePhone, validateAddress, validateDocument, validateEmail, validateName, validatePassword, validatePhone } from './validators'

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
  accountType: 'user',
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

export default function Login({ recovering = false, onRecoveryStart = () => {}, onRecoveryDone = () => {}, onHold = () => {}, onRelease = () => {} }) {
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
  const [wantsAdmin, setWantsAdmin] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [institutionCode, setInstitutionCode] = useState('')
  const [touched, setTouched] = useState({})
  const [rejected, setRejected] = useState({})

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

  // Texto de "No válido" que se muestra bajo cada campo.
  const fieldRules = {
    'login-email': [loginForm.email, () => validateEmail(loginForm.email)],
    'recover-email': [recoverEmail, () => validateEmail(recoverEmail)],
    'recover-code-email': [recoverEmail, () => validateEmail(recoverEmail)],
    'recover-code': [recoverCode, () => (/^\d{8}$/.test(recoverCode) ? '' : 'El código tiene 8 dígitos.')],
    'verification-code': [verificationCode, () => (/^\d{8}$/.test(verificationCode) ? '' : 'El código tiene 8 dígitos.')],
    'institution-code': [institutionCode, () => (institutionCode.trim().length >= 6 ? '' : 'El código de la institución tiene al menos 6 caracteres.')],
    'new-password': [newPassword, () => validatePassword(newPassword, { email: recoverEmail })],
    'confirm-new-password': [confirmNewPassword, () => (confirmNewPassword !== newPassword ? 'Las contraseñas no coinciden.' : '')],
    documentNumber: [signupForm.documentNumber, () => validateDocument(signupForm.documentType, signupForm.documentNumber)],
    firstName: [signupForm.firstName, () => validateName('nombre', signupForm.firstName)],
    lastName: [signupForm.lastName, () => validateName('apellido', signupForm.lastName)],
    'signup-email': [signupForm.email, () => validateEmail(signupForm.email)],
    phone: [signupForm.phone, () => validatePhone(signupForm.phone)],
    address: [signupForm.address, () => validateAddress(signupForm.address)],
    'signup-password': [signupForm.password, () => validatePassword(signupForm.password, { email: signupForm.email, documentNumber: signupForm.documentNumber })],
    confirmPassword: [signupForm.confirmPassword, () => (signupForm.confirmPassword !== signupForm.password ? 'Las contraseñas no coinciden.' : '')],
  }

  const shownError = (id) => {
    const rule = fieldRules[id]
    if (!rule) return ''
    if (rejected[id]) return rejected[id]
    const [value, validate] = rule
    const text = String(value || '')
    if (!text.trim()) return ''
    if (!touched[id] && text.length < 8) return ''
    return validate()
  }

  const hint = (id) => {
    const message = shownError(id)
    return message ? <small className="field-error" role="alert">No válido: {message}</small> : null
  }

  const touch = (id) => {
    setTouched((current) => ({ ...current, [id]: true }))
    setRejected((current) => ({ ...current, [id]: '' }))
  }

  const cleanInput = (id, setter, clean, message) => (event) => {
    const raw = event.target.value
    const cleaned = clean(raw)
    setRejected((current) => ({ ...current, [id]: cleaned !== raw ? message : '' }))
    setter(cleaned)
  }

  const updateSignup = (field, clean = (value) => value, rejectMessage = '') => (event) => {
    const raw = event.target.value
    const cleaned = clean(raw)
    setRejected((current) => ({ ...current, [field === 'email' ? 'signup-email' : field === 'password' ? 'signup-password' : field]: cleaned !== raw ? rejectMessage : '' }))
    setSignupForm({ ...signupForm, [field]: cleaned })
  }

  const signupSteps = [
    { title: 'Documento', description: 'Identifícate para crear tu cuenta.' },
    { title: 'Datos personales', description: 'Cuéntanos cómo te llamas.' },
    { title: 'Contacto', description: 'Indica cómo podemos comunicarnos contigo.' },
    { title: 'Seguridad', description: 'Protege el acceso a tu cuenta.' },
  ]

  const stepError = (step) => {
    if (step === 1) return validateDocument(signupForm.documentType, signupForm.documentNumber)
    if (step === 2) return validateName('nombre', signupForm.firstName) || validateName('apellido', signupForm.lastName)
    if (step === 3) return validateEmail(signupForm.email) || validatePhone(signupForm.phone) || validateAddress(signupForm.address)
    return validatePassword(signupForm.password, { email: signupForm.email, documentNumber: signupForm.documentNumber })
      || (signupForm.password !== signupForm.confirmPassword ? 'Las contraseñas no coinciden.' : '')
  }

  const nextSignupStep = () => {
    const message = stepError(signupStep)
    if (message) {
      setStatus({ error: message })
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
        if (error.code === 'email_not_confirmed' || /not confirmed/i.test(String(error.message))) {
          // Cuenta creada pero sin verificar: pedimos el código en lugar de mostrar un error genérico.
          setVerificationEmail(email)
          setVerificationCode('')
          setInstitutionCode('')
          setEmailVerified(false)
          setWantsAdmin(false)
          setView('verify')
          const { error: resendError } = await supabase.auth.resend({ type: 'signup', email })
          const waiting = resendError && /after (\d+) seconds?/i.test(String(resendError.message))
          if (resendError && !waiting) setStatus({ error: friendlyError(resendError) })
          else setStatus({ success: waiting ? 'Tu correo aún no está verificado. Ya te enviamos un código hace poco: escríbelo aquí.' : 'Tu correo aún no está verificado. Te enviamos un código: escríbelo aquí.' })
          return
        }
        setStatus({ error: 'No pudimos iniciar sesión. Revisa tu correo y contraseña.' })
        return
      }

      setStatus({ success: 'Inicio de sesión correcto.' })
      return
    }

    for (let step = 1; step <= signupSteps.length; step += 1) {
      const message = stepError(step)
      if (message) {
        setSignupStep(step)
        setStatus({ error: message })
        return
      }
    }

    const firstName = normalizeName(signupForm.firstName)
    const lastName = normalizeName(signupForm.lastName)
    const email = normalizeEmail(signupForm.email)
    const documentNumber = signupForm.documentNumber.trim()
    const phone = normalizePhone(signupForm.phone)
    const address = normalizeAddress(signupForm.address)
    const isAdminSignup = signupForm.accountType === 'admin'

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
      setInstitutionCode('')
      setEmailVerified(false)
      setWantsAdmin(isAdminSignup)
      setView('verify')
      setStatus({ success: 'Te enviamos un código a tu correo.' })
      return
    }

    setStatus({ success: 'Cuenta creada correctamente.' })
  }

  const handleVerify = async (event) => {
    event.preventDefault()
    if (!supabase) return

    const token = verificationCode.trim()
    const institution = institutionCode.trim()

    if (!emailVerified && !/^\d{8}$/.test(token)) {
      setStatus({ error: 'Escribe el código de 8 dígitos que recibiste por correo.' })
      return
    }
    if (wantsAdmin && institution.length < 6) {
      setStatus({ error: 'Escribe el código de la institución para activar tu cuenta de administrador.' })
      return
    }

    setBusy(true)
    if (!emailVerified) {
      onHold()
      const { data, error } = await supabase.auth.verifyOtp({
        email: verificationEmail.trim(),
        token,
        type: 'signup',
      })
      if (error || !data.session) {
        setBusy(false)
        onRelease()
        setStatus({ error: error ? friendlyError(error) : 'No pudimos verificar el código. Solicita uno nuevo e inténtalo otra vez.' })
        return
      }
      setEmailVerified(true)
    }

    if (wantsAdmin) {
      const { data: granted, error: rpcError } = await supabase.rpc('redeem_admin_code', { p_code: institution })
      if (rpcError || granted !== true) {
        setBusy(false)
        setStatus({ error: String(rpcError?.message || '').includes('too_many_attempts')
          ? 'Demasiados intentos con el código de la institución. Espera una hora e inténtalo de nuevo.'
          : 'El código de la institución no es correcto. Verifícalo e inténtalo de nuevo.' })
        return
      }
      await supabase.auth.refreshSession()
    }

    setBusy(false)
    setSignupForm(initialSignupForm)
    setSignupStep(1)
    onRelease(wantsAdmin ? 'Cuenta de administrador confirmada. ¡Bienvenido!' : 'Correo confirmado. ¡Bienvenido!')
  }

  const continueAsUser = () => {
    setWantsAdmin(false)
    setSignupForm(initialSignupForm)
    setSignupStep(1)
    onRelease('Correo confirmado. Entraste como usuario.')
  }

  const resendVerificationCode = async () => {
    if (!supabase || !verificationEmail) return
    setBusy(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email: verificationEmail })
    setBusy(false)
    if (!error) setCooldown(60)
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
        <span className="orb orb-a" aria-hidden="true" />
        <span className="orb orb-b" aria-hidden="true" />
        <svg className="welcome-cross" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M38 6h24v32h32v24H62v32H38V62H6V38h32z" />
        </svg>

        <div className="panel-brand">
          <span className="panel-brand-icon" aria-hidden="true">✚</span>
          <span className="panel-brand-text"><strong>Sistema PQR</strong><small>(Peticiones, Quejas y Reclamos)</small></span>
          <span className="version-badge" title="Versión publicada de la página">v{String(__APP_VERSION__).split(' ')[0]}</span>
        </div>

        <span className="kicker">Centro de Salud Santo Domingo Savio I</span>
        <h1>Tu voz también cuida.</h1>
        <p>
          Radica, consulta y recibe respuesta a tus peticiones, quejas y reclamos en un
          solo lugar.
        </p>

        <div className="feature-list">
          <span><i aria-hidden="true">✓</i> Atención ágil y segura</span>
          <span><i aria-hidden="true">✓</i> Seguimiento claro de cada caso</span>
          <span><i aria-hidden="true">✓</i> Comunicación directa con la institución</span>
        </div>

        <ol className="process-card" aria-label="Cómo funciona">
          <li><b>1</b><span>Radica tu PQR</span></li>
          <li><b>2</b><span>La revisamos</span></li>
          <li><b>3</b><span>Recibes respuesta</span></li>
        </ol>

        <svg className="pulse-line" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="0,30 110,30 135,30 150,8 168,52 186,18 200,30 400,30" />
        </svg>

        <p className="panel-footer">Centro de Salud Santo Domingo Savio I · Sistema de peticiones, quejas y reclamos<small>Versión {__APP_VERSION__}</small></p>
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
                aria-invalid={Boolean(shownError('login-email'))}
                onBlur={() => touch('login-email')}
              />
              {hint('login-email')}
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

            <button type="button" className="btn btn-secondary forgot-button" onClick={() => { setRecoverEmail(loginForm.email); setStatus(null); setView('recover') }}>
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
                aria-invalid={Boolean(shownError('recover-email'))}
                onBlur={() => touch('recover-email')}
              />
              {hint('recover-email')}
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
            <p className="muted">Escribe tu correo y el código que te enviamos para crear una nueva contraseña.</p>
            <div className="code-hint">
              <strong>¿Dónde está mi código?</strong>
              <span>Busca un correo de <b>PQR Salud</b> con el asunto «Tu código para recuperar la contraseña». Si no lo ves, revisa <b>Spam</b> y <b>Promociones</b>. Si pediste varios, usa el último.</span>
            </div>
            <label htmlFor="recover-code-email">
              Correo electrónico
              <input
                id="recover-code-email"
                name="recoverCodeEmail"
                type="email"
                autoComplete="email"
                value={recoverEmail}
                onChange={(event) => setRecoverEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
                required
                aria-invalid={Boolean(shownError('recover-code-email'))}
                onBlur={() => touch('recover-code-email')}
              />
              {hint('recover-code-email')}
            </label>
            <label htmlFor="recover-code">
              Código de recuperación
              <input
                id="recover-code"
                name="recoverCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={recoverCode}
                onChange={cleanInput('recover-code', setRecoverCode, (value) => value.replace(/\D/g, '').slice(0, 8), 'Solo números (8 dígitos).')}
                placeholder="12345678"
                required
                aria-invalid={Boolean(shownError('recover-code'))}
                onBlur={() => touch('recover-code')}
              />
              {hint('recover-code')}
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
                aria-invalid={Boolean(shownError('new-password'))}
                onBlur={() => touch('new-password')}
              />
              {hint('new-password')}
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
                aria-invalid={Boolean(shownError('confirm-new-password'))}
                onBlur={() => touch('confirm-new-password')}
              />
              {hint('confirm-new-password')}
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
            {!emailVerified ? (
              <>
                <h2>Introduce el código que te llegó al correo</h2>
                <p className="muted">Enviamos un código de 8 dígitos a <strong>{verificationEmail}</strong>.</p>
                <div className="code-hint">
                  <strong>¿No lo ves?</strong>
                  <span>Busca un correo de <b>PQR Salud</b> y revisa <b>Spam</b> y <b>Promociones</b>. Si pediste varios, usa el último.</span>
                </div>
                <label htmlFor="verification-code">
                  Código del correo
                  <input
                    id="verification-code"
                    name="verificationCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                        value={verificationCode}
                    onChange={cleanInput('verification-code', setVerificationCode, (value) => value.replace(/\D/g, '').slice(0, 8), 'Solo números (8 dígitos).')}
                    placeholder="12345678"
                    required
                    aria-invalid={Boolean(shownError('verification-code'))}
                    onBlur={() => touch('verification-code')}
                  />
                  {hint('verification-code')}
                </label>
                <label className="check-row" htmlFor="wants-admin">
                  <input id="wants-admin" type="checkbox" checked={wantsAdmin} onChange={(event) => setWantsAdmin(event.target.checked)} />
                  <span>Soy administrador (tengo el código de la institución)</span>
                </label>
              </>
            ) : (
              <>
                <h2>Código de la institución</h2>
                <p className="muted">Tu correo ya está confirmado. Falta el código de la institución para activar tu cuenta de administrador.</p>
              </>
            )}

            {wantsAdmin && (
              <label htmlFor="institution-code">
                Código de la institución
                <input
                  id="institution-code"
                  name="institutionCode"
                  type="password"
                  autoComplete="off"
                  value={institutionCode}
                  onChange={(event) => setInstitutionCode(event.target.value)}
                  placeholder="Código entregado por la institución"
                  required
                  aria-invalid={Boolean(shownError('institution-code'))}
                  onBlur={() => touch('institution-code')}
                />
                {hint('institution-code')}
              </label>
            )}

            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Confirmando...' : 'Confirmar'}
            </button>
            {!emailVerified ? (
              <>
                <button type="button" className="text-button" disabled={busy || cooldown > 0} onClick={resendVerificationCode}>
                  {cooldown > 0 ? `Reenviar código (${cooldown} s)` : 'Reenviar código'}
                </button>
                <button type="button" className="text-button" onClick={() => { setView('signup'); setStatus(null) }}>
                  Volver al registro
                </button>
              </>
            ) : (
              <button type="button" className="text-button" onClick={continueAsUser}>
                Continuar como usuario
              </button>
            )}
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

            {signupStep === 1 && <><div className="account-type-box">
              <label htmlFor="accountType">
                Tipo de cuenta
                <select id="accountType" name="accountType" value={signupForm.accountType} onChange={updateSignup('accountType')}>
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
              {signupForm.accountType === 'admin' && (
                <p className="muted account-note">Al confirmar tu correo te pediremos el <b>código de la institución</b>.</p>
              )}
            </div>

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
                onChange={updateSignup('documentNumber', (value) => value.replace(/\D/g, '').slice(0, 11), 'Solo números, sin puntos ni letras (máximo 11 dígitos).')}
                inputMode="numeric"
                autoComplete="off"
                placeholder={DOCUMENT_OPTIONS.find((option) => option.value === signupForm.documentType)?.placeholder || '1012345678'}
                required
                aria-invalid={Boolean(shownError('documentNumber'))}
                onBlur={() => touch('documentNumber')}
              />
              {hint('documentNumber')}
            </label></>}

            {signupStep === 2 && <><label htmlFor="firstName">
              Nombre
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                value={signupForm.firstName}
                onChange={updateSignup('firstName', (value) => value.replace(/[^\p{L}\s'’-]/gu, '').slice(0, 40), 'Solo letras, sin números ni símbolos.')}
                placeholder="Tu nombre"
                required
                aria-invalid={Boolean(shownError('firstName'))}
                onBlur={() => touch('firstName')}
              />
              {hint('firstName')}
            </label>

            <label htmlFor="lastName">
              Apellido
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                value={signupForm.lastName}
                onChange={updateSignup('lastName', (value) => value.replace(/[^\p{L}\s'’-]/gu, '').slice(0, 40), 'Solo letras, sin números ni símbolos.')}
                placeholder="Tu apellido"
                required
                aria-invalid={Boolean(shownError('lastName'))}
                onBlur={() => touch('lastName')}
              />
              {hint('lastName')}
            </label></>}

            {signupStep === 3 && <><label htmlFor="signup-email">
              Correo
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                value={signupForm.email}
                onChange={updateSignup('email', (value) => value.replace(/\s/g, '').slice(0, 80), 'Los correos no llevan espacios.')}
                placeholder="correo@ejemplo.com"
                required
                aria-invalid={Boolean(shownError('signup-email'))}
                onBlur={() => touch('signup-email')}
              />
              {hint('signup-email')}
            </label>

            <label htmlFor="phone">
              Teléfono
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={signupForm.phone}
                onChange={updateSignup('phone', (value) => value.replace(/[^\d+\s]/g, '').slice(0, 16), 'Solo números (puedes empezar con +57).')}
                inputMode="tel"
                placeholder="3001234567"
                required
                aria-invalid={Boolean(shownError('phone'))}
                onBlur={() => touch('phone')}
              />
              {hint('phone')}
            </label>

            <label htmlFor="address">
              Dirección
              <input
                id="address"
                name="address"
                type="text"
                autoComplete="street-address"
                value={signupForm.address}
                onChange={updateSignup('address', (value) => value.slice(0, 120), 'Máximo 120 caracteres.')}
                placeholder="Calle 123 # 45-67"
                required
                aria-invalid={Boolean(shownError('address'))}
                onBlur={() => touch('address')}
              />
              {hint('address')}
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
                aria-invalid={Boolean(shownError('signup-password'))}
                onBlur={() => touch('signup-password')}
              />
              {hint('signup-password')}
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
                aria-invalid={Boolean(shownError('confirmPassword'))}
                onBlur={() => touch('confirmPassword')}
              />
              {hint('confirmPassword')}
            </label>
</>}

            <div className="step-actions">
              {signupStep > 1 && <button type="button" className="btn btn-ghost" onClick={() => { setStatus(null); setSignupStep((step) => step - 1) }}>Anterior</button>}
              {signupStep < signupSteps.length ? (
                <button type="button" className="btn btn-primary" onClick={nextSignupStep}>Siguiente</button>
              ) : (
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creando cuenta...' : 'Crear cuenta'}</button>
              )}
            </div>

            <button
              type="button"
              className="btn btn-secondary forgot-button"
              onClick={() => { setRecoverEmail(signupForm.email.trim()); setStatus(null); setView('recover') }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

