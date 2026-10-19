-- Invitasjoner til husstanden. Bare inviterte e-postadresser kan lage konto.

create table public.household_invitations (
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null check (email = lower(email)),
  invited_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (household_id, email)
);

alter table public.household_invitations enable row level security;
grant select, delete on public.household_invitations to authenticated;

create policy "Medlemmer ser invitasjoner"
  on public.household_invitations for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "Medlemmer trekker tilbake invitasjoner"
  on public.household_invitations for delete
  to authenticated
  using (public.is_household_member(household_id));

-- Inviter en e-postadresse. Finnes brukeren allerede, meldes den inn med en gang.
create function public.inviter_til_husstand(hid uuid, epost text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ny_epost text := lower(trim(epost));
  bruker uuid;
begin
  if not public.is_household_member(hid) then
    raise exception 'Du er ikke medlem av denne husstanden';
  end if;
  if ny_epost !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ugyldig e-postadresse';
  end if;

  select id into bruker from auth.users where lower(email) = ny_epost;
  if bruker is not null then
    insert into public.household_members (household_id, user_id)
    values (hid, bruker)
    on conflict do nothing;
    return 'medlem';
  end if;

  insert into public.household_invitations (household_id, email)
  values (hid, ny_epost)
  on conflict do nothing;
  return 'invitert';
end;
$$;

revoke execute on function public.inviter_til_husstand(uuid, text) from public, anon;
grant execute on function public.inviter_til_husstand(uuid, text) to authenticated;

-- Medlemmene av en husstand med e-post. auth.users kan ikke leses direkte fra appen.
create function public.husstandens_medlemmer(hid uuid)
returns table (user_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, u.email::text
  from public.household_members m
  join auth.users u on u.id = m.user_id
  where m.household_id = hid
    and public.is_household_member(hid)
  order by m.created_at;
$$;

revoke execute on function public.husstandens_medlemmer(uuid) from public, anon;
grant execute on function public.husstandens_medlemmer(uuid) to authenticated;

-- Auth hook (Before User Created): stopp alle som ikke er invitert.
grant usage on schema public to supabase_auth_admin;
grant select on public.household_invitations to supabase_auth_admin;

create policy "Supabase Auth leser invitasjoner"
  on public.household_invitations for select
  to supabase_auth_admin
  using (true);

create function public.hook_bare_inviterte(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.household_invitations
    where email = lower(event -> 'user' ->> 'email')
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Denne e-postadressen er ikke invitert til Tidsklemma.'
    )
  );
end;
$$;

grant execute on function public.hook_bare_inviterte(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_bare_inviterte(jsonb) from public, anon, authenticated;

-- Når en invitert bruker opprettes: meld inn i husstanden og fjern invitasjonen.
create function public.meld_inn_inviterte()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.household_members (household_id, user_id)
  select household_id, new.id
  from public.household_invitations
  where email = lower(new.email)
  on conflict do nothing;

  delete from public.household_invitations where email = lower(new.email);
  return new;
end;
$$;

revoke execute on function public.meld_inn_inviterte() from public, anon, authenticated;

create trigger meld_inn_inviterte
  after insert on auth.users
  for each row execute function public.meld_inn_inviterte();
