// Validaciones del registro: valores coherentes para evitar registros falsos.
// Nota: son controles del navegador; la verificación del correo y el código de la
// institución se validan además en Supabase.

export const DOCUMENT_OPTIONS = [
  { value: 'rc', label: 'RC (Registro civil)', min: 8, max: 10, placeholder: '1012345678' },
  { value: 'ti', label: 'TI (Tarjeta de identidad)', min: 8, max: 11, placeholder: '1012345678' },
  { value: 'cc', label: 'CC (Cédula de ciudadanía)', min: 6, max: 10, placeholder: '1012345678' },
  { value: 'ce', label: 'CE (Cédula de extranjería)', min: 6, max: 10, placeholder: '1234567' },
]

export const documentLabel = (value) => DOCUMENT_OPTIONS.find((option) => option.value === value)?.label || String(value || '').toUpperCase()

// Números sin sentido: todos iguales, consecutivos (123456, 987654) o patrones de 2 cifras (121212).
export function isTrivialDigits(digits) {
  if (!digits) return true
  if (/^(\d)\1+$/.test(digits)) return true
  let up = true
  let down = true
  for (let i = 1; i < digits.length; i += 1) {
    const diff = (Number(digits[i]) - Number(digits[i - 1]) + 10) % 10
    if (diff !== 1) up = false
    if (diff !== 9) down = false
  }
  if (up || down) return true
  if (digits.length >= 6 && digits === digits.slice(0, 2).repeat(Math.ceil(digits.length / 2)).slice(0, digits.length)) return true
  return false
}

export function validateDocument(type, number) {
  const option = DOCUMENT_OPTIONS.find((item) => item.value === type)
  if (!option) return 'Selecciona un tipo de documento.'
  const digits = String(number || '').trim()
  if (!digits) return 'Escribe el número de documento.'
  if (!/^\d+$/.test(digits)) return 'El número de documento solo debe tener dígitos, sin puntos ni espacios.'
  if (digits.startsWith('0')) return 'El número de documento no puede empezar en 0.'
  if (digits.length < option.min || digits.length > option.max) {
    return `${option.label.split(' (')[0]} debe tener entre ${option.min} y ${option.max} dígitos.`
  }
  if (isTrivialDigits(digits) || /(\d)\1{5,}/.test(digits)) return 'Ese número de documento no parece real. Revísalo.'
  return ''
}

const MASH = ['asdf', 'qwer', 'zxcv', 'hjkl', 'wxyz', 'abcd', 'xxxx', 'nnnn', 'mmmm', 'ñññ']

export function normalizeName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es-CO')
    .replace(/(^|[\s'’-])(\p{L})/gu, (_, sep, letter) => sep + letter.toLocaleUpperCase('es-CO'))
}

export function validateName(label, value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ')
  if (!name) return `Escribe tu ${label}.`
  if (name.length < 2 || name.length > 40) return `El ${label} debe tener entre 2 y 40 letras.`
  if (!/^\p{L}+(?:[ '’-]\p{L}+)*$/u.test(name)) return `El ${label} solo puede tener letras (sin números ni símbolos).`
  if (/(\p{L})\1{2,}/iu.test(name)) return `El ${label} no parece real. Revísalo.`
  const lower = name.toLocaleLowerCase('es-CO')
  if (MASH.some((chunk) => lower.includes(chunk))) return `El ${label} no parece real. Revísalo.`
  const parts = name.split(/[ '’-]/)
  if (parts.some((part) => part.length >= 3 && !/[aeiouáéíóúüy]/i.test(part))) return `El ${label} no parece real. Revísalo.`
  return ''
}

// Teléfonos de Colombia: celular (3XXXXXXXXX), fijo con indicativo (60X XXXXXXX) o fijo de 7 dígitos.
export function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('57')) digits = digits.slice(2)
  return digits
}

export function validatePhone(value) {
  const digits = normalizePhone(value)
  if (!digits) return 'Escribe tu teléfono.'
  const mobile = /^3\d{9}$/.test(digits)
  const landlineArea = /^60[1-8]\d{7}$/.test(digits)
  const landline = /^[2-8]\d{6}$/.test(digits)
  if (!mobile && !landlineArea && !landline) return 'Escribe un celular de 10 dígitos que empiece en 3 (ej. 3001234567) o un fijo válido.'
  if (isTrivialDigits(digits) || /(\d)\1{5,}/.test(digits)) return 'Ese teléfono no parece real. Revísalo.'
  return ''
}

const DISPOSABLE = new Set(['mailinator.com', 'yopmail.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com', 'fakeinbox.com', 'mailnesia.com'])
const TYPOS = { 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmai.com': 'gmail.com', 'gnail.com': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'outlok.com': 'outlook.com', 'outloock.com': 'outlook.com', 'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com' }

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

export function validateEmail(value) {
  const email = normalizeEmail(value)
  if (!email) return 'Escribe tu correo electrónico.'
  if (!/^[a-z0-9]+(?:[._%+-][a-z0-9]+)*@[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*\.[a-z]{2,24}$/.test(email)) return 'Escribe un correo válido, por ejemplo nombre@gmail.com.'
  const [local, domain] = email.split('@')
  if (local.length < 3) return 'El correo es demasiado corto. Revísalo.'
  if (TYPOS[domain]) return `¿Quisiste decir ${local}@${TYPOS[domain]}?`
  if (DISPOSABLE.has(domain)) return 'No se aceptan correos temporales. Usa tu correo personal.'
  return ''
}

export function normalizeAddress(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

export function validateAddress(value) {
  const address = normalizeAddress(value)
  if (!address) return 'Escribe tu dirección.'
  if (address.length < 8 || address.length > 120) return 'La dirección debe tener entre 8 y 120 caracteres.'
  if (!/^[\p{L}\d\s#\-.,°ºª/]+$/u.test(address)) return 'La dirección tiene caracteres no permitidos.'
  if (!/\p{L}/u.test(address) || !/\d/.test(address)) return 'Incluye la calle o carrera y el número, por ejemplo: Calle 45 # 12-34.'
  if (address.split(' ').length < 2) return 'Escribe la dirección completa, por ejemplo: Calle 45 # 12-34.'
  if (/(.)\1{4,}/u.test(address)) return 'La dirección no parece real. Revísala.'
  return ''
}

const COMMON_PASSWORDS = ['12345678', '123456789', '1234567890', 'password', 'password1', 'contrasena', 'contraseña1', 'qwerty123', 'qwertyui', '11111111', 'abc12345', 'iloveyou1', '1q2w3e4r', 'colombia1', 'medellin1']

export function validatePassword(password, { email = '', documentNumber = '' } = {}) {
  if (password.length < 8) return 'Usa una contraseña de mínimo 8 caracteres.'
  if (password.length > 72) return 'La contraseña no puede pasar de 72 caracteres.'
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return 'La contraseña debe tener al menos una letra y un número.'
  const lower = password.toLowerCase()
  if (COMMON_PASSWORDS.includes(lower) || isTrivialDigits(password.replace(/\D/g, '')) && /^\d+$/.test(password)) return 'Esa contraseña es muy común. Elige una más segura.'
  const local = normalizeEmail(email).split('@')[0]
  if (local.length >= 4 && lower.includes(local)) return 'La contraseña no debe contener tu correo.'
  if (documentNumber && lower.includes(String(documentNumber))) return 'La contraseña no debe contener tu número de documento.'
  return ''
}
