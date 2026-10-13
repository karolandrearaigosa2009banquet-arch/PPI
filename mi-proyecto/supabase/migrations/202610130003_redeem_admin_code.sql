-- Canje del código de la institución DESPUÉS de verificar el correo.
-- Se valida en la base de datos (hash bcrypt) y con límite de 5 intentos por hora por usuario.
create table if not exists public.admin_code_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  attempted_at timestamptz not null default now()
);
create index if not exists admin_code_attempts_user_time on public.admin_code_attempts (user_id, attempted_at desc);
alter table public.admin_code_attempts enable row level security;
revoke all on table public.admin_code_attempts from anon, authenticated;

create or replace function public.redeem_admin_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_recent integer;
  v_code text := btrim(coalesce(p_code, ''));
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select count(*) into v_recent
  from public.admin_code_attempts
  where user_id = v_uid and attempted_at > now() - interval '1 hour';

  if v_recent >= 5 then
    raise exception 'too_many_attempts';
  end if;

  insert into public.admin_code_attempts (user_id) values (v_uid);

  if length(v_code) < 6 then
    return false;
  end if;

  if exists (
    select 1 from public.admin_signup_codes
    where code_hash = extensions.crypt(v_code, code_hash)
  ) then
    update public.profiles set role = 'admin', updated_at = now() where user_id = v_uid;
    return true;
  end if;

  return false;
end;
$function$;

revoke execute on function public.redeem_admin_code(text) from public, anon;
grant execute on function public.redeem_admin_code(text) to authenticated;
