-- Fornavn lagres på brukeren (user_metadata.fornavn). Husstanden ser hverandres fornavn via denne funksjonen.
drop function public.husstandens_medlemmer(uuid);

create function public.husstandens_medlemmer(hid uuid)
returns table (user_id uuid, email text, fornavn text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, u.email::text, nullif(trim(u.raw_user_meta_data ->> 'fornavn'), '')
  from public.household_members m
  join auth.users u on u.id = m.user_id
  where m.household_id = hid
    and public.is_household_member(hid)
  order by m.created_at;
$$;

revoke execute on function public.husstandens_medlemmer(uuid) from public, anon;
grant execute on function public.husstandens_medlemmer(uuid) to authenticated;
