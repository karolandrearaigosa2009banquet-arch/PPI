-- Código de registro de administradores.
-- Se valida SOLO en la base de datos (hash bcrypt); nunca en el navegador.
create table if not exists public.admin_signup_codes (
  id integer primary key default 1 check (id = 1),
  code_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_signup_codes enable row level security;
revoke all on table public.admin_signup_codes from anon, authenticated;
-- Sin políticas: ningún cliente puede leer ni escribir esta tabla.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role text := 'user';
  v_code text := nullif(btrim(coalesce(new.raw_user_meta_data->>'admin_code', '')), '');
begin
  if v_code is not null then
    if exists (
      select 1 from public.admin_signup_codes
      where code_hash = extensions.crypt(v_code, code_hash)
    ) then
      v_role := 'admin';
    else
      raise exception 'Código de administrador incorrecto';
    end if;

    -- El código no debe quedar guardado en los datos del usuario.
    update auth.users
    set raw_user_meta_data = raw_user_meta_data - 'admin_code'
    where id = new.id;
  end if;

  insert into public.profiles (
    id, user_id, nombre, documento, barrio, telefono,
    role, full_name, email, phone, address, document_type, document_number, updated_at
  ) values (
    new.id, new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'document_number', ''),
    'Santo Domingo Savio',
    new.raw_user_meta_data->>'phone',
    v_role,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'document_type',
    new.raw_user_meta_data->>'document_number',
    now()
  )
  on conflict (id) do update set
    user_id = excluded.user_id, nombre = excluded.nombre, documento = excluded.documento,
    telefono = excluded.telefono, full_name = excluded.full_name, email = excluded.email,
    phone = excluded.phone, address = excluded.address, document_type = excluded.document_type,
    document_number = excluded.document_number, updated_at = now();
  return new;
end;
$function$;

-- Definir o cambiar el código (ejecutar manualmente, NO guardar el código en el repositorio):
-- insert into public.admin_signup_codes (id, code_hash)
--   values (1, extensions.crypt('NUEVO-CODIGO', extensions.gen_salt('bf')))
--   on conflict (id) do update set code_hash = excluded.code_hash, updated_at = now();
