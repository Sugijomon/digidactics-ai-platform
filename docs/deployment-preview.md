# SAI Preview Deployment Runbook

Status: ready for first Vercel preview setup.

This runbook describes the first SAI preview deployment for the Digidactics AI
platform. It assumes the GitHub branch is already pushed and a pull request is
opened against `main`.

## GitHub PR

Open a pull request from:

```txt
codex-sai-pilot-hardening -> main
```

The GitHub connector in Codex could not create the PR because the installed
integration does not have pull-request write access for this repository. Use the
GitHub web UI:

```txt
https://github.com/Sugijomon/digidactics-ai-platform/pull/new/codex-sai-pilot-hardening
```

## Required GitHub Secrets

The `SAI CI` workflow uses these public Supabase client values during build and
E2E checks:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is preferred. The legacy anon key remains
supported for compatibility.

Do not add a service-role key to GitHub Actions for the frontend CI job.

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

- Codex cannot currently create the GitHub PR through the installed GitHub
  integration because the integration returned `403 Resource not accessible by
  integration`.
- The Vercel CLI is not installed locally in this workspace, and no Vercel
  project/deployment connector tools are currently exposed to Codex.
