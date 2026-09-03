import { useState } from 'react'
import CrudPqr from './CrudPqr'
import CrudProductos from './CrudProductos'

function Productos({ sesion, perfilUsuario }) {
  const [pestana, setPestana] = useState('pqr')

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px' }}>
      {/* MENÚ DE NAVEGACIÓN */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 30, borderBottom: '2px solid #ddd', paddingBottom: 15 }}>
        <button
          onClick={() => setPestana('pqr')}
          style={{
            padding: '12px 24px',
            background: pestana === 'pqr' ? '#007bff' : '#e9ecef',
            color: pestana === 'pqr' ? '#fff' : '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: pestana === 'pqr' ? 'bold' : 'normal',
            fontSize: '16px',
          }}
        >
          📋 Sistema de PQR
        </button>
        <button
          onClick={() => setPestana('productos')}
          style={{
            padding: '12px 24px',
            background: pestana === 'productos' ? '#007bff' : '#e9ecef',
            color: pestana === 'productos' ? '#fff' : '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: pestana === 'productos' ? 'bold' : 'normal',
            fontSize: '16px',
          }}
        >
          📦 Productos
        </button>
      </div>

      {/* CONTENIDO DE CADA PESTAÑA */}
      {pestana === 'pqr' && <CrudPqr sesion={sesion} perfilUsuario={perfilUsuario} />}
      {pestana === 'productos' && <CrudProductos sesion={sesion} />}
    </div>
  )
}

export default Productos
