import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function CrudProductos({ sesion }) {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensajeError, setMensajeError] = useState('')

  // Formulario (creación / edición)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [editandoId, setEditandoId] = useState(null)

  const cargarProductos = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('user_id', sesion.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setMensajeError(error.message)
    } else {
      setProductos(data)
    }
    setCargando(false)
  }

  useEffect(() => {
    cargarProductos()
  }, [])

  const limpiarFormulario = () => {
    setNombre('')
    setDescripcion('')
    setPrecio('')
    setEditandoId(null)
  }

  const manejarEnvio = async (e) => {
    e.preventDefault()
    setMensajeError('')

    if (editandoId) {
      // ACTUALIZAR
      const { error } = await supabase
        .from('productos')
        .update({ nombre, descripcion, precio: Number(precio) })
        .eq('id', editandoId)

      if (error) {
        setMensajeError(error.message)
        return
      }
    } else {
      // CREAR
      const { error } = await supabase.from('productos').insert({
        nombre,
        descripcion,
        precio: Number(precio),
        user_id: sesion.user.id,
      })

      if (error) {
        setMensajeError(error.message)
        return
      }
    }

    limpiarFormulario()
    cargarProductos()
  }

  const manejarEditar = (producto) => {
    setEditandoId(producto.id)
    setNombre(producto.nombre)
    setDescripcion(producto.descripcion || '')
    setPrecio(producto.precio)
  }

  const manejarEliminar = async (id) => {
    const confirmar = window.confirm('¿Seguro que deseas eliminar este producto?')
    if (!confirmar) return

    const { error } = await supabase.from('productos').delete().eq('id', id)

    if (error) {
      setMensajeError(error.message)
      return
    }
    cargarProductos()
  }

  return (
    <div style={{ maxWidth: 600, margin: '20px auto' }}>
      <h2>Mis Productos</h2>

      <form onSubmit={manejarEnvio} style={{ marginBottom: 24, padding: 15, background: '#f9f9f9', borderRadius: 4 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Nombre del producto</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Medicamento X"
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
            required
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Descripción</label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Detalles del producto"
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Precio</label>
          <input
            type="number"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="0.00"
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
            required
          />
        </div>

        {mensajeError && <p style={{ color: 'red', marginBottom: 12 }}>{mensajeError}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            type="submit"
            style={{
              flex: 1,
              padding: 10,
              background: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {editandoId ? 'Guardar cambios' : 'Crear producto'}
          </button>
          {editandoId && (
            <button 
              type="button" 
              onClick={limpiarFormulario}
              style={{
                padding: 10,
                background: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {cargando ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Cargando productos...</p>
      ) : productos.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Aún no tienes productos registrados.</p>
      ) : (
        <table width="100%" cellPadding="6" style={{ borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', background: '#f5f5f5' }}>
              <th align="left">Nombre</th>
              <th align="left">Descripción</th>
              <th align="left">Precio</th>
              <th align="left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{p.nombre}</td>
                <td>{p.descripcion || '-'}</td>
                <td>${Number(p.precio).toFixed(2)}</td>
                <td>
                  <button 
                    onClick={() => manejarEditar(p)}
                    style={{
                      padding: '5px 10px',
                      marginRight: 5,
                      background: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => manejarEliminar(p.id)}
                    style={{
                      padding: '5px 10px',
                      background: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
