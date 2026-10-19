# Tidsklemma

Tidsklemma er hjemme-appen i Evjeveien 28: én Next.js-app (`apps/tidsklemma`) med flere deler.

Les `README.md` for struktur, oppskrift på ny del og reglene. Det viktigste:

- Repoet er offentlig: aldri commit `.env`-filer, nøkler eller passord.
- Bare `anon`/`publishable`-nøkkelen i appene, aldri `service_role`.
- Alle tabeller skal ha RLS med `public.is_household_member(household_id)`.
- Databaseendringer kjøres ved å lime migrasjonen inn i Supabase SQL Editor, ikke med Supabase CLI.
- Hver del har sin egen mappe under `apps/tidsklemma/app/` og sitt eget schema i Supabase.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
