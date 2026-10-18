import { useRef, useState } from 'react'
import Avatar from './Avatar'
import { supabase } from './supabaseClient'
import { DOCUMENT_OPTIONS, documentLabel, normalizeAddress, normalizeName, normalizePhone, validateAddress, validateDocument, validateName, validatePhone } from './validators'

const MAX_INPUT_BYTES = 12 * 1024 * 1024
const EMPTY = '__campo_vacio__'

const validateFullName = (value) => {
  const name = String(value || '').trim().replace(/\s+/g, ' ')
  if (!name) return 'Escribe tu nombre y apellido.'
  if (name.split(' ').length < 2) return 'Escribe tu nombre y tu apellido.'
  return validateName('nombre completo', name)
}

const savedMessages = {
  document_in_use: 'Ese número de documento ya está registrado en otra cuenta.',
  invalid_name: 'El nombre no es válido. Escribe nombre y apellido, solo con letras.',
  invalid_document_type: 'Elige un tipo de documento válido.',
  invalid_document_number: 'El número de documento no es válido.',
  invalid_phone: 'El teléfono no es válido.',
  invalid_address: 'La dirección no es válida.',
}

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
  const [editing, setEditing] = useState(false)
  const [touched, setTouched] = useState({})
  const [form, setForm] = useState({ fullName: '', documentType: 'cc', documentNumber: '', phone: '', address: '' })

  const incomplete = !profile.full_name || !profile.document_number || !profile.phone || !profile.address

  const startEditing = () => {
    setForm({
      fullName: profile.full_name || '',
      documentType: profile.document_type || 'cc',
      documentNumber: profile.document_number || '',
      phone: profile.phone || '',
      address: profile.address || '',
    })
    setTouched({})
    setStatus(null)
    setEditing(true)
  }

  const rules = {
    fullName: () => validateFullName(form.fullName),
    documentNumber: () => validateDocument(form.documentType, form.documentNumber),
    phone: () => validatePhone(form.phone),
    address: () => validateAddress(form.address),
  }
  const fieldError = (id) => {
    if (!touched[id]) return ''
    if (!String(form[id]).trim()) return EMPTY
    return rules[id]()
  }
  const hint = (id) => {
    const message = fieldError(id)
    if (!message) return null
    return <small className="field-error" role="alert">{message === EMPTY ? 'Campo vacío: este dato está sin rellenar.' : `No válido: ${message}`}</small>
  }
  const field = (id, clean = (value) => value) => ({
    id: `perfil-${id}`,
    value: form[id],
    onChange: (event) => setForm((current) => ({ ...current, [id]: clean(event.target.value) })),
    onBlur: () => setTouched((current) => ({ ...current, [id]: true })),
    'aria-invalid': Boolean(fieldError(id)),
  })

  const saveData = async (event) => {
    event.preventDefault()
    if (!supabase) return
    setTouched({ fullName: true, documentNumber: true, phone: true, address: true })
    if (Object.keys(rules).some((id) => !String(form[id]).trim() || rules[id]())) {
      setStatus({ error: 'Revisa los campos marcados en rojo.' })
      return
    }
    const values = {
      p_full_name: normalizeName(form.fullName),
      p_document_type: form.documentType,
      p_document_number: form.documentNumber.trim(),
      p_phone: normalizePhone(form.phone),
      p_address: normalizeAddress(form.address),
    }
    setBusy(true)
    setStatus(null)
    const { error } = await supabase.rpc('update_my_profile', values)
    setBusy(false)
    if (error) {
      const key = Object.keys(savedMessages).find((code) => String(error.message || '').includes(code))
      setStatus({ error: key ? savedMessages[key] : 'No pudimos guardar tus datos. Inténtalo de nuevo en unos minutos.' })
      return
    }
    onChange({ full_name: values.p_full_name, document_type: values.p_document_type, document_number: values.p_document_number, phone: values.p_phone, address: values.p_address })
    setEditing(false)
    setStatus({ success: '¡Listo! Guardamos tus datos.' })
  }

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

      {incomplete && !editing && (
        <div className="code-hint perfil-aviso">
          <strong>Tu perfil está incompleto</strong>
          <span>Completa tu nombre, documento, teléfono y dirección para que la institución pueda atenderte mejor.</span>
        </div>
      )}

      <div className="perfil-grid">
        <div className="perfil-foto">
          <div className="foto-anillo">
            <Avatar name={profile.full_name || profile.email} path={profile.avatar_path} src={preview?.url} size="xl" />
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

        {editing ? (
          <form className="form-stack perfil-form" noValidate onSubmit={saveData}>
            <label htmlFor="perfil-fullName">
              Nombre completo
              <input {...field('fullName', (value) => value.replace(/[^\p{L}\s'’-]/gu, '').slice(0, 60))} autoComplete="name" placeholder="Ana María Gómez" />
              {hint('fullName')}
            </label>
            <label htmlFor="perfil-documentType">
              Tipo de documento
              <select id="perfil-documentType" value={form.documentType} onChange={(event) => setForm((current) => ({ ...current, documentType: event.target.value }))}>
                {DOCUMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label htmlFor="perfil-documentNumber">
              Número de documento
              <input {...field('documentNumber', (value) => value.replace(/\D/g, '').slice(0, 11))} inputMode="numeric" autoComplete="off" placeholder="1012345678" />
              {hint('documentNumber')}
            </label>
            <label htmlFor="perfil-phone">
              Teléfono
              <input {...field('phone', (value) => value.replace(/[^\d+\s]/g, '').slice(0, 16))} inputMode="tel" autoComplete="tel" placeholder="3001234567" />
              {hint('phone')}
            </label>
            <label htmlFor="perfil-address">
              Dirección
              <input {...field('address', (value) => value.slice(0, 120))} autoComplete="street-address" placeholder="Calle 45 # 12-34" />
              {hint('address')}
            </label>
            <p className="muted perfil-nota">Tu correo ({profile.email}) no se puede cambiar desde aquí.</p>
            <div className="perfil-acciones perfil-acciones-fin">
              <button type="button" className="btn btn-ghost" onClick={() => { setEditing(false); setStatus(null) }} disabled={busy}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Guardando...' : 'Guardar datos'}</button>
            </div>
          </form>
        ) : (
          <div className="perfil-datos-caja">
            <dl className="perfil-datos">
              {data.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || 'No registrado'}</dd>
                </div>
              ))}
            </dl>
            <button type="button" className="btn btn-primary perfil-editar" onClick={startEditing}>{incomplete ? 'Completar mis datos' : 'Editar mis datos'}</button>
          </div>
        )}
      </div>

      {status?.error && <div className="alert alert-error" role="alert"><span>{status.error}</span></div>}
      {status?.success && <div className="alert alert-success" role="status"><span>{status.success}</span></div>}
    </section>
  )
}
