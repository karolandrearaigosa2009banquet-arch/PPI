import Avatar from './Avatar'
import logoPqr from './assets/logo-pqr.webp'
import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabaseClient'
import Login from './Login'
import Productos from './Productos'
import './index.css'

function buildProfile(user, storedProfile) {
  const metadata = user.user_metadata || {}
  const metadataName = [metadata.first_name, metadata.last_name].filter(Boolean).join(' ')

  return {
    ...storedProfile,
    user_id: user.id,
    full_name: storedProfile?.full_name || metadata.full_name || metadataName || user.email || 'Usuario',
    email: storedProfile?.email || user.email || '',
    phone: storedProfile?.phone || metadata.phone || '',
    address: storedProfile?.address || metadata.address || '',
    document_type: storedProfile?.document_type || metadata.document_type || '',
    document_number: storedProfile?.document_number || metadata.document_number || '',
    role: storedProfile?.role || 'user',
    avatar_path: storedProfile?.avatar_path || null,
  }
}

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [recovering, setRecovering] = useState(false)
  const [holdLogin, setHoldLogin] = useState(false)

  useEffect(() => {
    if (!supabase) { setLoading(false); return undefined }
    const load = async (currentSession) => {
      setSession(currentSession)
      if (!currentSession?.user) { setProfile(null); setLoading(false); return }
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, email, phone, address, document_type, document_number, role, avatar_path').eq('user_id', currentSession.user.id).maybeSingle()
      if (error) {
        setNotice('No fue posible cargar el perfil guardado. Se muestran tus datos de registro; verifica la configuración de la base de datos.')
      } else if (!data) {
        setNotice('Tu perfil aún no se ha guardado. Se muestran tus datos de registro; revisa “Mi perfil” para completar la información.')
      } else {
        setNotice('')
      }
      setProfile(buildProfile(currentSession.user, data))
      setLoading(false)
    }
    supabase.auth.getSession().then(({ data }) => load(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      load(currentSession)
    })
    return () => subscription.subscription.unsubscribe()
  }, [])

  const signOut = async () => { await supabase.auth.signOut(); setNotice('Sesión cerrada correctamente.') }

  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="#inicio" aria-label="Inicio Sistema PQR"><span className="brand-icon"><img src={logoPqr} alt="" /></span><span><strong>Sistema PQR</strong><small>(Peticiones, Quejas y Reclamos)</small></span></a><span className="version-badge" title="Versión publicada de la página">v{String(__APP_VERSION__).split(' ')[0]}</span>{session && profile && <div className="account"><button type="button" className="account-link" onClick={() => window.dispatchEvent(new Event('ppi:perfil'))} title="Ir a mi perfil"><Avatar name={profile.full_name || profile.email} path={profile.avatar_path} /><span><strong>{profile.full_name || profile.email}</strong><small>{profile.role === 'admin' ? 'Equipo administrativo' : 'Ciudadanía'}</small></span></button><button className="btn btn-ghost" onClick={signOut}>Salir</button></div>}</header>
    <main id="inicio">{!isSupabaseConfigured && <div className="alert alert-warning">La aplicación necesita configuración. Crea <code>.env.local</code> a partir de <code>.env.example</code> y ejecuta la migración de Supabase.</div>}{notice && <div className="alert alert-warning">{notice}</div>}{!isSupabaseConfigured ? <div className="loading">Configura Supabase para habilitar el acceso.</div> : loading ? <div className="loading">Cargando tu espacio seguro…</div> : (!session || recovering || holdLogin) ? <Login recovering={recovering} onHold={() => setHoldLogin(true)} onRelease={(message) => { setHoldLogin(false); if (message) setNotice(message) }} onRecoveryStart={() => setRecovering(true)} onRecoveryDone={(message) => { setRecovering(false); if (message) setNotice(message) }} /> : !profile ? <div className="loading">Preparando tu perfil…</div> : <Productos session={session} profile={profile} onProfileChange={(changes) => setProfile((current) => ({ ...current, ...changes }))} />}</main>
    <footer>Centro de Salud Santo Domingo Savio I · Sistema de peticiones, quejas y reclamos<small style={{ display: 'block', opacity: 0.6, marginTop: 4 }}>Versión {__APP_VERSION__}</small></footer>
  </div>
}
export default App
