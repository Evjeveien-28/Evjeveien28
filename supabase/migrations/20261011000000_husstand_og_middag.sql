-- Felles for alle hjemme-apper: husstand og medlemmer
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- Hjelpefunksjon: er innlogget bruker medlem av husstanden?
create function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = (select auth.uid())
  );
$$;

create policy "Medlemmer ser husstanden"
  on public.households for select
  using (public.is_household_member(id));

create policy "Medlemmer ser hverandre"
  on public.household_members for select
  using (public.is_household_member(household_id));

-- Middagsplanlegger: eget schema
create schema middag;
grant usage on schema middag to authenticated;

create table middag.meals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  date date not null,
  title text not null,
  notes text,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (household_id, date)
);

alter table middag.meals enable row level security;
grant select, insert, update, delete on middag.meals to authenticated;

create policy "Medlemmer leser middager"
  on middag.meals for select
  using (public.is_household_member(household_id));

create policy "Medlemmer legger til middager"
  on middag.meals for insert
  with check (public.is_household_member(household_id));

create policy "Medlemmer endrer middager"
  on middag.meals for update
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Medlemmer sletter middager"
  on middag.meals for delete
  using (public.is_household_member(household_id));
