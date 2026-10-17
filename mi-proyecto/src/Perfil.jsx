import { useRef, useState } from 'react'
import Avatar from './Avatar'
import { supabase } from './supabaseClient'
import { documentLabel } from './validators'

const MAX_INPUT_BYTES = 12 * 1024 * 1024

// Recorta la imagen al centro en formato cuadrado y la reduce (la foto pesa poco y carga rápido).
async function toSquareBlob(file, size = 512) {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close?.()
  const webp = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
  if (webp && webp.type === 'image/webp') return webp
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
}

export default function Perfil({ session, profile, onChange }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)

  const pickFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setStatus(null)
    if (!file.type.startsWith('image/')) {
      setStatus({ error: 'Elige un archivo de imagen (JPG, PNG o WebP).' })
      return
    }
    if (file.size > MAX_INPUT_BYTES) {
      setStatus({ error: 'La imagen pesa demasiado. Elige una de menos de 12 MB.' })
      return
    }
    try {
      const blob = await toSquareBlob(file)
      if (!blob) throw new Error('sin imagen')
      if (preview?.url) URL.revokeObjectURL(preview.url)
      setPreview({ blob, url: URL.createObjectURL(blob) })
    } catch {
      setStatus({ error: 'No pudimos leer esa imagen. Prueba con otra en formato JPG, PNG o WebP.' })
    }
  }

  const cancelPreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url)
    setPreview(null)
    setStatus(null)
  }

  const savePhoto = async () => {
    if (!preview || !supabase) return
    setBusy(true)
    setStatus(null)
    const extension = preview.blob.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${session.user.id}/avatar-${Date.now()}.${extension}`
    const previous = profile.avatar_path

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, preview.blob, { contentType: preview.blob.type, cacheControl: '31536000' })
    if (uploadError) {
      setBusy(false)
      setStatus({ error: 'No pudimos subir la foto. Inténtalo de nuevo en unos minutos.' })
      return
    }
    const { error: saveError } = await supabase.rpc('set_my_avatar', { p_path: path })
    if (saveError) {
      await supabase.storage.from('avatars').remove([path])
      setBusy(false)
      setStatus({ error: 'La foto se subió, pero no pudimos guardarla en tu perfil. Inténtalo otra vez.' })
      return
    }
    if (previous && previous !== path) await supabase.storage.from('avatars').remove([previous])
    URL.revokeObjectURL(preview.url)
    setPreview(null)
    setBusy(false)
    onChange({ avatar_path: path })
    setStatus({ success: '¡Listo! Tu foto ya aparece en tu perfil.' })
  }

  const removePhoto = async () => {
    if (!profile.avatar_path || !supabase) return
    setBusy(true)
    setStatus(null)
    const previous = profile.avatar_path
    const { error } = await supabase.rpc('set_my_avatar', { p_path: null })
    if (error) {
      setBusy(false)
      setStatus({ error: 'No pudimos quitar la foto. Inténtalo de nuevo.' })
      return
    }
    await supabase.storage.from('avatars').remove([previous])
    setBusy(false)
    onChange({ avatar_path: null })
    setStatus({ success: 'Quitamos tu foto.' })
  }

  const admin = profile.role === 'admin'
  const data = [
    ['Nombre', profile.full_name],
    ['Documento', profile.document_number ? `${documentLabel(profile.document_type)} · ${profile.document_number}` : ''],
    ['Correo', profile.email],
    ['Teléfono', profile.phone],
    ['Dirección', profile.address],
    ['Tipo de cuenta', admin ? 'Administrador' : 'Usuario'],
  ]

  return (
    <section className="content-card perfil">
      <div className="section-heading">
        <div>
          <span className="kicker">Mi perfil</span>
          <h2>Tu espacio personal</h2>
        </div>
      </div>

      <div className="perfil-grid">
        <div className="perfil-foto">
          <div className="foto-anillo">
            <Avatar name={profile.full_name} path={profile.avatar_path} src={preview?.url} size="xl" />
          </div>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={pickFile} aria-label="Elegir foto de perfil" />

          {preview ? (
            <div className="perfil-acciones">
              <button type="button" className="btn btn-primary" onClick={savePhoto} disabled={busy}>{busy ? 'Guardando...' : 'Guardar foto'}</button>
              <button type="button" className="btn btn-ghost" onClick={cancelPreview} disabled={busy}>Cancelar</button>
            </div>
          ) : (
            <div className="perfil-acciones">
              <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={busy}>
                {profile.avatar_path ? 'Cambiar foto' : 'Subir una foto'}
              </button>
              {profile.avatar_path && <button type="button" className="btn btn-ghost" onClick={removePhoto} disabled={busy}>Quitar foto</button>}
            </div>
          )}
          <p className="muted perfil-nota">Sube una foto tuya o la imagen que quieras. Se recorta en círculo y aparece junto a tu nombre.</p>
        </div>

        <dl className="perfil-datos">
          {data.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || 'No registrado'}</dd>
            </div>
          ))}
        </dl>
      </div>

      {status?.error && <div className="alert alert-error" role="alert"><span>{status.error}</span></div>}
      {status?.success && <div className="alert alert-success" role="status"><span>{status.success}</span></div>}
    </section>
  )
}
