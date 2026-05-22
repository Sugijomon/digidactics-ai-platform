# SAI Preview Deployment Runbook

Status: ready for first Vercel preview setup.

This runbook describes the first SAI preview deployment for the Digidactics AI
platform. It assumes the SAI pilot-hardening work is merged to `main`.

## GitHub Baseline

PR `#1` (`codex-sai-pilot-hardening -> main`) has been merged. Before deploying
or creating a new preview branch, confirm the latest `main` has a green
`SAI CI` run.

## Required GitHub Secrets

The `SAI CI` workflow accepts these public Supabase client values during build
and E2E checks:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is preferred. The legacy anon key remains
supported for compatibility.

Do not add a service-role key to GitHub Actions for the frontend CI job.

For pull-request CI only, the workflow has safe public placeholder fallbacks so
mocked E2E tests can run before staging secrets are configured. Real preview and
production deployments must use the actual Supabase project URL and publishable
browser key.

## Vercel Project

Create a Vercel project connected to the GitHub repository:

```txt
Sugijomon/digidactics-ai-platform
```

Project settings:

```txt
Framework Preset: Next.js
Root Directory: apps/sai
Install Command: corepack pnpm install --frozen-lockfile
Build Command: corepack pnpm --dir apps/sai build
Output Directory: .next
```

If Vercel detects the `apps/sai` root and manages commands automatically, keep
the generated settings only if the preview build matches the local build.

## Vercel Environment Variables

Set these in Vercel for Preview and Production:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

The publishable key should be the default browser key from the connected
Supabase project. Do not configure `SUPABASE_SERVICE_ROLE_KEY` unless a future
server-only route requires it and its use is documented.

## Supabase Auth URLs

After Vercel creates a preview URL, add the relevant URLs in Supabase Auth
configuration:

```txt
Site URL: production SAI URL when available
Redirect URLs:
- http://localhost:3000/**
- http://127.0.0.1:3000/**
- https://*.vercel.app/**
```

For tighter production hardening, replace the wildcard preview entry with exact
preview and production domains once stable.

## Preview Acceptance

Run these checks on the Vercel preview:

1. Open `/survey`.
2. Start a run with the pilot wave token.
3. Complete the respondent flow with at least one tool.
4. Confirm completion does not expose the submission token.
5. Confirm Supabase writes `risk_result` and `risk_result_tool`.
6. Sign in as a DPO test user.
7. Open `/dashboard/activatie`.
8. Open `/dashboard/tools`.
9. Open `/dashboard/risicoprofiel`.
10. Confirm dashboards show organization-level signals only and suppress small clusters.

## Known Blockers

- No Vercel project currently exists for `digidactics-ai-platform` in the
  connected `Digidactics' projects` team.
- The Vercel project still needs to be created/linked and configured with
  `apps/sai` as the root directory.
