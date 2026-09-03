import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function CrudPqr({ sesion, perfilUsuario }) {
  const [pqrs, setPqrs] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [tipo, setTipo] = useState('Petición')
  const [retroalimentacion, setRetroalimentacion] = useState('')
  const [tipoRetroalimentacion, setTipoRetroalimentacion] = useState('exito')
  const [cargando, setCargando] = useState(true)
  const [pqrSeleccionada, setPqrSeleccionada] = useState(null)
  const [textoRespuesta, setTextoRespuesta] = useState('')
  const [mostrarFormularioRespuesta, setMostrarFormularioRespuesta] = useState(false)

  const esAdmin = perfilUsuario?.role === 'admin'

  useEffect(() => {
    obtenerPqrs()
  }, [])

  const obtenerPqrs = async () => {
    try {
      setCargando(true)
      let query = supabase.from('pqrs').select('*')

      if (!esAdmin) {
        query = query.eq('user_id', sesion.user.id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setPqrs(data || [])
    } catch (error) {
      console.error('Error al cargar PQR:', error)
      mostrarRetroalimentacion('Error al cargar PQR', 'peligro')
    } finally {
      setCargando(false)
    }
  }

  const mostrarRetroalimentacion = (mensaje, tipo = 'exito') => {
    setRetroalimentacion(mensaje)
    setTipoRetroalimentacion(tipo)
    setTimeout(() => setRetroalimentacion(''), 3000)
  }

  const enviarPqr = async (e) => {
    e.preventDefault()

    if (!mensaje.trim()) {
      mostrarRetroalimentacion('Escribe el mensaje de tu PQR', 'peligro')
      return
    }

    try {
      const { error } = await supabase.from('pqrs').insert([
        {
          user_id: sesion.user.id,
          full_name: perfilUsuario.full_name,
          email: perfilUsuario.email,
          phone: perfilUsuario.phone,
          document_type: perfilUsuario.document_type,
          document_number: perfilUsuario.document_number,
          tipo: tipo,
          mensaje: mensaje.trim(),
          estado: 'Enviado',
          respuesta: null,
        },
      ])

      if (error) throw error

      mostrarRetroalimentacion('PQR enviada con éxito', 'exito')
      setMensaje('')
      setTipo('Petición')
      await obtenerPqrs()
    } catch (error) {
      console.error('Error:', error)
      mostrarRetroalimentacion('Error al enviar PQR', 'peligro')
    }
  }

  const responderPqr = async (e) => {
    e.preventDefault()

    if (!textoRespuesta.trim()) {
      mostrarRetroalimentacion('Escribe una respuesta', 'peligro')
      return
    }

    try {
      const { error } = await supabase
        .from('pqrs')
        .update({ respuesta: textoRespuesta.trim(), estado: 'Respondido' })
        .eq('id', pqrSeleccionada.id)

      if (error) throw error

      mostrarRetroalimentacion('Respuesta enviada', 'exito')
      setTextoRespuesta('')
      setMostrarFormularioRespuesta(false)
      setPqrSeleccionada(null)
      await obtenerPqrs()
    } catch (error) {
      console.error('Error:', error)
      mostrarRetroalimentacion('Error al enviar respuesta', 'peligro')
    }
  }

  if (cargando) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando...</div>
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {retroalimentacion && (
        <div style={{
          padding: '12px 15px',
          marginBottom: '20px',
          borderRadius: '4px',
          background: tipoRetroalimentacion === 'peligro' ? '#f8d7da' : '#d4edda',
          color: tipoRetroalimentacion === 'peligro' ? '#721c24' : '#155724',
          border: `1px solid ${tipoRetroalimentacion === 'peligro' ? '#f5c6cb' : '#c3e6cb'}`,
        }}>
          {retroalimentacion}
        </div>
      )}

      {!esAdmin ? (
        <>
          {/* VISTA DE USUARIO NORMAL */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ marginBottom: 20 }}>Radicar PQR</h2>
            <p style={{ color: '#666', marginBottom: 20 }}>Selecciona el tipo de caso y escribe tu mensaje.</p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              {['Petición', 'Queja', 'Reclamo'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTipo(option)}
                  style={{
                    padding: '10px 20px',
                    border: `2px solid ${tipo === option ? '#007bff' : '#ddd'}`,
                    borderRadius: '4px',
                    background: tipo === option ? '#007bff' : '#fff',
                    color: tipo === option ? '#fff' : '#000',
                    cursor: 'pointer',
                    fontWeight: tipo === option ? 'bold' : 'normal',
                  }}
                >
                  {option}
                </button>
              ))}
            </div>

            <form onSubmit={enviarPqr}>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Mensaje</label>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Describe aquí tu petición, queja o reclamo..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    fontFamily: 'Arial, sans-serif',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: '12px 30px',
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}
              >
                Enviar mensaje
              </button>
            </form>
          </section>

          {/* LISTA DE PQR DEL USUARIO */}
          <section>
            <h2 style={{ marginBottom: 20 }}>Mis registros PQR ({pqrs.length})</h2>

            {pqrs.length === 0 ? (
              <p style={{ color: '#666' }}>No tienes registros de PQR aún.</p>
            ) : (
              <div style={{ display: 'grid', gap: 15 }}>
                {pqrs.map((pqr) => (
                  <div
                    key={pqr.id}
                    style={{
                      padding: 15,
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      background: '#f9f9f9',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <strong style={{ fontSize: '16px' }}>[{pqr.tipo}]</strong>
                        <span
                          style={{
                            marginLeft: 15,
                            padding: '4px 8px',
                            borderRadius: '3px',
                            background: pqr.estado === 'Respondido' ? '#d4edda' : '#fff3cd',
                            color: pqr.estado === 'Respondido' ? '#155724' : '#856404',
                            fontWeight: 'bold',
                          }}
                        >
                          {pqr.estado}
                        </span>
                      </div>
                      <small style={{ color: '#999' }}>
                        {new Date(pqr.created_at).toLocaleDateString()} {new Date(pqr.created_at).toLocaleTimeString()}
                      </small>
                    </div>

                    <p style={{ margin: '10px 0' }}>{pqr.mensaje}</p>

                    {pqr.respuesta && (
                      <div style={{
                        marginTop: 15,
                        padding: 10,
                        background: '#e7f3ff',
                        borderLeft: '4px solid #2196F3',
                        borderRadius: '2px',
                      }}>
                        <strong style={{ color: '#1976D2' }}>Respuesta:</strong>
                        <p style={{ margin: '8px 0 0 0' }}>{pqr.respuesta}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {/* VISTA DE ADMINISTRADOR */}
          <section>
            <h2 style={{ marginBottom: 20 }}>Todas las PQR ({pqrs.length})</h2>

            {pqrs.length === 0 ? (
              <p style={{ color: '#666' }}>No hay PQR registradas aún.</p>
            ) : (
              <div style={{ display: 'grid', gap: 15 }}>
                {pqrs.map((pqr) => (
                  <div
                    key={pqr.id}
                    style={{
                      padding: 15,
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      background: '#f9f9f9',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <strong style={{ fontSize: '16px' }}>[{pqr.tipo}]</strong>
                        <span
                          style={{
                            marginLeft: 15,
                            padding: '4px 8px',
                            borderRadius: '3px',
                            background: pqr.estado === 'Respondido' ? '#d4edda' : '#fff3cd',
                            color: pqr.estado === 'Respondido' ? '#155724' : '#856404',
                            fontWeight: 'bold',
                          }}
                        >
                          {pqr.estado}
                        </span>
                      </div>
                      <small style={{ color: '#999' }}>
                        {new Date(pqr.created_at).toLocaleDateString()} {new Date(pqr.created_at).toLocaleTimeString()}
                      </small>
                    </div>

                    {/* INFORMACIÓN DEL USUARIO */}
                    <div style={{
                      marginBottom: 10,
                      padding: 10,
                      background: '#e3f2fd',
                      borderRadius: '3px',
                      fontSize: '14px',
                    }}>
                      <p style={{ margin: '5px 0' }}><strong>Nombre:</strong> {pqr.full_name}</p>
                      <p style={{ margin: '5px 0' }}><strong>Teléfono:</strong> {pqr.phone}</p>
                      <p style={{ margin: '5px 0' }}><strong>Email:</strong> {pqr.email}</p>
                      <p style={{ margin: '5px 0' }}><strong>Documento:</strong> {pqr.document_type} - {pqr.document_number}</p>
                    </div>

                    {/* MENSAJE DE LA PQR */}
                    <p style={{ margin: '10px 0' }}>{pqr.mensaje}</p>

                    {/* RESPUESTA SI EXISTE */}
                    {pqr.respuesta && (
                      <div style={{
                        marginTop: 10,
                        padding: 10,
                        background: '#f1f8e9',
                        borderLeft: '4px solid #558b2f',
                        borderRadius: '2px',
                      }}>
                        <strong style={{ color: '#33691e' }}>Respuesta enviada:</strong>
                        <p style={{ margin: '8px 0 0 0' }}>{pqr.respuesta}</p>
                      </div>
                    )}

                    {/* BOTÓN PARA RESPONDER */}
                    {pqr.estado === 'Enviado' && (
                      <button
                        onClick={() => {
                          setPqrSeleccionada(pqr)
                          setTextoRespuesta('')
                          setMostrarFormularioRespuesta(true)
                        }}
                        style={{
                          marginTop: 10,
                          padding: '6px 12px',
                          background: '#28a745',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        Responder
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* MODAL PARA RESPONDER */}
      {mostrarFormularioRespuesta && pqrSeleccionada && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            padding: 30,
            borderRadius: '8px',
            maxWidth: 500,
            width: '90%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ marginBottom: 15 }}>Responder a {pqrSeleccionada.full_name}</h3>
            <p style={{ color: '#666', marginBottom: 15, fontSize: '14px' }}>
              <strong>PQR:</strong> {pqrSeleccionada.mensaje}
            </p>

            <form onSubmit={responderPqr}>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Respuesta</label>
                <textarea
                  value={textoRespuesta}
                  onChange={(e) => setTextoRespuesta(e.target.value)}
                  placeholder="Escribe la respuesta..."
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Enviar respuesta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFormularioRespuesta(false)
                    setPqrSeleccionada(null)
                    setTextoRespuesta('')
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CrudPqr
