# Development Workflow

## Working Modes

The project uses different tools for different kinds of work.

### Laptop With Codex App

Primary implementation environment.

Use local Codex for:

- editing files
- creating branches
- preparing commits and PRs
- adjusting Supabase config and migrations
- running `npm run dev`, typecheck, build, and tests
- debugging Vercel build errors
- using local `.env` files
- implementing risk engine, dashboards, RLS, migrations, and routes

### Mobile ChatGPT

Analysis and planning environment.

Use mobile ChatGPT for:

- architecture discussions
- UX and dashboard reasoning
- risk-engine design
- EU AI Act nuance
- prompts for Codex
- reviewing pasted code or errors
- test plans
- documentation drafts

Mobile ChatGPT is not a replacement for local Codex. It cannot use local files, local `.env`, local dev server, or Supabase CLI unless that information is pasted or available through a connected repo.

## Shared Memory Model

Do not rely on chat history as project memory.

Use:

1. GitHub commits
2. pull requests
3. `docs/domain-decisions.md`
4. `docs/architecture.md`
5. `docs/risk-engine-spec.md`
6. Supabase migration files
7. `AGENTS.md`

## Codex Instructions

Codex reads repository instructions from `AGENTS.md`.

`AGENTS.md` is the Codex equivalent of a durable project instruction file. It should stay compact, directive, and stable.

Other docs provide deeper project knowledge and should be referenced from `AGENTS.md`.

## Branching

Keep branching simple:

```txt
main
feature/*
fix/*
docs/*
```

Recommended early branches:

```txt
docs/project-foundation
feature/monorepo-foundation
feature/sai-scan-flow
feature/supabase-schema-v1
feature/risk-engine-v1
feature/dpo-dashboard
```

Even in solo development, pull requests are useful as audit trails.

## Environment Variables

Commit `.env.example`, never real secrets.

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_ENV=
NEXT_PUBLIC_PRODUCT=
```

`SUPABASE_SERVICE_ROLE_KEY` must only be used server-side.

## Vercel

Deploy each app as its own Vercel project from the monorepo:

```txt
apps/sai -> SAI project
apps/rai -> RAI project
apps/marketing -> marketing project
```

Each Vercel project gets its own root directory and environment variables.

## Supabase

Use migrations for schema and RLS.

RLS is the security boundary. Client-side checks are for UX only.

New product tables should be designed with SAI and RAI modularity in mind.

