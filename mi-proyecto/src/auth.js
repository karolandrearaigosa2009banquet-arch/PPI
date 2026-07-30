import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''
const isConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_KEY &&
    !SUPABASE_URL.includes('your-project') &&
    !SUPABASE_KEY.includes('your-anon-public-key')
)

export const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_KEY) : null

function setElementVisible(element, visible) {
  if (!element) return

  element.classList.toggle('d-none', !visible)
}

export function updateUI(session) {
  const loggedOut = document.querySelector('#auth-logged-out')
  const loggedIn = document.querySelector('#auth-logged-in')
  const privateLinks = document.querySelectorAll('[data-private-nav="true"]')
  const welcomeButton = document.querySelector('#auth-logged-in .dropdown-toggle')

  const hasSession = Boolean(session?.user?.email)

  setElementVisible(loggedOut, !hasSession)
  setElementVisible(loggedIn, hasSession)

  privateLinks.forEach((link) => {
    setElementVisible(link, hasSession)
  })

  if (welcomeButton && hasSession) {
    welcomeButton.textContent = `Bienvenido, ${session.user.email}`
  }
}

function showMessage(selector, message, isError = true) {
  const messageBox = document.querySelector(selector)

  if (!messageBox) return

  messageBox.textContent = message
  messageBox.classList.remove('d-none')
  messageBox.classList.toggle('text-danger', isError)
  messageBox.classList.toggle('text-success', !isError)
}

function clearMessage(selector) {
  const messageBox = document.querySelector(selector)

  if (!messageBox) return

  messageBox.textContent = ''
  messageBox.classList.add('d-none')
  messageBox.classList.remove('text-danger', 'text-success')
}

export function initAuth() {
  updateUI(null)

  if (!supabase) {
    showMessage('#login-error', 'La autenticación de Supabase no está configurada. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env.')
    return () => {}
  }

  const { data: authData } = supabase.auth.onAuthStateChange((event, session) => {
    updateUI(session)
  })

  const loginButton = document.querySelector('#btn-do-login')
  const registerButton = document.querySelector('#btn-do-register')
  const logoutLink = document.querySelector('#auth-logged-in a[href="#logout"]')

  const handleLogin = async () => {
    clearMessage('#login-error')

    if (!supabase) {
      showMessage('#login-error', 'La autenticación de Supabase no está configurada. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env.')
      return
    }

    const email = document.querySelector('#login-email')?.value?.trim() ?? ''
    const password = document.querySelector('#login-password')?.value ?? ''

    if (!email || !password) {
      showMessage('#login-error', 'Por favor ingresa tu correo y contraseña.')
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      showMessage('#login-error', error.message || 'Credenciales inválidas. Intenta de nuevo.')
      return
    }

    updateUI(data.session)

    const modalElement = document.getElementById('loginModal')
    if (modalElement) {
      const modalInstance = window.bootstrap?.Modal.getOrCreateInstance(modalElement)
      modalInstance.hide()
    }
  }

  const handleRegister = async () => {
    clearMessage('#register-error')

    if (!supabase) {
      showMessage('#register-error', 'La autenticación de Supabase no está configurada. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env.')
      return
    }

    const fullName = document.querySelector('#register-name')?.value?.trim() ?? ''
    const email = document.querySelector('#register-email')?.value?.trim() ?? ''
    const password = document.querySelector('#register-password')?.value ?? ''

    if (!fullName || !email || !password) {
      showMessage('#register-error', 'Completa todos los campos para crear tu cuenta.')
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      showMessage('#register-error', error.message || 'No se pudo crear la cuenta.')
      return
    }

    if (data.session) {
      updateUI(data.session)
    } else {
      showMessage('#register-error', 'Cuenta creada. Revisa tu correo para confirmar la cuenta.', false)
    }

    const modalElement = document.getElementById('registerModal')
    if (modalElement) {
      const modalInstance = window.bootstrap?.Modal.getOrCreateInstance(modalElement)
      modalInstance.hide()
    }
  }

  const handleLogout = async (event) => {
    event.preventDefault()

    if (!supabase) {
      showMessage('#login-error', 'La autenticación de Supabase no está configurada. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env.')
      return
    }

    await supabase.auth.signOut()
  }

  loginButton?.addEventListener('click', handleLogin)
  registerButton?.addEventListener('click', handleRegister)
  logoutLink?.addEventListener('click', handleLogout)

  supabase.auth.getSession().then(({ data }) => {
    updateUI(data.session)
  })

  return () => {
    authData.subscription.unsubscribe()
    loginButton?.removeEventListener('click', handleLogin)
    registerButton?.removeEventListener('click', handleRegister)
    logoutLink?.removeEventListener('click', handleLogout)
  }
}
