begin;

-- The database already contains legacy columns used by other project tables.
-- Keep them for compatibility but allow the new React PQR flow to work.
alter table public.profiles alter column nombre drop not null;
alter table public.profiles alter column documento drop not null;
alter table public.pqrs alter column nombre_completo drop not null;
alter table public.pqrs alter column correo drop not null;
alter table public.pqrs alter column tipo_documento drop not null;
alter table public.pqrs alter column numero_documento drop not null;
alter table public.pqrs alter column tipo_solicitud drop not null;

update public.profiles set user_id = id where user_id is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, user_id, nombre, documento, barrio, telefono,
    role, full_name, email, phone, address, document_type, document_number, updated_at
  ) values (
    new.id, new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'document_number', ''),
    'Santo Domingo Savio',
    new.raw_user_meta_data->>'phone',
    'user',
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'document_type',
    new.raw_user_meta_data->>'document_number',
    now()
  )
  on conflict (id) do update set
    user_id = excluded.user_id,
    nombre = excluded.nombre,
    documento = excluded.documento,
    telefono = excluded.telefono,
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    address = excluded.address,
    document_type = excluded.document_type,
    document_number = excluded.document_number,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.pqrs to authenticated;

commit;
