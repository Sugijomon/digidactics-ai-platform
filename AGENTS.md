# AGENTS.md

## Project

This repository contains the Digidactics AI governance platform.

The first product is SAI: Shadow AI Scan and AI Literacy intake. SAI is the first product/module of the broader RAI / RouteAI platform, not a throwaway prototype.

The second product is RAI / RouteAI: the broader Responsible AI governance platform for Dutch SMEs, including model/tool governance, policy workflows, evidence, AI Act routing, training, and accountability.

## Source Of Truth

GitHub is the source of truth for code, schema, migrations, product decisions, and domain knowledge.

Codex local sessions and ChatGPT mobile conversations are temporary working context. Important decisions must be documented in the repository.

Update `docs/domain-decisions.md` when a change affects:

- risk scoring logic
- EU AI Act interpretation
- product boundaries between SAI and RAI
- Supabase schema or RLS
- dashboard KPIs
- auditability or evidence storage
- user-facing governance language

Update `docs/risk-engine-spec.md` when scoring logic changes.

Update Supabase migration files when schema or RLS changes.

## Architecture

- Monorepo with Next.js apps.
- Apps live in `apps/`.
- Shared logic lives in `packages/`.
- Supabase migrations live in `supabase/migrations/`.
- Durable project knowledge lives in `docs/`.

Expected structure:

```txt
apps/
  sai/
  rai/
  marketing/
packages/
  auth/
  database/
  domain/
  ui/
  config/
supabase/
  migrations/
  functions/
docs/
```

Start with `apps/sai`, `packages/domain`, `packages/database`, `packages/auth`, `packages/ui`, `supabase/migrations`, and `docs`.

`apps/rai` may start as a placeholder until the RouteAI platform surface is ready.

## Development Rules

- Do not duplicate business logic inside individual apps.
- Shared scoring logic belongs in `packages/domain`.
- Shared Supabase clients, generated types, query helpers, and repository functions belong in `packages/database`.
- Shared auth helpers, role definitions, permission checks, and session helpers belong in `packages/auth`.
- Shared UI primitives belong in `packages/ui`.
- App-specific pages and composed experiences live under the relevant app, starting with `apps/sai`.
- Keep SAI commercially simple, but build it on the same technical foundation as RAI.
- Inspect existing schema, types, and docs before changing implementation.
- Prefer minimal, targeted changes.
- Do not change unrelated UI.
- Do not use mock data in production components unless it is explicitly marked as fixture/demo data.
- Run typecheck/build/tests when possible.

## Domain Rules

- Unknown tools are not automatically prohibited.
- Keep `org_policy_status` separate from EU AI Act prohibited or high-risk signals.
- GPAI status is metadata, not a route factor by itself.
- Risk emerges from the combination of tool status, use case, data type, account type, context, frequency, automation, extensions, and governance maturity.
- Human-in-the-loop review is required for uncertain, low-confidence, prohibited, or high-impact cases.
- Do not hard-code legal conclusions in UI copy without documenting the rationale.

## Next.js Rules

- Use Next.js App Router.
- Server Components and server actions/route handlers are preferred for auth checks, trusted Supabase reads/writes, scoring, and audit logging.
- Client Components are for interaction: forms, filters, drawers, charts, dropdowns, and local UI state.
- Risk scoring must not rely solely on client-side execution.
- Use `@supabase/ssr` for Next.js auth.
- Use server-only secrets only in server contexts.

## Supabase Rules

- RLS is the security boundary.
- New tables must have RLS enabled.
- Policies must be explicit and org-scoped where applicable.
- Service role keys must never be exposed client-side.
- Schema and RLS changes must be represented as migrations.

## Additional Project Documents

Before making domain-level changes, read:

- `docs/domain-decisions.md`
- `docs/architecture.md`
- `docs/risk-engine-spec.md`
- `docs/development-workflow.md`

