import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const getSupabaseRedirectUrl = () => {
  const configuredUrl = import.meta.env.VITE_SITE_URL?.trim() || window.location.origin
  return configuredUrl.replace(/\/$/, '')
}

// URL pública de la app (incluye /PPI/ en GitHub Pages y / en desarrollo).
export const getAppUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}`

export const isSupabaseConfigured = Boolean(url && key)
export const supabase = isSupabaseConfigured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null

// URL pública de la foto de perfil (bucket "avatars").
export const avatarUrl = (path) => (supabase && path ? supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl : '')
