-- Push-varsler på telefonen. Hver bruker har sine enheter (abonnementer) og sine egne innstillinger.
-- Krever utvidelsene pg_cron og pg_net (Database → Extensions i Supabase).

-- En enhet som kan få push. Endpoint og nøkler kommer fra nettleseren.
create table public.push_abonnement (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  enhet text check (length(enhet) <= 200),
  created_at timestamptz not null default now()
);

create index on public.push_abonnement (user_id);

alter table public.push_abonnement enable row level security;
grant select, insert, update, delete on public.push_abonnement to authenticated;

create policy "Egne enheter"
  on public.push_abonnement for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table public.push_innstillinger (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- Nye, endrede og avlyste avtaler fra de andre.
  kalender boolean not null default true,
  -- Ett varsel om dagen når noe trenger vann.
  planter boolean not null default false,
  planter_tid time not null default '08:00',
  planter_sist_sendt date
);

alter table public.push_innstillinger enable row level security;
grant select, insert, update on public.push_innstillinger to authenticated;

create policy "Egne innstillinger"
  on public.push_innstillinger for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Hemmeligheten som jobben hvert kvarter sender med til appen, og som appen sender tilbake hit.
-- Schemaet privat er ikke eksponert, så den kan ikke leses utenfra.
create schema privat;
revoke all on schema privat from public, anon, authenticated;
create table privat.hemmeligheter (navn text primary key, verdi text not null);
-- RLS uten regler: ingen kan lese den via API-et. Funksjonene under og jobben leser den som eier.
alter table privat.hemmeligheter enable row level security;
insert into privat.hemmeligheter values ('push', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''));

create function privat.riktig_hemmelighet(hemmelig text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from privat.hemmeligheter where navn = 'push' and verdi = hemmelig);
$$;

-- Enhetene til de andre i husstanden som vil ha kalendervarsler. Kalles av den som endret avtalen.
create function kalender.push_mottakere(aid uuid)
returns table (endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  hid uuid;
begin
  select household_id into hid from kalender.avtaler where id = aid;
  if hid is null or not public.is_household_member(hid) then
    raise exception 'Fant ikke avtalen';
  end if;
  return query
    select a.endpoint, a.p256dh, a.auth
    from public.push_abonnement a
    join public.household_members m on m.user_id = a.user_id and m.household_id = hid
    left join public.push_innstillinger i on i.user_id = a.user_id
    where a.user_id <> auth.uid() and coalesce(i.kalender, true);
end;
$$;

revoke execute on function kalender.push_mottakere(uuid) from public, anon;
grant execute on function kalender.push_mottakere(uuid) to authenticated;

-- Enheter som ikke finnes lenger (telefonen sa nei). Innloggede, eller jobben med hemmeligheten.
create function public.fjern_push_abonnement(endepunkter text[], hemmelig text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null and not privat.riktig_hemmelighet(hemmelig) then
    raise exception 'Ikke tilgang';
  end if;
  delete from public.push_abonnement where endpoint = any (endepunkter);
end;
$$;

revoke execute on function public.fjern_push_abonnement(text[], text) from public;
grant execute on function public.fjern_push_abonnement(text[], text) to anon, authenticated;

-- Hvem som skal ha plantevarsel nå: klokkeslettet er passert i dag og det er ikke sendt i dag.
-- Markerer dem som sendt, og gir appen det den trenger for å regne ut hva som trenger vann.
create function public.push_planter_grunnlag(hemmelig text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  na timestamp := now() at time zone 'Europe/Oslo';
  mottakere jsonb;
  husstander jsonb;
begin
  if not privat.riktig_hemmelighet(hemmelig) then
    raise exception 'Ikke tilgang';
  end if;

  with klare as (
    update public.push_innstillinger i set planter_sist_sendt = na::date
    where i.planter and i.planter_tid <= na::time and (i.planter_sist_sendt is null or i.planter_sist_sendt < na::date)
      and exists (select 1 from public.push_abonnement a where a.user_id = i.user_id)
    returning i.user_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', k.user_id,
    'husstander', (select jsonb_agg(m.household_id) from public.household_members m where m.user_id = k.user_id),
    'abonnementer', (select jsonb_agg(jsonb_build_object('endpoint', a.endpoint, 'p256dh', a.p256dh, 'auth', a.auth))
                     from public.push_abonnement a where a.user_id = k.user_id)
  )), '[]'::jsonb) into mottakere
  from klare k;

  select coalesce(jsonb_object_agg(h.hid, jsonb_build_object(
    'auto', coalesce((select s.auto_justering from planter.innstillinger s where s.household_id = h.hid), true),
    'planter', coalesce((select jsonb_agg(to_jsonb(p) - 'household_id' - 'created_at' - 'created_by' || jsonb_build_object(
        'vanninger', coalesce((select jsonb_agg(v order by v.dato desc) from (
          select v.id, v.dato, v.registrert_av, v.etterregistrert, v.telles_ikke
          from planter.vanninger v where v.plante_id = p.id order by v.dato desc limit 60) v), '[]'::jsonb)))
      from planter.planter p where p.household_id = h.hid), '[]'::jsonb)
  )), '{}'::jsonb) into husstander
  from (select distinct jsonb_array_elements_text(r -> 'husstander')::uuid as hid
        from jsonb_array_elements(mottakere) r where r -> 'husstander' <> 'null'::jsonb) h;

  return jsonb_build_object('mottakere', mottakere, 'husstander', husstander);
end;
$$;

revoke execute on function public.push_planter_grunnlag(text) from public;
grant execute on function public.push_planter_grunnlag(text) to anon, authenticated;

-- Hvert kvarter: be appen sende plantevarsler som er klare.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

select cron.schedule(
  'tidsklemma-plantevarsler',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://tidsklemma.vercel.app/api/push/planter',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hemmelighet', (select verdi from privat.hemmeligheter where navn = 'push')),
    body := '{}'::jsonb
  );
  $$
);
