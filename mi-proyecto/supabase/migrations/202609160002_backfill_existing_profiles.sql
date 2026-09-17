begin;

insert into public.profiles (id,user_id,nombre,documento,barrio,telefono,role,full_name,email,phone,address,document_type,document_number,updated_at)
select u.id,u.id,coalesce(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'document_number',''),'Santo Domingo Savio',u.raw_user_meta_data->>'phone','user',coalesce(u.raw_user_meta_data->>'full_name',''),u.email,u.raw_user_meta_data->>'phone',u.raw_user_meta_data->>'address',u.raw_user_meta_data->>'document_type',nullif(u.raw_user_meta_data->>'document_number',''),now()
from auth.users u where not exists (select 1 from public.profiles p where p.id=u.id);

update public.profiles p set role='admin',updated_at=now()
where lower(coalesce(p.email,'')) in (select lower(a.correo) from public.administradores a where a.correo is not null);

commit;
