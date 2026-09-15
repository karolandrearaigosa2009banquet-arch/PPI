# Configuración de Supabase

1. Crea un proyecto en Supabase y define las URL permitidas en **Authentication → URL Configuration**. Incluye la URL local de Vite y el dominio final de producción.
2. Copia `.env.example` a `.env.local` y completa los dos valores. La clave de servicio nunca debe llegar al cliente ni al repositorio.
3. Ejecuta `supabase/migrations/202609150001_secure_pqr.sql` en el SQL Editor. La migración crea el perfil al registrarse, configura índices y aplica políticas RLS.
4. En Authentication, mantén activa la confirmación por correo antes de producción.
5. Para añadir un administrador, crea primero la cuenta de forma normal y cambia su rol desde SQL Editor usando la consulta incluida en el README. No existe un código de administrador en la aplicación.

Después de aplicar la migración, prueba con una cuenta de ciudadano y otra del equipo: el ciudadano debe ver únicamente sus propios casos; el equipo, todos los casos y la acción para responder.
