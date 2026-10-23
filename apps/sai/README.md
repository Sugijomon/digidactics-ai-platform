# SAI Next.js App

This is the Shadow AI Scan frontend for the Digidactics AI Platform.

## Environment

Create `apps/sai/.env.local` for local development:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SAI_DEFAULT_WAVE_TOKEN=
SAI_ENABLE_DEV_ROUTES=
```

Prefer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for new setup. `NEXT_PUBLIC_SUPABASE_ANON_KEY` remains supported for legacy/local compatibility. Do not add a `service_role` key to frontend or client-visible environment files.

`NEXT_PUBLIC_SAI_DEFAULT_WAVE_TOKEN` is optional and should normally stay empty
for production. Set it only for local/staging smoke flows where pre-filling the
access code is intentional.

`SAI_ENABLE_DEV_ROUTES=true` enables `/dev/rpc` and `/dev/auth`. Leave it empty
or set it to `false` for production.

## Local Development

From the repository root:

```bash
corepack pnpm --dir apps/sai dev
corepack pnpm --dir apps/sai lint
corepack pnpm --dir apps/sai build
```

If `pnpm` is available on PATH, the root scripts can also be used:

```bash
pnpm dev:sai
pnpm lint:sai
pnpm build:sai
```

## Auth Foundation

The app uses `@supabase/ssr` for Next.js App Router auth:

- `lib/supabase/client.ts` creates the browser client for Client Components.
- `lib/supabase/server.ts` creates the server client for Server Components, Server Actions, and Route Handlers.
- `proxy.ts` refreshes Supabase auth cookies for requests.
- `lib/supabase/get-user-role.ts` loads the authenticated user's `role` and `org_id` from `public.user_roles`.
- `components/auth-provider.tsx` and `hooks/use-auth.ts` expose client-side auth state for UI only.

Server-side role checks remain authoritative. Client auth state is only for rendering UI state.

## RLS And RPC Boundary

RLS remains the database security boundary.

Anonymous respondent survey writes must go through the safe RPC flow documented in `docs/rpc-flow-contract.md`. Do not write directly from anon clients to survey tables. The respondent flow should keep `run_id` and `submission_token` only as active survey state and clear the token after completion.

For manual development checks, open `/dev/rpc`. It runs the minimal respondent
RPC smoke flow and masks the submission token in the UI. Set
`NEXT_PUBLIC_SAI_DEFAULT_WAVE_TOKEN=sai-smoke-wave-token` locally if you want the
smoke token pre-filled. In a production build, `/dev/rpc` and `/dev/auth` return
404 unless `SAI_ENABLE_DEV_ROUTES=true` is explicitly configured.

## Respondent Survey Status

The respondent survey is implemented as a safe RPC-only flow:

```text
/survey
  -> /survey/profile
  -> /survey/motivations
  -> /survey/data
  -> /survey/tools
  -> /survey/use-cases
  -> /survey/accounts
  -> /survey/complete
```

Current pilot-hardening behavior:

- The start page can resume an active respondent session and shows only non-sensitive progress details.
- `submission_token` is never rendered.
- Corrupt respondent session state in `sessionStorage` is cleared automatically.
- Guarded routes redirect respondents back to the first valid open step and show a short explanation.
- Completion calls `complete_survey_run`, verifies that the session is closed, then clears local respondent state.

The survey can register multiple tools. Tool selection, use cases, context, and account status are separate steps to match the V8.1 survey structure.

## QA Commands

From the repository root:

```bash
corepack pnpm --dir apps/sai lint
corepack pnpm --dir apps/sai build
corepack pnpm --dir apps/sai test:e2e
```

The E2E suite mocks Supabase RPC calls and covers the full respondent flow,
route guards, resume behavior, validation states, multiple tools, and token
hiding. It starts its own dev server by default; set
`SAI_E2E_REUSE_SERVER=true` only when you deliberately want to test against an
already running local server.

For local production-preview QA:

```bash
corepack pnpm --dir apps/sai build
corepack pnpm --dir apps/sai start --hostname 127.0.0.1 --port 3002
```

Then open `http://127.0.0.1:3002/survey`.
