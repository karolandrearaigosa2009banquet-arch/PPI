import { useEffect, useMemo, useState } from 'react'
import Avatar from './Avatar'
import { supabase } from './supabaseClient'

const formatDate = (value) => value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value)) : 'Sin fecha'

export default function Usuarios() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    supabase
      .from('profiles')
      .select('user_id, full_name, email, phone, document_type, document_number, role, created_at, avatar_path')
      .order('created_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (!active) return
        setLoading(false)
        if (queryError) setError('No fue posible cargar los usuarios.')
        else setUsers(data || [])
      })
    return () => { active = false }
  }, [])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter((user) => [user.full_name, user.email, user.document_number, user.phone]
      .some((value) => String(value || '').toLowerCase().includes(term)))
  }, [users, search])

  return (
    <section className="content-card cases">
      <div className="section-heading">
        <div>
          <span className="kicker">Administración</span>
          <h2>Usuarios registrados</h2>
        </div>
        <div className="metrics">
          <span><strong>{users.length}</strong> en total</span>
          <span><strong>{users.filter((user) => user.role === 'admin').length}</strong> administradores</span>
        </div>
      </div>

      <input
        className="search-input"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por nombre, cédula, correo o teléfono"
        aria-label="Buscar usuarios"
      />

      {error && <div className="alert alert-error"><span>{error}</span></div>}
      {loading ? (
        <div className="loading">Cargando usuarios…</div>
      ) : visible.length === 0 ? (
        <div className="empty"><strong>No hay usuarios para mostrar.</strong></div>
      ) : (
        <div className="case-list">
          {visible.map((user) => (
            <article className="case" key={user.user_id}>
              <div className="case-top">
                <span className="case-type">{user.role === 'admin' ? 'Administrador' : 'Usuario'}</span>
              </div>
              <div className="user-row">
                <Avatar name={user.full_name} path={user.avatar_path} size="lg" />
                <h3>{user.full_name || 'Sin nombre'}</h3>
              </div>
              <div className="case-user">
                <span><strong>Cédula:</strong> {user.document_number ? `${String(user.document_type || '').toUpperCase()} ${user.document_number}`.trim() : 'No registrada'}</span>
                <span><strong>Correo:</strong> {user.email || 'No registrado'}</span>
                <span><strong>Teléfono:</strong> {user.phone || 'No registrado'}</span>
                <span><strong>Registro:</strong> {formatDate(user.created_at)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
