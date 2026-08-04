
import { useState } from 'react'
import { supabase } from './supabaseClient'

function Login({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setIsError(false)

    if (!supabase) {
      setMessage('Supabase no está configurado. Revisa las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.')
      setIsError(true)
      setLoading(false)
      return
    }

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
          setMessage(error.message || 'No se pudo iniciar sesión.')
          setIsError(true)
          return
        }

        onLogin?.(data.session)
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        })

        if (error) {
          setMessage(error.message || 'No se pudo crear la cuenta.')
          setIsError(true)
          return
        }

        if (data.session) {
          onLogin?.(data.session)
        } else {
          setMessage('Cuenta creada. Revisa tu correo para confirmar la cuenta.')
          setIsError(false)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h2 className="h4 mb-1">Centro de Salud PQR</h2>
                  <p className="text-muted mb-0">
                    {mode === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
                  </p>
                </div>
              </div>

              <div className="btn-group w-100 mb-4" role="group" aria-label="Modo de autenticación">
                <button
                  type="button"
                  className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => {
                    setMode('login')
                    setMessage('')
                  }}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => {
                    setMode('register')
                    setMessage('')
                  }}
                >
                  Registrarse
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {mode === 'register' && (
                  <div className="mb-3">
                    <label htmlFor="fullName" className="form-label">Nombre completo</label>
                    <input
                      id="fullName"
                      className="form-control"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Juan Pérez"
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Correo electrónico</label>
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="usuario@ejemplo.com"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Contraseña</label>
                  <input
                    id="password"
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                {message && (
                  <div className={`alert ${isError ? 'alert-danger' : 'alert-success'} py-2`} role="alert">
                    {message}
                  </div>
                )}

                <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                  {loading ? 'Procesando...' : mode === 'login' ? 'Iniciar sesión' : 'Registrarme'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
