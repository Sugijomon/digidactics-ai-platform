# Architecture

## Strategic Direction

The platform starts with SAI: Shadow AI Scan and AI Literacy intake.

SAI will later grow into, or connect directly with, RAI / RouteAI: the broader Responsible AI governance platform.

Commercially, SAI can be sold as a focused scan product. Technically, SAI is built as the first module of the larger platform.

Core principle:

```txt
SAI apart verkopen, maar niet apart bouwen.
```

## Repository Model

This repository uses a monorepo model:

```txt
digidactics-ai-platform/
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

## Apps

### `apps/sai`

The first product surface:

- Shadow AI Scan
- AI Literacy / awareness intake
- survey flow
- tool-use inventory
- account type and data exposure capture
- risk scoring
- DPO dashboard light
- report/export later

### `apps/rai`

The broader RouteAI platform, added later:

- organization AI policy
- tool approval workflows
- model/tool library
- AI Act risk register
- evidence management
- accountability passport
- governance workflows
- training and proficiency dashboards

### `apps/marketing`

Optional future Next.js marketing surface. Marketing can remain outside this monorepo for now if WordPress/DigitalOcean stays in place.

## Shared Packages

### `packages/domain`

All reusable domain logic:

- risk engine
- scoring
- EU AI Act assumptions
- policy status logic
- tool status logic
- governance rules

Examples:

```txt
calculateShadowScore()
calculateExposureScore()
calculatePriorityScore()
classifyToolStatus()
detectHighRiskSignal()
```

### `packages/database`

Supabase and database access:

- generated database types
- browser/server Supabase clients where shared
- query helpers
- repository functions
- table-specific access helpers

### `packages/auth`

Shared auth and role logic:

- roles
- permissions
- org membership helpers
- server-side auth helpers
- session helpers

### `packages/ui`

Shared UI primitives:

- buttons
- cards
- badges
- risk pills
- dashboard KPI cards
- question cards
- table primitives

SAI and RAI should share a visual language, while allowing different product complexity.

## Next.js App Router

Each app uses the Next.js App Router. Example for SAI:

```txt
apps/sai/
  app/
    layout.tsx
    page.tsx
    scan/
      page.tsx
      actions.ts
    dashboard/
      page.tsx
    admin/
      shadow/
        activatie/
          page.tsx
        tools/
          page.tsx
        risicoprofiel/
          page.tsx
  components/
  lib/
  types/
```

Routes, layouts, and server-side data loading belong in `app/`.

App-specific components belong in the app's `components/`.

Reusable logic belongs in `packages/`.

## Server And Client Boundary

Server-side:

- auth/session checks
- trusted Supabase reads/writes
- scan submission
- risk scoring
- audit/event logging
- route handlers
- server actions

Client-side:

- multi-step scan interaction
- form state
- filters
- dropdowns
- charts
- drawers/modals
- temporary UI state

Risk scoring must not depend solely on client-side execution.

## Supabase

The platform uses one shared Supabase database designed modularly for SAI and RAI.

SAI initially needs:

- organizations
- user profiles / memberships
- scan campaigns
- survey runs/responses
- survey tools/use cases/contexts/data types
- risk results
- tool catalog / org tool catalog

RAI later adds:

- policies
- policy rules
- policy exceptions
- evidence files
- audit events
- training modules
- model/typekaart library
- governance workflows

RLS is mandatory for all product tables.

## Deployment

Vercel should use separate projects per app inside the monorepo:

```txt
Vercel project: sai -> Root Directory: apps/sai
Vercel project: rai -> Root Directory: apps/rai
Vercel project: marketing -> Root Directory: apps/marketing
```

This allows independent deployments from one shared codebase.

