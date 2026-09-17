import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const types = ['Petición', 'Queja', 'Reclamo']
const formatDate = (value) => value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Sin fecha'

export default function CrudPqr({ session, profile }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [type, setType] = useState('Petición')
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [selected, setSelected] = useState(null)
  const [reply, setReply] = useState('')
  const [filter, setFilter] = useState('Todas')
  const admin = profile?.role === 'admin'

  const load = async () => {
    setLoading(true)
    let query = supabase
      .from('pqrs')
      .select('id, user_id, full_name, email, phone, document_type, document_number, tipo, tipo_solicitud, mensaje, respuesta, estado, created_at, updated_at, fecha_radicacion')
      .order('created_at', { ascending: false })

    if (!admin) query = query.eq('user_id', session.user.id)

    const { data, error } = await query
    setLoading(false)
    if (error) setFeedback({ error: `No fue posible cargar las PQR: ${error.message}` })
    else setItems(data || [])
  }

  useEffect(() => { load() }, [session.user.id, admin])

  const visible = useMemo(
    () => filter === 'Todas' ? items : items.filter((item) => item.estado === filter),
    [items, filter]
  )

  const pending = items.filter((item) => item.estado === 'Enviado').length
  const answered = items.filter((item) => item.estado === 'Respondido').length

  const send = async (event) => {
    event.preventDefault()
    if (message.trim().length < 10) {
      setFeedback({ error: 'Describe tu caso con al menos 10 caracteres.' })
      return
    }

    setSending(true)
    const fullName = profile?.full_name || profile?.nombre || 'Usuario'
    const email = profile?.email || session.user.email || ''
    const phone = profile?.phone || profile?.telefono || null
    const documentType = profile?.document_type || null
    const documentNumber = profile?.document_number || profile?.documento || null

    const { error } = await supabase.from('pqrs').insert({
      user_id: session.user.id,
      full_name: fullName,
      email,
      phone,
      document_type: documentType,
      document_number: documentNumber,
      nombre_completo: fullName,
      correo: email,
      telefono: phone,
      tipo_documento: documentType,
      numero_documento: documentNumber,
      tipo: type,
      tipo_solicitud: type,
      mensaje: message.trim(),
      estado: 'Enviado',
      respuesta: null,
    })

    setSending(false)
    if (error) {
      setFeedback({ error: `No pudimos radicar tu PQR: ${error.message}` })
      return
    }

    setMessage('')
    setFeedback({ success: 'Tu PQR fue enviada correctamente y ya aparece en tu historial.' })
    await load()
  }

  const answer = async (event) => {
    event.preventDefault()
    if (!reply.trim()) {
      setFeedback({ error: 'Escribe una respuesta antes de publicar.' })
      return
    }

    const { error } = await supabase
      .from('pqrs')
      .update({
        respuesta: reply.trim(),
        estado: 'Respondido',
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id)

    if (error) {
      setFeedback({ error: `No fue posible enviar la respuesta: ${error.message}` })
      return
    }

    setSelected(null)
    setReply('')
    setFeedback({ success: 'Respuesta publicada correctamente.' })
    await load()
  }

  return (
    <section className="pqr-area">
      {feedback && (
        <div className={`alert ${feedback.error ? 'alert-error' : 'alert-success'}`}>
          <span>{feedback.error || feedback.success}</span>
          <button onClick={() => setFeedback(null)} aria-label="Cerrar mensaje">×</button>
        </div>
      )}

      {!admin && (
        <section className="content-card form-card">
          <div>
            <span className="kicker">Nueva solicitud</span>
            <h2>Envía tu PQR</h2>
            <p className="muted">Elige si es una petición, queja o reclamo y escribe todo en este mismo formulario.</p>
            <div className="pqr-info-box">
              <strong>¿Qué puedes hacer?</strong>
              <span>Presentar una petición, reportar una queja o realizar un reclamo.</span>
              <span>Después podrás ver la fecha de envío, el estado y la respuesta.</span>
            </div>
          </div>

          <form className="form-stack pqr-form" onSubmit={send}>
            <label>Tipo de solicitud</label>
            <div className="type-selector" aria-label="Tipo de solicitud">
              {types.map((item) => (
                <button
                  type="button"
                  className={type === item ? 'selected' : ''}
                  onClick={() => setType(item)}
                  key={item}
                >
                  {item}
                </button>
              ))}
            </div>

            <label>
              Escribe tu PQR
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength="2000"
                required
                placeholder="Cuéntanos qué pasó, qué necesitas o qué quieres reclamar."
              />
              <small>{message.length}/2000</small>
            </label>

            <div className="pqr-date-note">
              <strong>Fecha de envío</strong>
              <span>Se guardará automáticamente cuando presiones “Enviar PQR”.</span>
            </div>

            <button className="btn btn-primary" disabled={sending}>
              {sending ? 'Enviando…' : 'Enviar PQR'}
            </button>
          </form>
        </section>
      )}

      <section className="content-card cases">
        <div className="section-heading">
          <div>
            <span className="kicker">{admin ? 'Bandeja de entrada' : 'Historial'}</span>
            <h2>{admin ? 'PQR recibidas' : 'Mis PQR'}</h2>
          </div>
          <div className="metrics">
            <span><strong>{items.length}</strong> total</span>
            <span><strong>{pending}</strong> pendientes</span>
            <span><strong>{answered}</strong> respondidas</span>
          </div>
        </div>

        <div className="filters">
          {['Todas', 'Enviado', 'Respondido'].map((item) => (
            <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>
              {item === 'Enviado' ? 'Pendientes' : item}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading">Cargando PQR…</div>
        ) : visible.length === 0 ? (
          <div className="empty">
            <strong>{admin ? 'Aún no hay PQR recibidas.' : 'Aún no has enviado ninguna PQR.'}</strong>
            <span>{admin ? 'Cuando un usuario envíe una PQR aparecerá aquí.' : 'Cuando envíes una PQR podrás consultarla aquí.'}</span>
          </div>
        ) : (
          <div className="case-list">
            {visible.map((item) => (
              <article className="case" key={item.id}>
                <div className="case-top">
                  <span className="case-type">{item.tipo || item.tipo_solicitud || 'PQR'}</span>
                  <span className={`status ${item.estado === 'Respondido' ? 'done' : 'pending'}`}>
                    {item.estado === 'Respondido' ? 'Respondido' : 'Pendiente'}
                  </span>
                </div>

                <h3>{admin ? (item.full_name || item.nombre_completo || 'Usuario') : `PQR #${item.id}`}</h3>
                <time>Enviada: {formatDate(item.created_at || item.fecha_radicacion)}</time>

                {admin && (
                  <div className="case-user">
                    <span><strong>Correo:</strong> {item.email || item.correo || 'No registrado'}</span>
                    <span><strong>Teléfono:</strong> {item.phone || item.telefono || 'No registrado'}</span>
                  </div>
                )}

                <p className="case-preview">{item.mensaje}</p>

                {item.respuesta && (
                  <div className="response">
                    <strong>Respuesta</strong>
                    <p>{item.respuesta}</p>
                  </div>
                )}

                <div className="case-actions">
                  <button className="btn btn-ghost" onClick={() => setSelected(item)}>Ver más</button>
                  {admin && item.estado !== 'Respondido' && (
                    <button className="btn btn-secondary" onClick={() => { setSelected(item); setReply('') }}>
                      Responder
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal pqr-detail-modal" role="dialog" aria-modal="true" aria-labelledby="pqr-detail-title">
            <button className="modal-close" onClick={() => setSelected(null)} aria-label="Cerrar">×</button>
            <span className="kicker">Detalle de PQR</span>
            <h2 id="pqr-detail-title">{selected.tipo || selected.tipo_solicitud || 'PQR'}</h2>

            <div className="detail-grid">
              <div><strong>Estado</strong><span>{selected.estado === 'Respondido' ? 'Respondido' : 'Pendiente'}</span></div>
              <div><strong>Fecha de envío</strong><span>{formatDate(selected.created_at || selected.fecha_radicacion)}</span></div>
              {admin && <div><strong>Usuario</strong><span>{selected.full_name || selected.nombre_completo || 'No registrado'}</span></div>}
              {admin && <div><strong>Correo</strong><span>{selected.email || selected.correo || 'No registrado'}</span></div>}
            </div>

            <div className="detail-box">
              <strong>PQR enviada</strong>
              <p>{selected.mensaje}</p>
            </div>

            <div className="detail-box response-detail">
              <strong>Respuesta</strong>
              {selected.respuesta ? <p>{selected.respuesta}</p> : <p className="muted">Todavía no hay una respuesta.</p>}
            </div>

            {admin && selected.estado !== 'Respondido' && (
              <form className="form-stack" onSubmit={answer}>
                <label>
                  Escribir respuesta al usuario
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    maxLength="4000"
                    required
                    placeholder="Escribe aquí la respuesta para el usuario."
                  />
                </label>
                <div className="modal-actions">
                  <button className="btn btn-ghost" type="button" onClick={() => setSelected(null)}>Cerrar</button>
                  <button className="btn btn-primary">Enviar respuesta</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  )
}
