-- Personer i husstanden: alle med app-tilgang, og de uten (f.eks. barn). Hver har sin farge.
-- Brukes av flere deler, f.eks. hvem som skal på en avtale i familiekalenderen.

create table public.household_people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- Koblet til en bruker for de som har app-tilgang. Null for personer uten app.
  user_id uuid references auth.users (id) on delete set null,
  navn text not null check (length(trim(navn)) between 1 and 40),
  farge text not null check (farge ~ '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create index on public.household_people (household_id);

alter table public.household_people enable row level security;
grant select, insert, update, delete on public.household_people to authenticated;

create policy "Medlemmer ser personer"
  on public.household_people for select to authenticated
  using (public.is_household_member(household_id));

create policy "Medlemmer legger til personer"
  on public.household_people for insert to authenticated
  with check (public.is_household_member(household_id));

create policy "Medlemmer endrer personer"
  on public.household_people for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- Personer med app-tilgang fjernes ved å fjerne medlemskapet, ikke her.
create policy "Medlemmer sletter personer uten app"
  on public.household_people for delete to authenticated
  using (public.is_household_member(household_id) and user_id is null);

-- Første ledige farge i paletten for husstanden.
create function public.ledig_farge(hid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select f from unnest(array['#66723f', '#2f5e5b', '#c9962e', '#8e7ca8', '#5b86a8', '#734623', '#b8664e', '#c98c8c']) with ordinality as p(f, n)
     where f not in (select farge from public.household_people where household_id = hid)
     order by n limit 1),
    '#66723f'
  );
$$;

revoke execute on function public.ledig_farge(uuid) from public, anon, authenticated;

-- Nye medlemmer får sin person automatisk, med fornavn (eller starten av e-posten) og en ledig farge.
create function public.lag_person_for_medlem()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  u record;
begin
  select email, raw_user_meta_data into u from auth.users where id = new.user_id;
  insert into public.household_people (household_id, user_id, navn, farge)
  values (
    new.household_id,
    new.user_id,
    left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'fornavn'), ''), initcap(split_part(split_part(u.email, '@', 1), '.', 1)), 'Ukjent'), 40),
    public.ledig_farge(new.household_id)
  )
  on conflict (household_id, user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.lag_person_for_medlem() from public, anon, authenticated;

create trigger lag_person_for_medlem
  after insert on public.household_members
  for each row execute function public.lag_person_for_medlem();

-- Personer for medlemmene som allerede finnes.
do $$
declare
  m record;
begin
  for m in select household_id, user_id from public.household_members order by created_at loop
    insert into public.household_people (household_id, user_id, navn, farge)
    select m.household_id, m.user_id,
      left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'fornavn'), ''), initcap(split_part(split_part(u.email, '@', 1), '.', 1)), 'Ukjent'), 40),
      public.ledig_farge(m.household_id)
    from auth.users u where u.id = m.user_id
    on conflict (household_id, user_id) do nothing;
  end loop;
end;
$$;
