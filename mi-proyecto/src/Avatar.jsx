import { avatarUrl } from './supabaseClient'

// Foto de perfil redonda; si no hay foto, muestra la inicial del nombre.
export default function Avatar({ name = '', path = '', src = '', size = 'md' }) {
  const url = src || avatarUrl(path)
  const initial = (String(name).trim().charAt(0) || '?').toUpperCase()
  return (
    <span className={`avatar avatar-${size}`}>
      {url ? <img src={url} alt={name ? `Foto de ${name}` : 'Foto de perfil'} /> : <span aria-hidden="true">{initial}</span>}
    </span>
  )
}
