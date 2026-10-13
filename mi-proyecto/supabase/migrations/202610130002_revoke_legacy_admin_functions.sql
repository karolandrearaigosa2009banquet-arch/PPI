-- Funciones antiguas (diseño previo con tablas usuarios/administradores) que cualquier visitante
-- podía ejecutar por la API (por ejemplo, guardar_registro permitía escribir en "administradores").
-- Ninguna la usa la app actual.
revoke execute on function public.guardar_registro(text, auth.users) from public, anon, authenticated;
revoke execute on function public.crear_usuario_nuevo() from public, anon, authenticated;
revoke execute on function public.validar_codigo_administrador(text) from public, anon, authenticated;

-- Estas dos las usan las políticas de seguridad: solo para usuarios con sesión.
revoke execute on function public.es_administrador() from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.es_administrador() to authenticated;
grant execute on function public.is_admin() to authenticated;
