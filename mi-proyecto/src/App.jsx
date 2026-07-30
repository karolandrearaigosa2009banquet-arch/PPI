import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  if (!session) {
    return <Login onLogin={setSession} />
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: '24px', borderRadius: '16px', boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}>
      <h2>Bienvenido, {session.user.email}</h2>
      <p>Tu sesión está activa.</p>
      <button className="btn btn-primary" onClick={handleLogout}>Cerrar sesión</button>
    </div>
  )
}

export default App