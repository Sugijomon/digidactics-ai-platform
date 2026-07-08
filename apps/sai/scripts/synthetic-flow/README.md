# SAI synthetic-flow script

LOCAL/STAGING ONLY. Plays the scenarios documented in
[`docs/sai-synthetic-flow-testplan.md`](../../../../docs/sai-synthetic-flow-testplan.md)
against the `SAI Synthetic Pilot Organisatie` (see
[`docs/sai-synthetic-pilot-organisatie.md`](../../../../docs/sai-synthetic-pilot-organisatie.md))
through the real respondent RPC flow — the same `start_survey_run` /
`save_*` / `complete_survey_run` sequence used by
`apps/sai/lib/sai-rpc/client.ts` and the live `/survey` UI.

It never writes directly to `survey_run`, `risk_result`, `dpo_review_items`,
or any other result table — those are all produced server-side by
`public.calculate_v8_score(...)` as a side effect of `complete_survey_run`.
It only ever authenticates as `anon`, using the public
publishable/anon key — the same security boundary the real respondent flow
uses. No service-role key is read anywhere in this script.

## Prerequisites

1. Apply all `supabase/migrations/*` in order.
2. Apply the reference seed:
   `supabase/seed/20260505_v8_1_reference_seed.sql`.
3. Apply the org/wave/tool-policy fixture:
   `supabase/seed/20260708130000_sai_synthetic_pilot_org_fixture.sql`.

## Build and run

**Default behavior is dry run.** Without `--target`, the script only prints
the planned scenario runs (which scenarios, how many, which departments) and
makes zero Supabase calls — no env vars are even required:

```bash
corepack pnpm --dir apps/sai seed:synthetic-flow -- --scenario all
```

To actually write data, you must pass **both** `--target local|staging`
**and** `--confirm`. `--target staging` additionally requires
`--i-know-this-is-staging` as a second, independent confirmation. Any
mismatch between the declared `--target` and the Supabase URL's host (e.g.
`--target local` against a non-local URL) is a hard failure, not a warning.

```bash
# Local Supabase (supabase start), explicit opt-in required:
corepack pnpm --dir apps/sai seed:synthetic-flow -- \
  --wave-token sai-synthetic-pilot-wave-token \
  --target local --confirm \
  --scenario all

# Staging, explicit opt-in required twice:
corepack pnpm --dir apps/sai seed:synthetic-flow -- \
  --wave-token sai-synthetic-pilot-wave-token \
  --target staging --confirm --i-know-this-is-staging \
  --scenario all
```

This runs `tsc -p scripts/synthetic-flow/tsconfig.json` (compiles
`src/*.ts` to `dist/*.js`, following the same tsc-then-node convention as
`packages/domain`) and then `node scripts/synthetic-flow/dist/run.js` with
whatever arguments follow `--`.

Run a single scenario, with an overridden respondent count:

```bash
corepack pnpm --dir apps/sai seed:synthetic-flow -- \
  --wave-token sai-synthetic-pilot-wave-token \
  --target staging --confirm --i-know-this-is-staging \
  --scenario approved-low-risk \
  --repeat 5 \
  --department finance_legal
```

Run `node scripts/synthetic-flow/dist/run.js --help` (after building) for
the full flag list and scenario id list.

## Env vars

Reads the same public env vars as the app:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
NEXT_PUBLIC_SAI_DEFAULT_WAVE_TOKEN     (optional fallback for --wave-token)
```

`--supabase-url` / `--supabase-anon-key` override the env vars if you need to
point at a different project than your local `.env`.

## Write authorization (production guard)

No `.env`/`.env.local` file or Supabase key value is ever read or printed by
this script or by this document — only the env var *names* below are
documented, and only the resolved URL *hostname* is ever logged.

Default posture is dry run / hard fail, per the rule "a script that writes
data must default to dry-run or hard-fail unless an explicit
`--target local|staging` and a confirmation flag are given":

1. No `--target` → dry run. Prints the plan, calls nothing, exits 0.
2. `--target <x>` without `--confirm` → hard fail, no writes attempted.
3. `--target local --confirm` → writes only if the resolved Supabase URL
   host is actually local (`localhost`/`127.0.0.1`/`::1`); otherwise hard
   fail.
4. `--target staging --confirm` → additionally requires
   `--i-know-this-is-staging`; otherwise hard fail. Also hard-fails if the
   resolved host looks local (target/host mismatch).

`--confirm` and `--i-know-this-is-staging` are CLI-flag-only — there is no
env var alternative for either. A write run must be an explicit,
per-invocation flag on the command line, never something a stray or
inherited env var can enable.

See `src/authorization.ts` for the exact logic. This is a human confirmation
step, not a technical guarantee that a URL is not production — always verify
the URL yourself first. Same shape as
`supabase/smoke-tests/run-rls-role-matrix-smoke.sh`.
