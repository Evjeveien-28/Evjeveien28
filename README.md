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

1. `npx supabase link --project-ref hzyjshudlfciedqufuva` og `npx supabase db push`.
2. **Authentication → URL Configuration**: Site URL = `https://tidsklemma.vercel.app`. Redirect URLs: `https://tidsklemma.vercel.app/**` og `http://localhost:3000/**`. Skal innlogging virke i forhåndsvisninger, legg til `https://*-<vercel-team>.vercel.app/**` med ditt eget team-navn – aldri et bredere mønster som `https://tidsklemma-*.vercel.app/**`, som også slipper gjennom andres prosjekter.
3. **Authentication → Passkeys**: slå på passkeys. Relying Party ID = `tidsklemma.vercel.app`, navn = `Tidsklemma`, origin = `https://tidsklemma.vercel.app`. Passkeys virker bare på produksjonsadressen; lokalt og i forhåndsvisninger brukes e-postlenken.
4. Legg inn brukerne under **Authentication → Users → Add user**. Appen lar bare eksisterende brukere logge inn.
5. Legg inn husstanden i **SQL Editor**:
   ```sql
   with h as (
     insert into public.households (name) values ('Evjeveien 28') returning id
   )
   insert into public.household_members (household_id, user_id)
   select h.id, u.id from h, auth.users u
   where u.email in ('...', '...');
   ```

**Vercel** (ett prosjekt, https://tidsklemma.vercel.app): Root Directory `apps/tidsklemma`, og miljøvariablene `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Production og Preview.

## Ny del

1. Lag `apps/tidsklemma/app/<del>/page.tsx`. Alle sider krever innlogging automatisk.
2. Legg delen til i `apps/tidsklemma/deler.ts`, så vises den på startsiden.
3. Lag en ny migrasjon i `supabase/migrations/` med delens eget schema, `grant usage on schema <del> to authenticated`, og RLS på alle tabeller.
4. Kjør `npx supabase db push`, legg schemaet til under **Project Settings → Data API → Exposed schemas**, og legg det til i `gen:types` i `packages/db/package.json`.

I koden når du delens tabeller med `supabase.schema("<del>").from("...")`.

## Regler

- Repoet er **offentlig**. Aldri commit `.env`-filer, nøkler eller passord.
- Bare `anon`/`publishable`-nøkkelen skal brukes i appen. `service_role` hører aldri hjemme i koden.
- Alle tabeller skal ha RLS. Bruk `public.is_household_member(household_id)` i policyene.
- Jobb i branches og merge via pull request. CI kjører typecheck og build på hver PR.
