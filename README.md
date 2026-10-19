# Tidsklemma

Tidsklemma er hjemme-appen vår i Evjeveien 28: én app med flere deler, der hver del har sin egen side. pnpm + Turborepo + Next.js + Supabase, deployet på Vercel.

## Struktur

```
apps/
  tidsklemma/          Next.js-appen (Vercel Root Directory: apps/tidsklemma)
    app/               Startside, innlogging, og én mappe per del
    deler.ts           Listen over deler som vises på startsiden
    proxy.ts           Fornyer innloggingen og sender utloggede til /logg-inn
    app/passkey.ts     Hjelpefunksjoner for innlogging med Face ID/fingeravtrykk (passkeys)
packages/
  ui/                  Delte React-komponenter (@hjem/ui)
  db/                  Supabase-klienter for nettleser, server og proxy (@hjem/db)
  config/              Felles TypeScript-oppsett (@hjem/config)
supabase/
  migrations/          Databaseskjema. Husstand i `public`, ett schema per del.
```

## Kom i gang

```bash
pnpm install
cp apps/tidsklemma/.env.example apps/tidsklemma/.env.local   # fyll inn Supabase-URL og publishable-nøkkel
pnpm dev
```

Appen kjører på http://localhost:3000.

## Oppsett

**Supabase** (ett prosjekt, `hzyjshudlfciedqufuva`):

Endringer i databasen gjøres i nettleseren: lim inn hver fil i `supabase/migrations/` i **SQL Editor** og trykk **Run**, i rekkefølge, én gang per fil.

1. Kjør migrasjonene.
2. **Authentication → URL Configuration**: Site URL = `https://tidsklemma.vercel.app`. Redirect URLs: `https://tidsklemma.vercel.app/**`, `http://localhost:3000/**` og `https://*-evjeveien28.vercel.app/**` (forhåndsvisninger). Bruk aldri et bredere mønster som `https://tidsklemma-*.vercel.app/**`, som også slipper gjennom andres prosjekter.
3. **Authentication → Passkeys**: slå på passkeys. Relying Party ID = `tidsklemma.vercel.app`, navn = `Tidsklemma`, origin = `https://tidsklemma.vercel.app`. Passkeys virker bare på produksjonsadressen; lokalt og i forhåndsvisninger brukes e-postlenken.
4. **Authentication → Hooks → Before User Created**: velg Postgres-funksjonen `public.hook_bare_inviterte`. Den stopper alle som ikke er invitert.
5. **Authentication → Sign In / Providers**: slå på **Allow new users to sign up**. Gjør dette *etter* steg 4, ellers kan hvem som helst lage konto i mellomtiden.

6. **Integrations → Data API → Settings**: legg til schemaene til delene (`planter`) under **Exposed schemas**, og slå på de nye tabellene (`planter.planter`, `planter.vanninger`, `planter.innstillinger`) under **Exposed tables**. Nye tabeller er ikke eksponert som standard. RLS bestemmer fortsatt hvem som ser hva.

**Pl@ntNet** (bildegjenkjenning av planter): lag en gratis konto på my.plantnet.org og legg API-nøkkelen inn i Vercel som `PLANTNET_API_KEY` (Production og Preview). Den brukes bare på serveren og skal ikke ha `NEXT_PUBLIC_` foran.

Nye medlemmer inviteres fra **Husstand** i appen. Den inviterte logger inn med e-posten sin på https://tidsklemma.vercel.app og blir meldt inn automatisk.

Den aller første husstanden og brukeren ble laget manuelt (**Authentication → Users → Add user**, deretter i SQL Editor):
```sql
with h as (
  insert into public.households (name) values ('Evjeveien 28') returning id
)
insert into public.household_members (household_id, user_id)
select h.id, u.id from h, auth.users u
where u.email in ('...');
```

**Vercel** (ett prosjekt, https://tidsklemma.vercel.app): Root Directory `apps/tidsklemma`, og miljøvariablene `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Production og Preview.

## Ny del

1. Lag `apps/tidsklemma/app/<del>/page.tsx`. Alle sider krever innlogging automatisk.
2. Legg delen til i `apps/tidsklemma/deler.ts`, så vises den på startsiden.
3. Lag en ny migrasjon i `supabase/migrations/` med delens eget schema, `grant usage on schema <del> to authenticated`, og RLS på alle tabeller.
4. Kjør migrasjonen i SQL Editor, legg schemaet til under **Exposed schemas** og tabellene under **Exposed tables** (Integrations → Data API → Settings), og legg det til i `gen:types` i `packages/db/package.json`.

I koden når du delens tabeller med `supabase.schema("<del>").from("...")`.

## Deler

- **Planter** (`app/planter`, schema `planter`): husstandens planter og vanning. Plantelisten med norske navn og vanningsintervall ligger i `app/planter/katalog.ts`. «Ta bilde» sender bildet via `app/planter/gjenkjenn/route.ts` til Pl@ntNet, og treffet kobles til listen via art, slekt eller familie. Vinterintervallet brukes oktober–mars. Startsiden viser en rød prikk når noe trenger vann.

## Regler

- Repoet er **offentlig**. Aldri commit `.env`-filer, nøkler eller passord.
- Bare `anon`/`publishable`-nøkkelen skal brukes i appen. `service_role` hører aldri hjemme i koden.
- Alle tabeller skal ha RLS. Bruk `public.is_household_member(household_id)` i policyene.
- Jobb i branches og merge via pull request. CI kjører typecheck og build på hver PR.
