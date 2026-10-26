-- Prisvakt: følg prisen på varer i nettbutikker. Prisen sjekkes hver morgen.
-- Krever push (20261024000000_push.sql) for hemmeligheten og jobben.

create schema prisvakt;
grant usage on schema prisvakt to authenticated;
-- Jobben hver morgen kaller funksjonene uten innlogging. Tabellene har ingen tilgang for anon.
grant usage on schema prisvakt to anon;

create table prisvakt.varer (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  url text not null check (url ~ '^https?://' and length(url) <= 2000),
  butikk text not null check (length(butikk) <= 80),
  navn text not null check (length(trim(navn)) between 1 and 200),
  bilde_url text check (length(bilde_url) <= 2000),
  -- Strekkoden, når butikken oppgir den. Brukes til å finne varen andre steder.
  ean text check (ean ~ '^[0-9]{8,14}$'),
  pris numeric(10, 2) not null check (pris >= 0),
  -- Prisen da vi begynte å følge varen. Pilen i oversikten sammenligner med denne.
  startpris numeric(10, 2) not null check (startpris >= 0),
  pa_lager boolean,
  onsket_pris numeric(10, 2) check (onsket_pris > 0),
  sist_sjekket timestamptz not null default now(),
  -- Siste feil ved henting, f.eks. at siden ikke finnes lenger. Null når alt er i orden.
  feil text check (length(feil) <= 300),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, url)
);

create index on prisvakt.varer (household_id);

-- Én pris per vare per dag, til grafen.
create table prisvakt.priser (
  vare_id uuid not null references prisvakt.varer (id) on delete cascade,
  dato date not null,
  pris numeric(10, 2) not null check (pris >= 0),
  primary key (vare_id, dato)
);

alter table prisvakt.varer enable row level security;
alter table prisvakt.priser enable row level security;
grant select, insert, update, delete on prisvakt.varer to authenticated;
grant select, insert, update on prisvakt.priser to authenticated;

create policy "Medlemmer ser varer" on prisvakt.varer for select to authenticated
  using (public.is_household_member(household_id));
create policy "Medlemmer legger til varer" on prisvakt.varer for insert to authenticated
  with check (public.is_household_member(household_id));
create policy "Medlemmer endrer varer" on prisvakt.varer for update to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "Medlemmer sletter varer" on prisvakt.varer for delete to authenticated
  using (public.is_household_member(household_id));

create policy "Medlemmer ser priser" on prisvakt.priser for select to authenticated
  using (exists (select 1 from prisvakt.varer v where v.id = vare_id and public.is_household_member(v.household_id)));
create policy "Medlemmer legger til priser" on prisvakt.priser for insert to authenticated
  with check (exists (select 1 from prisvakt.varer v where v.id = vare_id and public.is_household_member(v.household_id)));
create policy "Medlemmer endrer priser" on prisvakt.priser for update to authenticated
  using (exists (select 1 from prisvakt.varer v where v.id = vare_id and public.is_household_member(v.household_id)));

-- Push når prisen faller. På som standard.
alter table public.push_innstillinger add column prisvakt boolean not null default true;

-- Alle varene som skal sjekkes, med enhetene til dem i husstanden som vil ha prisvarsler.
create function prisvakt.sjekk_grunnlag(hemmelig text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not privat.riktig_hemmelighet(hemmelig) then
    raise exception 'Ikke tilgang';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', v.id, 'url', v.url, 'navn', v.navn, 'pris', v.pris, 'onsket_pris', v.onsket_pris,
      'abonnementer', coalesce((
        select jsonb_agg(jsonb_build_object('endpoint', a.endpoint, 'p256dh', a.p256dh, 'auth', a.auth))
        from public.push_abonnement a
        join public.household_members m on m.user_id = a.user_id and m.household_id = v.household_id
        left join public.push_innstillinger i on i.user_id = a.user_id
        where coalesce(i.prisvakt, true)), '[]'::jsonb)))
    from prisvakt.varer v), '[]'::jsonb);
end;
$$;

-- Ny pris fra den daglige sjekken. Uten pris lagres bare feilen.
create function prisvakt.lagre_sjekk(hemmelig text, vid uuid, ny_pris numeric, lager boolean, feilmelding text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not privat.riktig_hemmelighet(hemmelig) then
    raise exception 'Ikke tilgang';
  end if;
  if ny_pris is null then
    update prisvakt.varer set feil = left(feilmelding, 300), sist_sjekket = now() where id = vid;
    return;
  end if;
  update prisvakt.varer set pris = ny_pris, pa_lager = lager, feil = null, sist_sjekket = now() where id = vid;
  insert into prisvakt.priser (vare_id, dato, pris) values (vid, (now() at time zone 'Europe/Oslo')::date, ny_pris)
    on conflict (vare_id, dato) do update set pris = excluded.pris;
end;
$$;

revoke execute on function prisvakt.sjekk_grunnlag(text) from public;
revoke execute on function prisvakt.lagre_sjekk(text, uuid, numeric, boolean, text) from public;
grant execute on function prisvakt.sjekk_grunnlag(text) to anon, authenticated;
grant execute on function prisvakt.lagre_sjekk(text, uuid, numeric, boolean, text) to anon, authenticated;

-- Hver morgen ca. kl. 06 (04:00 UTC er 06 om sommeren og 05 om vinteren).
select cron.schedule(
  'tidsklemma-prisvakt',
  '0 4 * * *',
  $$
  select net.http_post(
    url := 'https://tidsklemma.vercel.app/api/prisvakt/sjekk',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hemmelighet', (select verdi from privat.hemmeligheter where navn = 'push')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
