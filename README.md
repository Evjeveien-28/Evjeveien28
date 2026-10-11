# Evjeveien 28

Monorepo for hjemme-appene våre. pnpm + Turborepo + Next.js + Supabase, deployet på Vercel.

## Struktur

```
apps/
  middagsplanlegger/   Next.js-app (Vercel Root Directory: apps/middagsplanlegger)
packages/
  ui/                  Delte React-komponenter (@hjem/ui)
  db/                  Supabase-klienter for nettleser og server (@hjem/db)
  config/              Felles TypeScript-oppsett (@hjem/config)
supabase/
  migrations/          Databaseskjema. Felles tabeller i `public`, ett schema per app.
```

## Kom i gang

```bash
pnpm install
cp apps/middagsplanlegger/.env.example apps/middagsplanlegger/.env.local   # fyll inn Supabase-nøkler
pnpm dev
```

Middagsplanleggeren kjører på http://localhost:3001.

## Ny app

1. Kopier `apps/middagsplanlegger` til `apps/<navn>` og endre `name` og port i `package.json`.
2. Lag et nytt schema i en ny migrasjon i `supabase/migrations/`.
3. Opprett et nytt Vercel-prosjekt fra dette repoet med Root Directory `apps/<navn>`.

## Regler

- Repoet er **offentlig**. Aldri commit `.env`-filer, nøkler eller passord.
- Bare `anon`/`publishable`-nøkkelen skal brukes i appene. `service_role` hører aldri hjemme i koden.
- Alle tabeller skal ha RLS. Bruk `public.is_household_member(household_id)` i policyene.
- Jobb i branches og merge via pull request.
