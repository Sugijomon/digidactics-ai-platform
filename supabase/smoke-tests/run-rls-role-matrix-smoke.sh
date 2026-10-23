#!/usr/bin/env bash
# =============================================================================
# LOCAL/STAGING ONLY — do NOT run against a production database URL.
# =============================================================================
# Guarded wrapper around
#   supabase/smoke-tests/20260708120000_rls_role_matrix_smoke.sql
#
# Refuses to run unless the target host looks local, or the caller passes
# --i-know-this-is-staging explicitly. See docs/sai-rls-smoke-runbook.md for
# the full staging test-user and psql-variable setup this script depends on.
#
# Usage:
#   supabase/smoke-tests/run-rls-role-matrix-smoke.sh \
#     --db-url "<db-url>" \
#     --i-know-this-is-staging \
#     --other-org-id <uuid> \
#     --dpo-user-id <uuid> \
#     --org-admin-user-id <uuid> \
#     --regular-user-id <uuid> \
#     --super-admin-user-id <uuid> \
#     [--smoke-org-id <uuid>]
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/20260708120000_rls_role_matrix_smoke.sql"

DB_URL=""
CONFIRM_STAGING="false"
SMOKE_ORG_ID="00000000-0000-0000-0000-000000000101"
OTHER_ORG_ID=""
DPO_USER_ID=""
ORG_ADMIN_USER_ID=""
REGULAR_USER_ID=""
SUPER_ADMIN_USER_ID=""

print_help() {
  cat <<'EOF'
Guarded wrapper for the SAI RLS role matrix smoke test (local/staging only).

Required flags:
  --db-url <url>                Local or staging Postgres connection string.
  --other-org-id <uuid>         A different, existing organization id.
  --dpo-user-id <uuid>          auth.users.id with a dpo row in the smoke org.
  --org-admin-user-id <uuid>    auth.users.id with an org_admin row in the smoke org.
  --regular-user-id <uuid>      auth.users.id with a user row in the smoke org.
  --super-admin-user-id <uuid>  auth.users.id with a super_admin row.

Optional flags:
  --smoke-org-id <uuid>         Defaults to 00000000-0000-0000-0000-000000000101.
  --i-know-this-is-staging      Required when --db-url is not a local host.
  -h, --help                    Show this help.

See docs/sai-rls-smoke-runbook.md for how to create the staging test users
and user_roles rows this script expects.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-url) DB_URL="$2"; shift 2 ;;
    --i-know-this-is-staging) CONFIRM_STAGING="true"; shift ;;
    --smoke-org-id) SMOKE_ORG_ID="$2"; shift 2 ;;
    --other-org-id) OTHER_ORG_ID="$2"; shift 2 ;;
    --dpo-user-id) DPO_USER_ID="$2"; shift 2 ;;
    --org-admin-user-id) ORG_ADMIN_USER_ID="$2"; shift 2 ;;
    --regular-user-id) REGULAR_USER_ID="$2"; shift 2 ;;
    --super-admin-user-id) SUPER_ADMIN_USER_ID="$2"; shift 2 ;;
    -h|--help) print_help; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; print_help; exit 1 ;;
  esac
done

if [[ -z "$DB_URL" ]]; then
  echo "Missing required --db-url." >&2
  exit 1
fi
if [[ -z "$OTHER_ORG_ID" || -z "$DPO_USER_ID" || -z "$ORG_ADMIN_USER_ID" || -z "$REGULAR_USER_ID" || -z "$SUPER_ADMIN_USER_ID" ]]; then
  echo "Missing one or more required user/org id flags. Run with --help." >&2
  exit 1
fi

# -----------------------------------------------------------------------------
# Production guard.
# -----------------------------------------------------------------------------
# This cannot reliably tell a staging Supabase project ref from a production
# one by URL shape alone (both are opaque <ref>.supabase.co hosts). Local
# hosts are allowed automatically; anything else requires an explicit human
# confirmation flag. This is a deliberate speed bump, not a technical
# guarantee — always verify --db-url by hand before passing
# --i-know-this-is-staging.
HOST="$(printf '%s' "$DB_URL" | sed -E 's#^[a-zA-Z]+://([^@]*@)?([^:/]+).*#\2#')"

case "$HOST" in
  localhost|127.0.0.1|::1|db|host.docker.internal)
    IS_LOCAL="true"
    ;;
  *)
    IS_LOCAL="false"
    ;;
esac

if [[ "$IS_LOCAL" != "true" && "$CONFIRM_STAGING" != "true" ]]; then
  cat >&2 <<EOF
Refusing to run: --db-url host "${HOST}" does not look local, and
--i-know-this-is-staging was not passed.

This script only runs automatically against localhost/127.0.0.1/::1. For any
other host (including staging Supabase projects), pass
--i-know-this-is-staging explicitly after you have verified the URL yourself.

NEVER run this against a production database URL.
EOF
  exit 1
fi

echo "Target host: ${HOST} (local=${IS_LOCAL}, confirmed-staging=${CONFIRM_STAGING})"
echo "Running RLS role matrix smoke test..."

psql "$DB_URL" -v ON_ERROR_STOP=1 \
  -v smoke_org_id="$SMOKE_ORG_ID" \
  -v other_org_id="$OTHER_ORG_ID" \
  -v dpo_user_id="$DPO_USER_ID" \
  -v org_admin_user_id="$ORG_ADMIN_USER_ID" \
  -v regular_user_id="$REGULAR_USER_ID" \
  -v super_admin_user_id="$SUPER_ADMIN_USER_ID" \
  -f "$SQL_FILE"
