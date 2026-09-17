import { useState } from 'react'
import CrudPqr from './CrudPqr'

export default function Productos({ session, profile }) {
  const [tab, setTab] = useState('pqr')

  return (
    <section className="dashboard">
      <div className="dashboard-hero">
        <div>
          <span className="kicker">Panel de {profile.role === 'admin' ? 'administración' : 'seguimiento'}</span>
          <h1>{profile.role === 'admin' ? 'Gestiona los casos pendientes' : '¿Cómo podemos ayudarte hoy?'}</h1>
          <p>{profile.role === 'admin' ? 'Responde los casos recibidos y mantén informada a la comunidad.' : 'Radica una solicitud y consulta el estado de tus PQR en cualquier momento.'}</p>
        </div>
        <div className="hero-stat">
          <strong>{profile.role === 'admin' ? 'PQR' : 'Mi espacio'}</strong>
          <span>{profile.role === 'admin' ? 'Atención prioritaria' : 'Seguro y privado'}</span>
        </div>
      </div>

      <div className="section-switcher" aria-label="Secciones del panel">
        <button className={tab === 'pqr' ? 'active' : ''} onClick={() => setTab('pqr')}>Ver mis PQR</button>
        <button className={tab === 'help' ? 'active' : ''} onClick={() => setTab('help')}>Ver información</button>
      </div>

      {tab === 'pqr' ? (
        <CrudPqr session={session} profile={profile} />
      ) : (
        <section className="content-card info">
          <span className="kicker">Información</span>
          <h2>Antes de radicar</h2>
          <p>Una petición solicita información o una acción; una queja expresa inconformidad con el servicio; un reclamo solicita solución ante una situación concreta.</p>
          <p>Describe los hechos con claridad. Podrás ver la respuesta desde este mismo panel cuando el equipo la publique.</p>
          <button className="btn btn-primary" onClick={() => setTab('pqr')}>Ver mis PQR</button>
        </section>
      )}
    </section>
  )
}
