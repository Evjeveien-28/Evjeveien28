-- Familiekalender: avtaler, hvem som skal være med, og varsler til de andre i husstanden.
-- Krever personer (20261021000000_personer.sql).

create schema kalender;
grant usage on schema kalender to authenticated;

create table kalender.avtaler (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  tittel text not null check (length(trim(tittel)) between 1 and 80),
  start_dato date not null,
  -- Uten klokkeslett varer avtalen hele dagen.
  start_tid time,
  slutt_dato date not null,
  slutt_tid time,
  sted text check (length(sted) <= 80),
  -- Brukes av gjentakende avtaler. «ingen» for enkeltavtaler.
  gjentakelse text not null default 'ingen' check (gjentakelse in ('ingen', 'daglig', 'ukentlig', 'annenhver', 'maanedlig')),
  gjentas_til date,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  -- Avlyste avtaler vises ikke, men beholdes så varselet kan vise hva som ble avlyst.
  avlyst_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slutt_dato >= start_dato),
  check (start_tid is not null or slutt_tid is null),
  check (slutt_dato > start_dato or slutt_tid is null or slutt_tid >= start_tid)
);

create index on kalender.avtaler (household_id, slutt_dato);

create table kalender.deltakere (
  avtale_id uuid not null references kalender.avtaler (id) on delete cascade,
  person_id uuid not null references public.household_people (id) on delete cascade,
  primary key (avtale_id, person_id)
);

create index on kalender.deltakere (person_id);

create table kalender.varsler (
  id uuid primary key default gen_random_uuid(),
  avtale_id uuid not null references kalender.avtaler (id) on delete cascade,
  mottaker uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('ny', 'endret', 'avlyst')),
  -- Kort beskrivelse av endringen, f.eks. «18:00 → 19:00».
  endring text check (length(endring) <= 200),
  laget_av uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  sett_at timestamptz
);

create index on kalender.varsler (mottaker) where sett_at is null;
create unique index on kalender.varsler (avtale_id, mottaker) where sett_at is null;

alter table kalender.avtaler enable row level security;
alter table kalender.deltakere enable row level security;
alter table kalender.varsler enable row level security;

grant select, insert, update on kalender.avtaler to authenticated;
grant select, insert, delete on kalender.deltakere to authenticated;
grant select on kalender.varsler to authenticated;
grant update (sett_at) on kalender.varsler to authenticated;

-- Alle i husstanden ser alle avtaler, også de de ikke er med på.
create policy "Medlemmer ser avtaler"
  on kalender.avtaler for select to authenticated
  using (public.is_household_member(household_id));

create policy "Medlemmer legger til avtaler"
  on kalender.avtaler for insert to authenticated
  with check (public.is_household_member(household_id));

create policy "Medlemmer endrer avtaler"
  on kalender.avtaler for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Medlemmer ser deltakere"
  on kalender.deltakere for select to authenticated
  using (exists (select 1 from kalender.avtaler a where a.id = avtale_id and public.is_household_member(a.household_id)));

-- Bare personer fra samme husstand som avtalen.
create policy "Medlemmer legger til deltakere"
  on kalender.deltakere for insert to authenticated
  with check (exists (
    select 1 from kalender.avtaler a
    join public.household_people p on p.household_id = a.household_id
    where a.id = avtale_id and p.id = person_id and public.is_household_member(a.household_id)
  ));

create policy "Medlemmer fjerner deltakere"
  on kalender.deltakere for delete to authenticated
  using (exists (select 1 from kalender.avtaler a where a.id = avtale_id and public.is_household_member(a.household_id)));

-- Hver ser bare sine egne varsler, og kan bare markere dem som sett.
create policy "Mottaker ser varsler"
  on kalender.varsler for select to authenticated
  using (mottaker = (select auth.uid()));

create policy "Mottaker markerer som sett"
  on kalender.varsler for update to authenticated
  using (mottaker = (select auth.uid()))
  with check (mottaker = (select auth.uid()));

-- Varsler alle andre i husstanden om en ny, endret eller avlyst avtale.
-- Har mottakeren et usett varsel for avtalen fra før, slås de sammen til ett.
create function kalender.varsle(aid uuid, hva text, beskrivelse text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
  m record;
  gammel record;
begin
  if hva not in ('ny', 'endret', 'avlyst') then
    raise exception 'Ukjent varseltype %', hva;
  end if;
  select household_id into hid from kalender.avtaler where id = aid;
  if hid is null or not public.is_household_member(hid) then
    raise exception 'Fant ikke avtalen';
  end if;

  for m in select user_id from public.household_members where household_id = hid and user_id <> auth.uid() loop
    select id, type into gammel from kalender.varsler where avtale_id = aid and mottaker = m.user_id and sett_at is null;
    if gammel.id is null then
      insert into kalender.varsler (avtale_id, mottaker, type, endring, laget_av)
      values (aid, m.user_id, hva, beskrivelse, auth.uid());
    elsif gammel.type = 'ny' and hva = 'avlyst' then
      -- Ny og avlyst før mottakeren rakk å se den: ingenting å si fra om.
      delete from kalender.varsler where id = gammel.id;
    elsif gammel.type = 'ny' then
      -- Fortsatt ny for mottakeren, som ser den slik den er nå.
      update kalender.varsler set created_at = now(), laget_av = auth.uid() where id = gammel.id;
    else
      update kalender.varsler set type = hva, endring = beskrivelse, created_at = now(), laget_av = auth.uid() where id = gammel.id;
    end if;
  end loop;
end;
$$;

revoke execute on function kalender.varsle(uuid, text, text) from public, anon;
grant execute on function kalender.varsle(uuid, text, text) to authenticated;
