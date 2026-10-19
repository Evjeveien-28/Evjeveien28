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
  -- Forslaget fra plantelisten da planten ble lagt til, så man alltid kan gå tilbake til det.
  standard_sommer int not null check (standard_sommer between 1 and 120),
  standard_vinter int not null check (standard_vinter between 1 and 180),
  -- Satt av brukeren. Null = ikke satt.
  manuelt_sommer int check (manuelt_sommer between 1 and 120),
  manuelt_vinter int check (manuelt_vinter between 1 and 180),
  -- Lær intervallet fra historikken (gjelder bare når også husstandens innstilling er på).
  auto_justering boolean not null default true,
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
  -- Holdes utenfor når intervallet læres, f.eks. ekstra vanning før ferie.
  telles_ikke boolean not null default false,
  registrert_av uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (plante_id, dato)
);

-- Husstandens innstillinger for plantene.
create table planter.innstillinger (
  household_id uuid primary key references public.households (id) on delete cascade,
  auto_justering boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table planter.planter enable row level security;
alter table planter.vanninger enable row level security;
alter table planter.innstillinger enable row level security;
grant select, insert, update, delete on planter.planter to authenticated;
grant select, insert, delete on planter.vanninger to authenticated;
grant update (telles_ikke) on planter.vanninger to authenticated;
grant select, insert, update on planter.innstillinger to authenticated;

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

create policy "Medlemmer markerer vanninger"
  on planter.vanninger for update to authenticated
  using (exists (
    select 1 from planter.planter p
    where p.id = plante_id and public.is_household_member(p.household_id)
  ));

create policy "Medlemmer fjerner vanninger"
  on planter.vanninger for delete to authenticated
  using (exists (
    select 1 from planter.planter p
    where p.id = plante_id and public.is_household_member(p.household_id)
  ));

create policy "Medlemmer leser innstillinger"
  on planter.innstillinger for select to authenticated
  using (public.is_household_member(household_id));

create policy "Medlemmer lager innstillinger"
  on planter.innstillinger for insert to authenticated
  with check (public.is_household_member(household_id));

create policy "Medlemmer endrer innstillinger"
  on planter.innstillinger for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
