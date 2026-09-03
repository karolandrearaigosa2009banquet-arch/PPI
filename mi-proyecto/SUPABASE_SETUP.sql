-- CREAR TABLA DE PERFILES DE USUARIO
CREATE TABLE IF NOT EXISTS profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_number TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('usuario', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- CREAR EL PERFIL AUTOMÁTICAMENTE AL REGISTRAR UNA CUENTA
CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, full_name, email, phone, address,
    document_type, document_number, role
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    COALESCE(NEW.raw_user_meta_data->>'document_type', 'No especificado'),
    COALESCE(NEW.raw_user_meta_data->>'document_number', 'No especificado'),
    CASE WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin' ELSE 'usuario' END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crear_perfil_al_registrar ON auth.users;
CREATE TRIGGER crear_perfil_al_registrar
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.crear_perfil_usuario();

-- CREAR TABLA DE PRODUCTOS
CREATE TABLE IF NOT EXISTS productos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- CREAR TABLA DE PQR
CREATE TABLE IF NOT EXISTS pqrs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_number TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Petición', 'Queja', 'Reclamo')),
  mensaje TEXT NOT NULL,
  respuesta TEXT,
  estado TEXT NOT NULL CHECK (estado IN ('Enviado', 'Respondido')) DEFAULT 'Enviado',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- CREAR ÍNDICES PARA MEJOR RENDIMIENTO
CREATE INDEX IF NOT EXISTS pqrs_user_id_idx ON pqrs(user_id);
CREATE INDEX IF NOT EXISTS pqrs_estado_idx ON pqrs(estado);
CREATE INDEX IF NOT EXISTS productos_user_id_idx ON productos(user_id);
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

-- HABILITAR ROW LEVEL SECURITY (RLS) EN PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- FUNCIÓN SEGURA PARA COMPROBAR SI EL USUARIO ACTUAL ES ADMINISTRADOR
CREATE OR REPLACE FUNCTION public.es_administrador()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- ELIMINAR POLÍTICAS ANTERIORES PARA PODER REEJECUTAR ESTE SCRIPT
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- CREAR POLÍTICA: Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id OR public.es_administrador());

-- CREAR POLÍTICA: Un usuario puede crear su propio perfil al registrarse
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- CREAR POLÍTICA: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- HABILITAR ROW LEVEL SECURITY (RLS) EN PQRS
ALTER TABLE pqrs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own pqrs" ON pqrs;
DROP POLICY IF EXISTS "Users can create pqrs" ON pqrs;
DROP POLICY IF EXISTS "Users can update pqrs" ON pqrs;

-- CREAR POLÍTICA: Los usuarios pueden ver sus propias PQR, los admin pueden verlas todas
CREATE POLICY "Users can view their own pqrs"
  ON pqrs FOR SELECT
  USING (auth.uid() = user_id OR public.es_administrador());

-- CREAR POLÍTICA: Los usuarios pueden crear PQR
CREATE POLICY "Users can create pqrs"
  ON pqrs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- CREAR POLÍTICA: Los usuarios pueden actualizar sus propias PQR si son de ellos, los admin pueden actualizar todas
CREATE POLICY "Users can update pqrs"
  ON pqrs FOR UPDATE
  USING (auth.uid() = user_id OR public.es_administrador());

-- HABILITAR ROW LEVEL SECURITY (RLS) EN PRODUCTOS
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own productos" ON productos;
DROP POLICY IF EXISTS "Users can create productos" ON productos;
DROP POLICY IF EXISTS "Users can update their own productos" ON productos;
DROP POLICY IF EXISTS "Users can delete their own productos" ON productos;

-- CREAR POLÍTICA: Los usuarios pueden ver solo sus propios productos
CREATE POLICY "Users can view their own productos"
  ON productos FOR SELECT
  USING (auth.uid() = user_id);

-- CREAR POLÍTICA: Los usuarios pueden crear productos
CREATE POLICY "Users can create productos"
  ON productos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- CREAR POLÍTICA: Los usuarios pueden actualizar sus propios productos
CREATE POLICY "Users can update their own productos"
  ON productos FOR UPDATE
  USING (auth.uid() = user_id);

-- CREAR POLÍTICA: Los usuarios pueden eliminar sus propios productos
CREATE POLICY "Users can delete their own productos"
  ON productos FOR DELETE
  USING (auth.uid() = user_id);
