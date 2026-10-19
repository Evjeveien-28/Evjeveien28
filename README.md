# Tidsklemma

Tidsklemma er serien med hjemme-appene våre i Evjeveien 28. Dette er monorepoet for dem: pnpm + Turborepo + Next.js + Supabase, deployet på Vercel.

Alle appene deler ett Supabase-prosjekt: innlogging og husstand ligger i `public`, og hver app får sitt eget schema. Hver app er sitt eget Vercel-prosjekt.

## Struktur

```
apps/                  Én Next.js-app per mappe (ingen ennå)
packages/
  ui/                  Delte React-komponenter (@hjem/ui)
  db/                  Supabase-klienter for nettleser, server og proxy (@hjem/db)
  config/              Felles TypeScript-oppsett (@hjem/config)
supabase/
  migrations/          Databaseskjema. Felles tabeller i `public`, ett schema per app.
```

## Kom i gang

```bash
pnpm install
pnpm typecheck
```

## Ny app

1. Lag `apps/<navn>/` med:
   - `package.json` med `name`, en egen port i `dev`-skriptet (`next dev --port 30xx`), og avhengigheter til `@hjem/db`, `@hjem/ui` (`workspace:*`), `next`, `react` og `react-dom`, samt `@hjem/config` som dev-avhengighet.
   - `tsconfig.json` som utvider `@hjem/config/tsconfig.nextjs.json`.
   - `next.config.ts` med `transpilePackages: ["@hjem/ui", "@hjem/db"]`.
   - `.env.example` med `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - `proxy.ts` som holder innloggingen fornyet:
     ```ts
     import type { NextRequest } from "next/server";
     import { updateSession } from "@hjem/db/proxy";

     export function proxy(request: NextRequest) {
       return updateSession(request);
     }

     export const config = {
       matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
     };
     ```
2. Lag en ny migrasjon i `supabase/migrations/` med appens eget schema, `grant usage on schema <navn> to authenticated`, og RLS på alle tabeller.
3. Kjør `npx supabase db push`, legg schemaet til under **Project Settings → Data API → Exposed schemas** i Supabase, og legg det til i `gen:types` i `packages/db/package.json`.
4. Opprett et nytt Vercel-prosjekt fra dette repoet med Root Directory `apps/<navn>` og de to miljøvariablene.

I koden når du appens tabeller med `supabase.schema("<navn>").from("...")`.

## Husstand

Husstand og medlemmer legges inn manuelt i Supabase SQL Editor, etter at brukerne finnes under Authentication → Users:

```sql
with h as (
  insert into public.households (name) values ('Evjeveien 28') returning id
)
insert into public.household_members (household_id, user_id)
select h.id, u.id from h, auth.users u
where u.email in ('...', '...');
```

## Regler

- Repoet er **offentlig**. Aldri commit `.env`-filer, nøkler eller passord.
- Bare `anon`/`publishable`-nøkkelen skal brukes i appene. `service_role` hører aldri hjemme i koden.
- Alle tabeller skal ha RLS. Bruk `public.is_household_member(household_id)` i policyene.
- Jobb i branches og merge via pull request. CI kjører typecheck og build på hver PR.
