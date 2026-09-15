# PQR Salud

Aplicación web para registrar y dar seguimiento a peticiones, quejas y reclamos de un centro de salud. Está construida con React, Vite y Supabase.

## Puesta en marcha

1. Instala Node.js 20 o superior y ejecuta `npm ci`.
2. Copia `.env.example` como `.env.local` y añade la URL y la clave pública (publishable/anon) de tu proyecto Supabase. Nunca uses una clave `service_role` en este archivo.
3. Ejecuta la migración `supabase/migrations/202609150001_secure_pqr.sql` desde el SQL Editor de Supabase o mediante la CLI vinculada al proyecto.
4. Ejecuta `npm run dev` para desarrollo o `npm run build` para producir el paquete de despliegue.

## Roles

Todo registro nuevo se crea como `usuario`. Para designar a un integrante del equipo, verifica primero su correo y actualiza su perfil únicamente desde el SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'correo-del-equipo@ejemplo.com';
```

La migración activa RLS, limita el acceso a usuarios autenticados y evita que una persona se asigne permisos administrativos desde el navegador.
