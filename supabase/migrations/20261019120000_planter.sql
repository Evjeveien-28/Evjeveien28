-- Planter: husstandens planter og når de ble vannet.

create schema planter;
grant usage on schema planter to authenticated;

create table planter.planter (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  navn text not null check (length(trim(navn)) > 0),
  -- Id i plantelisten i appen (apps/tidsklemma/app/planter/katalog.ts), eller null for «annen plante».
  katalog_id text,
  plassering text,
  sommer_dager int not null check (sommer_dager between 1 and 120),
  vinter_dager int not null check (vinter_dager between 1 and 180),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index on planter.planter (household_id);

create table planter.vanninger (
  id uuid primary key default gen_random_uuid(),
  plante_id uuid not null references planter.planter (id) on delete cascade,
  -- Dagen planten ble vannet (norsk tid). Én registrering per plante per dag holder.
  dato date not null,
  etterregistrert boolean not null default false,
  registrert_av uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (plante_id, dato)
);

alter table planter.planter enable row level security;
alter table planter.vanninger enable row level security;
grant select, insert, update, delete on planter.planter to authenticated;
grant select, insert, delete on planter.vanninger to authenticated;

create policy "Medlemmer leser planter"
  on planter.planter for select to authenticated
  using (public.is_household_member(household_id));

create policy "Medlemmer legger til planter"
  on planter.planter for insert to authenticated
  with check (public.is_household_member(household_id));

create policy "Medlemmer endrer planter"
  on planter.planter for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Medlemmer sletter planter"
  on planter.planter for delete to authenticated
  using (public.is_household_member(household_id));

-- Vanninger følger tilgangen til planten de hører til.
create policy "Medlemmer leser vanninger"
  on planter.vanninger for select to authenticated
  using (exists (
    select 1 from planter.planter p
    where p.id = plante_id and public.is_household_member(p.household_id)
  ));

create policy "Medlemmer registrerer vanninger"
  on planter.vanninger for insert to authenticated
  with check (exists (
    select 1 from planter.planter p
    where p.id = plante_id and public.is_household_member(p.household_id)
  ));

create policy "Medlemmer fjerner vanninger"
  on planter.vanninger for delete to authenticated
  using (exists (
    select 1 from planter.planter p
    where p.id = plante_id and public.is_household_member(p.household_id)
  ));
