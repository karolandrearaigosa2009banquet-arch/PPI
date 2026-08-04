import { useEffect, useState } from 'react'
import './index.css'

const colombianDocuments = ['Cédula de ciudadanía', 'Tarjeta de identidad']
const foreignDocuments = ['Pasaporte', 'Cédula de extranjería', 'Otro']
const initialForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'usuario',
  cedula: '',
  telefono: '',
  vivienda: '',
  nacimiento: '',
  adminCode: '',
  documentType: 'Cédula de ciudadanía',
  documentNumber: '',
  tipo: 'Petición',
  mensaje: '',
}

function App() {
  const [authMode, setAuthMode] = useState('register')
  const [form, setForm] = useState(initialForm)
  const [users, setUsers] = useState([])
  const [pqrs, setPqrs] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('success')

  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]')
    setUsers(Array.isArray(storedUsers) ? storedUsers : [])
    const storedPqrs = JSON.parse(localStorage.getItem('pqrs') || '[]')
    setPqrs(Array.isArray(storedPqrs) ? storedPqrs : [])
    const storedCurrentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
    setCurrentUser(storedCurrentUser || null)
  }, [])

  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users))
  }, [users])

  useEffect(() => {
    localStorage.setItem('pqrs', JSON.stringify(pqrs))
  }, [pqrs])

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser))
    } else {
      localStorage.removeItem('currentUser')
    }
  }, [currentUser])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const resetForm = () => setForm({ ...initialForm })

  const showFeedback = (message, type = 'success') => {
    setFeedback(message)
    setFeedbackType(type)
  }

  const handleRegister = (event) => {
    event.preventDefault()
    const fullName = form.fullName.trim()
    const email = form.email.trim().toLowerCase()
    const password = form.password
    const role = form.role
    const cedula = form.cedula.trim()
    const telefono = form.telefono.trim()
    const vivienda = form.vivienda.trim()
    const nacimiento = form.nacimiento
    const documentType = form.documentType
    const documentNumber = form.documentNumber.trim()

    if (!fullName || !email || !password || !cedula || !telefono || !vivienda || !nacimiento || !documentNumber) {
      showFeedback('Completa todos los campos de registro para continuar.', 'danger')
      return
    }

    if (foreignDocuments.includes(documentType) && (documentNumber.length < 3 || documentNumber.length > 15)) {
      showFeedback('El documento para extranjeros u otros usos debe tener entre 3 y 15 caracteres.', 'danger')
      return
    }

    if (users.some((user) => user.email === email)) {
      showFeedback('Este correo ya está registrado.', 'danger')
      return
    }

    if (role === 'admin' && form.adminCode !== 'ADMIN123') {
      showFeedback('El código de administrador es incorrecto.', 'danger')
      return
    }

    const newUser = {
      fullName,
      email,
      password,
      role,
      cedula,
      telefono,
      vivienda,
      nacimiento,
      documentType,
      documentNumber,
      createdAt: new Date().toISOString(),
    }

    setUsers((prev) => [...prev, newUser])
    setCurrentUser(newUser)
    showFeedback('Registro exitoso. Ya puedes enviar tu mensaje.', 'success')
    setAuthMode('login')
    resetForm()
  }

  const handleLogin = (event) => {
    event.preventDefault()
    const fullName = form.fullName.trim()
    const email = form.email.trim().toLowerCase()
    const password = form.password
    const role = form.role
    const cedula = form.cedula.trim()
    const telefono = form.telefono.trim()
    const vivienda = form.vivienda.trim()
    const nacimiento = form.nacimiento
    const documentType = form.documentType
    const documentNumber = form.documentNumber.trim()

    if (!fullName || !email || !password || !cedula || !telefono || !vivienda || !nacimiento || !documentNumber) {
      showFeedback('Completa los campos de inicio de sesión con los datos del registro.', 'danger')
      return
    }

    const user = users.find(
      (u) =>
        u.fullName.toLowerCase() === fullName.toLowerCase() &&
        u.email === email &&
        u.password === password &&
        u.role === role &&
        u.cedula === cedula &&
        u.telefono === telefono &&
        u.vivienda === vivienda &&
        u.nacimiento === nacimiento &&
        u.documentType === documentType &&
        u.documentNumber === documentNumber,
    )

    if (!user) {
      showFeedback('Datos de inicio de sesión incorrectos. Verifica tu registro.', 'danger')
      return
    }

    setCurrentUser(user)
    showFeedback('Inicio de sesión exitoso.', 'success')
    resetForm()
  }

  const handleLogout = () => {
    setCurrentUser(null)
    showFeedback('Has cerrado sesión.', 'success')
    setFeedbackType('success')
    resetForm()
  }

  const handleTipoSelect = (selectedTipo) => {
    setForm((prev) => ({ ...prev, tipo: selectedTipo }))
  }

  const handlePqrSubmit = (event) => {
    event.preventDefault()

    if (!currentUser) {
      showFeedback('Debes iniciar sesión para enviar tu mensaje.', 'danger')
      return
    }

    const mensaje = form.mensaje.trim()
    if (!mensaje) {
      showFeedback('Escribe el mensaje de tu PQR antes de enviar.', 'danger')
      return
    }

    const newPqr = {
      id: Date.now(),
      userFullName: currentUser.fullName,
      documentType: currentUser.documentType,
      documentNumber: currentUser.documentNumber,
      tipo: form.tipo,
      mensaje,
      estado: 'Pendiente',
      createdAt: new Date().toISOString(),
    }

    setPqrs((prev) => [newPqr, ...prev])
    showFeedback('Mensaje enviado con éxito.', 'success')
    setForm((prev) => ({ ...prev, mensaje: '' }))
  }

  const userPqrs = pqrs.filter((pqr) => pqr.userFullName === currentUser?.fullName)

  const AppLogo = () => (
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

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <AppLogo />
          <div className="brand-text">
            <h1>Centro de Salud Santo Domingo Savio 1</h1>
            <p className="subtitle">Sistema de PQR para atención ciudadana</p>
          </div>
        </div>
        <div className="header-actions">
          {currentUser ? (
            <>
              <span className="user-badge">{currentUser.fullName}</span>
              <button className="btn btn-light btn-logout" onClick={handleLogout}>Cerrar sesión</button>
            </>
          ) : (
            <span className="user-badge">Inicia sesión o regístrate para enviar tu mensaje.</span>
          )}
        </div>
      </header>

      <main className="app-main">
        {!currentUser ? (
          <section className="auth-card">
            <div className="tabs">
              <button
                type="button"
                className={`tab-btn ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('register')
                  setFeedback('')
                  resetForm()
                }}
              >
                Registrarse
              </button>
              <button
                type="button"
                className={`tab-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('login')
                  setFeedback('')
                  resetForm()
                }}
              >
                Iniciar sesión
              </button>
            </div>

            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="form-grid">
              <h2>{authMode === 'login' ? 'Inicia sesión con tus datos' : 'Regístrate con tus datos completos'}</h2>

              {feedback && (
                <div className={`alert ${feedbackType === 'danger' ? 'alert-danger' : 'alert-success'}`}>
                  {feedback}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="fullName">Nombre completo</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  className="form-control"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Juan Pérez"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Correo electrónico</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Contraseña</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-control"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="******"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="documentType">Tipo de documento</label>
                <select
                  id="documentType"
                  name="documentType"
                  className="form-control"
                  value={form.documentType}
                  onChange={handleChange}
                >
                  <optgroup label="Documentos de identidad para Colombianos">
                    {colombianDocuments.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Documentos para Extranjeros y Otros Usos">
                    {foreignDocuments.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="documentNumber">Número de documento</label>
                <input
                  id="documentNumber"
                  name="documentNumber"
                  type="text"
                  className="form-control"
                  value={form.documentNumber}
                  onChange={handleChange}
                  placeholder="Número del documento"
                  required
                />
                {foreignDocuments.includes(form.documentType) && (
                  <p className="small-text">Para este tipo de documento, el valor debe tener entre 3 y 15 caracteres.</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="role">Tipo de cuenta</label>
                <select
                  id="role"
                  name="role"
                  className="form-control"
                  value={form.role}
                  onChange={handleChange}
                >
                  <option value="usuario">Usuario / Ciudadano</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {authMode === 'register' && form.role === 'admin' && (
                <div className="form-group">
                  <label htmlFor="adminCode">Código de administrador</label>
                  <input
                    id="adminCode"
                    name="adminCode"
                    type="password"
                    className="form-control"
                    value={form.adminCode}
                    onChange={handleChange}
                    placeholder="ADMIN123"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="cedula">Número de cédula</label>
                <input
                  id="cedula"
                  name="cedula"
                  type="text"
                  className="form-control"
                  value={form.cedula}
                  onChange={handleChange}
                  placeholder="123456789"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group half-width">
                  <label htmlFor="telefono">Teléfono</label>
                  <input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    className="form-control"
                    value={form.telefono}
                    onChange={handleChange}
                    placeholder="3001234567"
                    required
                  />
                </div>
                <div className="form-group half-width">
                  <label htmlFor="nacimiento">Fecha de nacimiento</label>
                  <input
                    id="nacimiento"
                    name="nacimiento"
                    type="date"
                    className="form-control"
                    value={form.nacimiento}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="vivienda">Dirección de vivienda</label>
                <input
                  id="vivienda"
                  name="vivienda"
                  type="text"
                  className="form-control"
                  value={form.vivienda}
                  onChange={handleChange}
                  placeholder="Calle 12 #34-56"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-submit">
                {authMode === 'login' ? 'Ingresar' : 'Registrarme'}
              </button>
            </form>
          </section>
        ) : (
          <section className="dashboard-card">
            <div className="dashboard-title-row">
              <div>
                <h2>Radicar PQR</h2>
                <p className="section-description">Selecciona el tipo de caso y escribe tu mensaje.</p>
              </div>
              <div className="section-badges">
                <span className="badge">PQR enviadas: {userPqrs.length}</span>
              </div>
            </div>

            {feedback && (
              <div className={`alert ${feedbackType === 'danger' ? 'alert-danger' : 'alert-success'}`}>
                {feedback}
              </div>
            )}

            <div className="button-group-row">
              {['Petición', 'Queja', 'Reclamo'].map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`btn tipo-btn ${form.tipo === option ? 'tipo-active' : 'tipo-default'}`}
                  onClick={() => handleTipoSelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>

            <form onSubmit={handlePqrSubmit} className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="mensaje">Mensaje</label>
                <textarea
                  id="mensaje"
                  name="mensaje"
                  className="form-control"
                  rows="5"
                  value={form.mensaje}
                  onChange={handleChange}
                  placeholder="Describe aquí tu petición, queja o reclamo..."
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-submit btn-send">
                Enviar mensaje
              </button>
            </form>

            <div className="pqr-list">
              <h3>Mis registros</h3>
              {userPqrs.length === 0 ? (
                <p>No tienes registros de PQR aún.</p>
              ) : (
                userPqrs.map((item) => (
                  <div key={item.id} className="pqr-card">
                    <div className="pqr-header">
                      <strong>[{item.tipo}]</strong>
                      <span>{item.estado}</span>
                    </div>
                    <p><strong>Mensaje:</strong></p>
                    <p>{item.mensaje}</p>
                    <p className="small-text">Documento: {item.documentType} — {item.documentNumber}</p>
                    <p className="small-text">Fecha: {new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
