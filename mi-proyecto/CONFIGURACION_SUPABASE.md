# CONFIGURACIÓN DE SUPABASE PARA EL SISTEMA DE PQR

## Pasos para configurar Supabase:

### 1. Crear un proyecto en Supabase
- Ir a https://supabase.com
- Crear una nueva cuenta si no tienes
- Crear un nuevo proyecto
- Anotar la URL y la ANON KEY

### 2. Configurar variables de entorno
En el archivo `.env` del proyecto, agregar:
```
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
```

### 3. Crear las tablas en Supabase
1. En el dashboard de Supabase, ir a "SQL Editor"
2. Copiar y ejecutar todo el contenido del archivo `SUPABASE_SETUP.sql`
3. Esperar a que se ejecuten todas las queries

### 4. Validación de cuentas de usuario
Por defecto, Supabase envía un email de confirmación. Para desarrollo, puedes:
- Desactivar la confirmación de email en Authentication > Providers
- O confirmar emails manualmente en la tabla auth.users

### 5. Administrador inicial
Para crear un administrador:
1. Registrarse como admin con código: `ADMIN123`
2. El usuario se guardará con `role='admin'` en la tabla profiles

## Estructura de datos:

### Tabla: profiles
- Guarda información de los usuarios registrados
- Incluye: nombre, email, teléfono, dirección, tipo de documento, número de documento, rol
- El campo `role` puede ser 'usuario' o 'admin'

### Tabla: pqrs
- Guarda las peticiones, quejas y reclamos
- Incluye: información del usuario, tipo de PQR, mensaje, respuesta, estado
- Estados: 'Enviado' (pendiente de respuesta), 'Respondido' (ya tiene respuesta)

## Flujo de la aplicación:

### Usuario Normal:
1. Se registra con sus datos completos
2. Entra y ve el formulario para radicar PQR
3. Puede ver sus PQR enviadas y sus respuestas
4. Recibe notificaciones cuando se responden sus PQR

### Administrador:
1. Se registra como admin (requiere código: ADMIN123)
2. Entra y ve TODAS las PQR del sistema
3. Ve información del usuario (nombre, teléfono, email, documento)
4. Puede responder a las PQR

## Notas importantes:
- La contraseña de admin `ADMIN123` debe cambiarse en producción
- Todos los datos se guardan en Supabase (no en localStorage)
- Las tablas tienen Row Level Security (RLS) habilitado para proteger datos
