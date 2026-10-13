import { useState } from 'react'
import CrudPqr from './CrudPqr'
import Usuarios from './Usuarios'

export default function Productos({ session, profile }) {
  const admin = profile.role === 'admin'
  const [tab, setTab] = useState(admin ? 'sin' : 'pqr')

  const tabs = admin
    ? [
        { id: 'sin', label: 'PQR sin responder' },
        { id: 'resp', label: 'PQR respondidas' },
        { id: 'todas', label: 'Todas las PQR' },
        { id: 'usuarios', label: 'Usuarios' },
        { id: 'help', label: 'Información' },
      ]
    : [
        { id: 'pqr', label: 'Enviar y ver mis PQR' },
        { id: 'help', label: 'Información' },
      ]

  return (
    <section className="dashboard">
      <div className="dashboard-hero">
        <div>
          <span className="kicker">Panel de {admin ? 'administración' : 'seguimiento'}</span>
          <h1>{admin ? 'Gestiona los casos pendientes' : '¿Cómo podemos ayudarte hoy?'}</h1>
          <p>{admin ? 'Revisa quién envió cada PQR, responde los casos y mantén informada a la comunidad.' : 'Radica una solicitud y consulta el estado de tus PQR en cualquier momento.'}</p>
        </div>
        <div className="hero-stat">
          <strong>{admin ? 'Administrador' : 'Mi espacio'}</strong>
          <span>{admin ? 'Atención prioritaria' : 'Seguro y privado'}</span>
        </div>
      </div>

      <div className="section-switcher" aria-label="Menú del panel">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </div>

      {tab === 'pqr' && <CrudPqr session={session} profile={profile} />}
      {tab === 'sin' && <CrudPqr key="sin" session={session} profile={profile} initialFilter="Enviado" />}
      {tab === 'resp' && <CrudPqr key="resp" session={session} profile={profile} initialFilter="Respondido" />}
      {tab === 'todas' && <CrudPqr key="todas" session={session} profile={profile} initialFilter="Todas" />}
      {tab === 'usuarios' && admin && <Usuarios />}
      {tab === 'help' && (
        <section className="content-card info">
          <span className="kicker">Información</span>
          <h2>{admin ? 'Cómo gestionar las PQR' : 'Antes de radicar'}</h2>
          {admin ? (
            <>
              <p>En “PQR sin responder” están los casos pendientes. Abre uno con “Ver”, revisa los datos de la persona (nombre, cédula, correo y teléfono) y escribe la respuesta.</p>
              <p>Cuando respondes, el caso pasa a “PQR respondidas” y el usuario ve tu respuesta en su historial.</p>
            </>
          ) : (
            <>
              <p>Una petición solicita información o una acción; una queja expresa inconformidad con el servicio; un reclamo solicita solución ante una situación concreta.</p>
              <p>Describe los hechos con claridad. Verás “Sin respuesta” hasta que el equipo responda, y luego “Con respuesta” con el texto publicado.</p>
            </>
          )}
          <button className="btn btn-primary" onClick={() => setTab(admin ? 'sin' : 'pqr')}>{admin ? 'Ir a las PQR' : 'Enviar o ver mis PQR'}</button>
        </section>
      )}
    </section>
  )
}
