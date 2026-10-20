-- Gjentakende avtaler i familiekalenderen. Kolonnene gjentakelse og gjentas_til finnes fra før.
-- Unntak er ganger i en serie som ikke skal vises, fordi de er avlyst eller endret hver for seg.

alter table kalender.avtaler
  add constraint gjentas_til_etter_start check (gjentas_til is null or gjentas_til >= start_dato);

create table kalender.unntak (
  avtale_id uuid not null references kalender.avtaler (id) on delete cascade,
  -- Startdatoen til gangen som ikke skal vises.
  dato date not null,
  primary key (avtale_id, dato)
);

alter table kalender.unntak enable row level security;
grant select, insert, delete on kalender.unntak to authenticated;

create policy "Medlemmer ser unntak"
  on kalender.unntak for select to authenticated
  using (exists (select 1 from kalender.avtaler a where a.id = avtale_id and public.is_household_member(a.household_id)));

create policy "Medlemmer legger til unntak"
  on kalender.unntak for insert to authenticated
  with check (exists (select 1 from kalender.avtaler a where a.id = avtale_id and public.is_household_member(a.household_id)));

create policy "Medlemmer fjerner unntak"
  on kalender.unntak for delete to authenticated
  using (exists (select 1 from kalender.avtaler a where a.id = avtale_id and public.is_household_member(a.household_id)));

-- Samme som før, men et usett «ny»-varsel fjernes bare når hele avtalen er avlyst,
-- ikke når bare én gang i en serie er avlyst.
create or replace function kalender.varsle(aid uuid, hva text, beskrivelse text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
  hele_avlyst boolean;
  m record;
  gammel record;
begin
  if hva not in ('ny', 'endret', 'avlyst') then
    raise exception 'Ukjent varseltype %', hva;
  end if;
  select household_id, avlyst_at is not null into hid, hele_avlyst from kalender.avtaler where id = aid;
  if hid is null or not public.is_household_member(hid) then
    raise exception 'Fant ikke avtalen';
  end if;

  for m in select user_id from public.household_members where household_id = hid and user_id <> auth.uid() loop
    select id, type into gammel from kalender.varsler where avtale_id = aid and mottaker = m.user_id and sett_at is null;
    if gammel.id is null then
      insert into kalender.varsler (avtale_id, mottaker, type, endring, laget_av)
      values (aid, m.user_id, hva, beskrivelse, auth.uid());
    elsif gammel.type = 'ny' and hva = 'avlyst' and hele_avlyst then
      -- Ny og avlyst før mottakeren rakk å se den: ingenting å si fra om.
      delete from kalender.varsler where id = gammel.id;
    elsif gammel.type = 'ny' then
      -- Fortsatt ny for mottakeren, som ser den slik den er nå, også om én gang er avlyst.
      update kalender.varsler set created_at = now(), laget_av = auth.uid() where id = gammel.id;
    else
      update kalender.varsler set type = hva, endring = beskrivelse, created_at = now(), laget_av = auth.uid() where id = gammel.id;
    end if;
  end loop;
end;
$$;
