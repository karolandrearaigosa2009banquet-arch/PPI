import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import Productos from './Productos'
import './index.css'

function App() {
  const [sesion, setSesion] = useState(null)
  const [perfilUsuario, setPerfilUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const verificarSesion = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSesion(session)
        if (session?.user?.id) {
          await obtenerPerfilUsuario(session.user.id)
        }
      } catch (error) {
        console.error('Error al obtener sesión:', error)
      } finally {
        setCargando(false)
      }
    }

    verificarSesion()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSesion(session)
      if (session?.user?.id) {
        await obtenerPerfilUsuario(session.user.id)
      } else {
        setPerfilUsuario(null)
      }
    })

    return () => listener?.subscription?.unsubscribe()
  }, [])

  const obtenerPerfilUsuario = async (idUsuario) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', idUsuario)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error al obtener perfil:', error)
        return
      }

      setPerfilUsuario(data || null)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const cerrarSesion = async () => {
    try {
      await supabase.auth.signOut()
      setSesion(null)
      setPerfilUsuario(null)
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  const LogoApp = () => (
    <div className="app-logo">
      <div className="circle-outer">
        <div className="circle-middle">
          <div className="circle-inner">
            <svg className="icon-caduceus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20" />
              <path d="M12 4c-4 1-6 3-6 5.5S10 13 12 14c2-1 6-2 6-4.5S16 5 12 4z" />
              <path d="M12 8c-4 1-6 3-6 5.5S10 17 12 18c2-1 6-2 6-4.5S16 9 12 8z" />
              <circle cx="12" cy="2" r="1" fill="currentColor" />
              <path d="M8 3.5c2 0 4 .5 4 2" />
              <path d="M16 3.5c-2 0-4 .5-4 2" />
            </svg>
            <div className="circle-title">REGISTRO<br />DE PQR</div>
            <div className="divider"></div>
          </div>
        </div>
      </div>
      <div className="bottom-text">PETICIONES, QUEJAS & RECLAMOS</div>
    </div>
  )

  if (cargando) {
    return <div className="app-shell"><div className="app-main"><p>Cargando...</p></div></div>
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <LogoApp />
          <div className="brand-text">
            <h1>Centro de Salud Santo Domingo Savio 1</h1>
            <p className="subtitle">Sistema de PQR para atención ciudadana</p>
          </div>
        </div>
        <div className="header-actions">
          {sesion && perfilUsuario ? (
            <>
              <span className="user-badge">{perfilUsuario.full_name}</span>
              <span className="role-badge">{perfilUsuario.role === 'admin' ? 'Administrador' : 'Usuario'}</span>
              <button className="btn btn-light btn-logout" onClick={cerrarSesion}>Cerrar sesión</button>
            </>
          ) : (
            <span className="user-badge">Inicia sesión o regístrate para enviar tu mensaje.</span>
          )}
        </div>
      </header>

      <main className="app-main">
        {!sesion ? (
          <Login onLogin={setSesion} />
        ) : perfilUsuario ? (
          <Productos sesion={sesion} perfilUsuario={perfilUsuario} />
        ) : (
          <p>Cargando perfil...</p>
        )}
      </main>
    </div>
  )
}

export default App
