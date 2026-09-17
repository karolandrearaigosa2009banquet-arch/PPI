import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabaseClient'
import Login from './Login'
import Productos from './Productos'
import './index.css'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!supabase) { setLoading(false); return undefined }
    const load = async (currentSession) => {
      setSession(currentSession)
      if (!currentSession?.user) { setProfile(null); setLoading(false); return }
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, email, phone, address, document_type, document_number, role').eq('user_id', currentSession.user.id).maybeSingle()
      if (error) setNotice('No fue posible cargar tu perfil. Verifica la configuración de la base de datos.')
      setProfile(data)
      setLoading(false)
    }
    supabase.auth.getSession().then(({ data }) => load(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, currentSession) => load(currentSession))
    return () => subscription.subscription.unsubscribe()
  }, [])

  const signOut = async () => { await supabase.auth.signOut(); setNotice('Sesión cerrada correctamente.') }

  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="#inicio" aria-label="Inicio PQR Salud"><span className="brand-icon">✚</span><span><strong>PQR Salud</strong><small>Atención ciudadana</small></span></a>{session && profile && <div className="account"><span className="avatar">{profile.full_name?.charAt(0).toUpperCase()}</span><span><strong>{profile.full_name}</strong><small>{profile.role === 'admin' ? 'Equipo administrativo' : 'Ciudadanía'}</small></span><button className="btn btn-ghost" onClick={signOut}>Salir</button></div>}</header>
    <main id="inicio">{!isSupabaseConfigured && <div className="alert alert-warning">La aplicación necesita configuración. Crea <code>.env.local</code> a partir de <code>.env.example</code> y ejecuta la migración de Supabase.</div>}{notice && <div className="alert alert-warning">{notice}</div>}{!isSupabaseConfigured ? <div className="loading">Configura Supabase para habilitar el acceso.</div> : loading ? <div className="loading">Cargando tu espacio seguro…</div> : !session ? <Login /> : !profile ? <div className="loading">Preparando tu perfil…</div> : <Productos session={session} profile={profile} />}</main>
    <footer>Centro de Salud Santo Domingo Savio I · Sistema de peticiones, quejas y reclamos</footer>
  </div>
}
export default App
