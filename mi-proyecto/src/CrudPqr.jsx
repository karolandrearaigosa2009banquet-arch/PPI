import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const types = ['Petición', 'Queja', 'Reclamo']
const formatDate = (value) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export default function CrudPqr({ session, profile }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('Petición')
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [selected, setSelected] = useState(null)
  const [reply, setReply] = useState('')
  const [filter, setFilter] = useState('Todas')
  const admin = profile.role === 'admin'

  const load = async () => {
    setLoading(true)
    let query = supabase
      .from('pqrs')
      .select('id, user_id, full_name, email, phone, document_type, document_number, tipo, mensaje, respuesta, estado, created_at, updated_at')
      .order('created_at', { ascending: false })
    if (!admin) query = query.eq('user_id', session.user.id)
    const { data, error } = await query
    setLoading(false)
    if (error) setFeedback({ error: 'No fue posible cargar las PQR. Intenta nuevamente.' })
    else setItems(data || [])
  }

  useEffect(() => { load() }, [session.user.id, admin])

  const visible = useMemo(() => filter === 'Todas' ? items : items.filter((item) => item.estado === filter), [items, filter])
  const pending = items.filter((item) => item.estado === 'Enviado').length

  const send = async (event) => {
    event.preventDefault()
    if (message.trim().length < 10) return setFeedback({ error: 'Describe tu caso con al menos 10 caracteres.' })
    const { error } = await supabase.from('pqrs').insert({
      user_id: session.user.id,
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone || null,
      document_type: profile.document_type || null,
      document_number: profile.document_number || null,
      tipo: type,
      mensaje: message.trim(),
      estado: 'Enviado',
      respuesta: null,
    })
    if (error) return setFeedback({ error: `No pudimos radicar tu PQR: ${error.message}` })
    setMessage('')
    setFeedback({ success: 'Tu PQR fue radicada correctamente.' })
    await load()
  }

  const answer = async (event) => {
    event.preventDefault()
    if (!reply.trim()) return setFeedback({ error: 'Escribe una respuesta antes de publicar.' })
    const { error } = await supabase.from('pqrs').update({ respuesta: reply.trim(), estado: 'Respondido' }).eq('id', selected.id)
    if (error) return setFeedback({ error: `No fue posible enviar la respuesta: ${error.message}` })
    setSelected(null)
    setReply('')
    setFeedback({ success: 'Respuesta publicada correctamente.' })
    await load()
  }

  return <section className="pqr-area">
    {feedback && <div className={`alert ${feedback.error ? 'alert-error' : 'alert-success'}`}>{feedback.error || feedback.success}<button onClick={() => setFeedback(null)} aria-label="Cerrar mensaje">×</button></div>}
    {!admin && <section className="content-card form-card">
      <div><span className="kicker">Nueva solicitud</span><h2>Radica una PQR</h2><p className="muted">Selecciona el tipo de caso y cuéntanos qué ocurrió.</p></div>
      <form className="form-stack" onSubmit={send}>
        <div className="type-selector">{types.map((item) => <button type="button" className={type === item ? 'selected' : ''} onClick={() => setType(item)} key={item}>{item}</button>)}</div>
        <label>Describe tu caso<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength="2000" required placeholder="Incluye la información necesaria para poder atenderte." /><small>{message.length}/2000</small></label>
        <button className="btn btn-primary" disabled={loading}>Radicar PQR</button>
      </form>
    </section>}
    <section className="content-card cases">
      <div className="section-heading"><div><span className="kicker">{admin ? 'Bandeja de entrada' : 'Historial'}</span><h2>{admin ? 'Casos recibidos' : 'Mis PQR'}</h2></div><div className="metrics"><span><strong>{items.length}</strong> total</span><span><strong>{pending}</strong> pendientes</span></div></div>
      <div className="filters">{['Todas', 'Enviado', 'Respondido'].map((item) => <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
      {loading ? <div className="loading">Actualizando casos…</div> : visible.length === 0 ? <div className="empty"><strong>Aún no hay casos aquí.</strong><span>{admin ? 'Los nuevos registros aparecerán en este espacio.' : 'Cuando radiques una PQR podrás consultarla aquí.'}</span></div> : <div className="case-list">{visible.map((item) => <article className="case" key={item.id}>
        <div className="case-top"><span className="case-type">{item.tipo}</span><span className={`status ${item.estado === 'Respondido' ? 'done' : 'pending'}`}>{item.estado === 'Respondido' ? 'Respondido' : 'En estudio'}</span></div>
        <h3>{admin && item.full_name ? item.full_name : `Caso #${item.id}`}</h3><time>{formatDate(item.created_at)}</time>
        {admin && <p><strong>Correo:</strong> {item.email || 'No registrado'}</p>}
        <p>{item.mensaje}</p>
        {item.respuesta && <div className="response"><strong>Respuesta del centro</strong><p>{item.respuesta}</p><small>{formatDate(item.updated_at)}</small></div>}
        {admin && item.estado === 'Enviado' && <button className="btn btn-secondary" onClick={() => { setSelected(item); setReply('') }}>Responder</button>}
      </article>)}</div>}
    </section>
    {selected && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="reply-title"><button className="modal-close" onClick={() => setSelected(null)} aria-label="Cerrar">×</button><span className="kicker">Responder PQR</span><h2 id="reply-title">Caso de {selected.full_name}</h2><p className="quote">{selected.mensaje}</p><form className="form-stack" onSubmit={answer}><label>Respuesta<textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength="4000" required placeholder="Escribe una respuesta clara y respetuosa." /></label><div className="modal-actions"><button className="btn btn-ghost" type="button" onClick={() => setSelected(null)}>Cancelar</button><button className="btn btn-primary">Publicar respuesta</button></div></form></section></div>}
  </section>
}
