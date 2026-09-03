
import { useState } from 'react'
import { supabase } from './supabaseClient'

const documentosColombianos = ['Cédula de ciudadanía', 'Tarjeta de identidad']
const documentosExtranjeros = ['Pasaporte', 'Cédula de extranjería', 'Otro']

function Login({ onLogin }) {
  const [modo, setModo] = useState('menu')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState('Cédula de ciudadanía')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [rol, setRol] = useState('usuario')
  const [codigoAdmin, setCodigoAdmin] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [esError, setEsError] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [pasoRegistro, setPasoRegistro] = useState(1)

  const manejarEnvio = async (event) => {
    event.preventDefault()
    setCargando(true)
    setMensaje('')
    setEsError(false)

    if (modo === 'registro') {
      const valoresRegistro = {
        1: nombreCompleto,
        2: telefono,
        3: direccion,
        4: tipoDocumento,
        5: numeroDocumento,
        6: rol,
        7: codigoAdmin,
        8: correo,
        9: contrasena,
      }
      const valorActual = valoresRegistro[pasoRegistro]
      const pasoSiguiente = pasoRegistro === 6 && rol !== 'admin' ? 8 : pasoRegistro + 1

      if (!valorActual || !String(valorActual).trim()) {
        setMensaje('Completa este campo para continuar.')
        setEsError(true)
        setCargando(false)
        return
      }

      if (pasoRegistro === 7 && codigoAdmin !== 'ADMIN123') {
        setMensaje('Código de administrador incorrecto.')
        setEsError(true)
        setCargando(false)
        return
      }

      if (pasoRegistro < 9) {
        setPasoRegistro(pasoSiguiente)
        setCargando(false)
        return
      }
    }

    if (!supabase) {
      setMensaje('Supabase no está configurado.')
      setEsError(true)
      setCargando(false)
      return
    }

    try {
      if (modo === 'iniciar') {
        const { data, error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena })

        if (error) {
          setMensaje(error.message || 'No se pudo iniciar sesión.')
          setEsError(true)
          return
        }

        onLogin?.(data.session)
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: correo,
          password: contrasena,
          options: {
            data: {
              full_name: nombreCompleto.trim(),
              phone: telefono.trim(),
              address: direccion.trim(),
              document_type: tipoDocumento,
              document_number: numeroDocumento.trim(),
              role: rol,
            },
          },
        })

        if (error) {
          setMensaje(error.message || 'No se pudo crear la cuenta.')
          setEsError(true)
          return
        }

        if (data.user) {
          if (data.session) {
            onLogin?.(data.session)
          } else {
            setMensaje('Cuenta creada. Revisa tu correo para confirmar.')
            setEsError(false)
          }
        }
      }
    } catch (error) {
      setMensaje('Error: ' + error.message)
      setEsError(true)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: '20px' }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: 10, textAlign: 'center', color: '#152238' }}>Centro de Salud PQR</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 30 }}>
          {modo === 'menu' ? 'Selecciona una opción para continuar' : modo === 'iniciar' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
        </p>

        {modo === 'menu' ? (
          <div style={{ display: 'grid', gap: 15 }}>
            <button
              type="button"
              onClick={() => setModo('registro')}
              style={{
                width: '100%',
                padding: '14px',
                background: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              Registrarse
            </button>
            <button
              type="button"
              onClick={() => setModo('iniciar')}
              style={{
                width: '100%',
                padding: '14px',
                background: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              Iniciar sesión
            </button>
          </div>
        ) : (
          <>
        <form onSubmit={manejarEnvio}>
          {modo === 'registro' && pasoRegistro === 1 && (
            <>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Nombre y apellido</label>
                <input
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Juan Pérez"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  required
                />
              </div>
            </>
          )}

          {modo === 'registro' && pasoRegistro >= 2 && pasoRegistro <= 7 && (
            <>
              <div style={{ display: pasoRegistro === 2 ? 'block' : 'none', marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Teléfono</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="3001234567"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  required={pasoRegistro === 2}
                />
              </div>

              <div style={{ display: pasoRegistro === 3 ? 'block' : 'none', marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Dirección de vivienda</label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle 12 #34-56"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  required={pasoRegistro === 3}
                />
              </div>

              <div style={{ display: pasoRegistro === 4 ? 'block' : 'none', marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Tipo de documento</label>
                <select
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                >
                  <optgroup label="Documentos para Colombianos">
                    {documentosColombianos.map((doc) => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Documentos para Extranjeros">
                    {documentosExtranjeros.map((doc) => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div style={{ display: pasoRegistro === 5 ? 'block' : 'none', marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Número de documento</label>
                <input
                  type="text"
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  placeholder="Número del documento"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  required={pasoRegistro === 5}
                />
              </div>

              <div style={{ display: pasoRegistro === 6 ? 'block' : 'none', marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Tipo de cuenta</label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                >
                  <option value="usuario">Usuario / Ciudadano</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {rol === 'admin' && (
                <div style={{ display: pasoRegistro === 7 ? 'block' : 'none', marginBottom: 15 }}>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Código de administrador</label>
                  <input
                    type="password"
                    value={codigoAdmin}
                    onChange={(e) => setCodigoAdmin(e.target.value)}
                    placeholder="ADMIN123"
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    required={pasoRegistro === 7}
                  />
                </div>
              )}
            </>
          )}

          <div style={{ display: modo === 'iniciar' || pasoRegistro === 8 ? 'block' : 'none', marginBottom: 15 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Correo electrónico</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="usuario@ejemplo.com"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              required={modo === 'iniciar' || pasoRegistro === 8}
            />
          </div>

          <div style={{ display: modo === 'iniciar' || pasoRegistro === 9 ? 'block' : 'none', marginBottom: 15 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Contraseña</label>
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              required={modo === 'iniciar' || pasoRegistro === 9}
            />
          </div>

          {mensaje && (
            <div style={{
              padding: '10px',
              marginBottom: 15,
              borderRadius: '4px',
              background: esError ? '#f8d7da' : '#d4edda',
              color: esError ? '#721c24' : '#155724',
              border: `1px solid ${esError ? '#f5c6cb' : '#c3e6cb'}`,
            }}>
              {mensaje}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            style={{
              width: '100%',
              padding: '10px',
              background: cargando ? '#6c757d' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: cargando ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {cargando ? 'Procesando...' : modo === 'iniciar' ? 'Iniciar sesión' : pasoRegistro === 9 ? 'Registrarme' : 'Siguiente'}
          </button>

          {modo === 'registro' && pasoRegistro === 2 && (
            <button
              type="button"
              onClick={() => {
                setPasoRegistro(1)
                setMensaje('')
              }}
              style={{
                width: '100%',
                padding: '10px',
                marginTop: 10,
                background: '#e9ecef',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Volver
            </button>
          )}
        </form>
          </>
        )}

        {modo !== 'menu' && (
          <button
            type="button"
            onClick={() => {
              setModo('menu')
              setPasoRegistro(1)
              setMensaje('')
            }}
            style={{
              width: '100%',
              padding: '10px',
              marginTop: 10,
              background: '#e9ecef',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Volver al menú
          </button>
        )}
      </div>
    </div>
  )
}

export default Login
