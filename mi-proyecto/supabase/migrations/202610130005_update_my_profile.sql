-- Permite a cada persona completar SUS datos (nunca el rol ni el correo).
create or replace function public.update_my_profile(
  p_full_name text,
  p_document_type text,
  p_document_number text,
  p_phone text,
  p_address text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'));
  v_addr text := btrim(regexp_replace(coalesce(p_address, ''), '\s+', ' ', 'g'));
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if length(v_name) < 3 or length(v_name) > 80 or v_name ~ '[0-9<>@#$%^&*()_+=\[\]{}|/~`"]' or position(' ' in v_name) = 0 then
    raise exception 'invalid_name';
  end if;
  if coalesce(p_document_type, '') not in ('rc', 'ti', 'cc', 'ce') then
    raise exception 'invalid_document_type';
  end if;
  if coalesce(p_document_number, '') !~ '^[1-9][0-9]{5,10}$' then
    raise exception 'invalid_document_number';
  end if;
  if coalesce(p_phone, '') !~ '^[0-9]{7,10}$' then
    raise exception 'invalid_phone';
  end if;
  if length(v_addr) < 8 or length(v_addr) > 120 then
    raise exception 'invalid_address';
  end if;

  update public.profiles
  set full_name = v_name, nombre = v_name,
      document_type = p_document_type,
      document_number = p_document_number, documento = p_document_number,
      phone = p_phone, telefono = p_phone,
      address = v_addr,
      updated_at = now()
  where user_id = v_uid;
exception
  when unique_violation then
    raise exception 'document_in_use';
end;
$function$;

revoke execute on function public.update_my_profile(text, text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text, text) to authenticated;
