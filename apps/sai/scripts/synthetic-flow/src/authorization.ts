// Write authorization gate for the synthetic-flow script.
//
// Default posture: DRY RUN. This script never writes data unless the caller
// passes --target local|staging AND --confirm explicitly. --target staging
// additionally requires --i-know-this-is-staging as a second, independent
// confirmation, and --target local additionally requires the resolved
// Supabase URL host to actually look local — a mismatch between the declared
// target and the observed host is treated as a hard failure, not a warning.
//
// --confirm and --i-know-this-is-staging are CLI-flag-only by design: there
// is no env var fallback for either. A write run must be an explicit,
// per-invocation human action, not something a stray/inherited env var can
// silently enable.
//
// NEVER run this script against a production Supabase project. Nothing in
// this module reads or logs env var values beyond the hostname it needs to
// classify.

import { resolveHostInfo } from "./guard";

export type Target = "local" | "staging";

export type Authorization =
  | { mode: "dry-run" }
  | { mode: "write"; target: Target; host: string };

export function resolveAuthorization(options: {
  targetArg: string | undefined;
  confirmWrite: boolean;
  confirmedStaging: boolean;
  supabaseUrl: string | undefined;
}): Authorization {
  if (!options.targetArg) {
    return { mode: "dry-run" };
  }

  if (options.targetArg !== "local" && options.targetArg !== "staging") {
    throw new Error(
      `Invalid --target "${options.targetArg}". Use "local" or "staging".`,
    );
  }
  const target: Target = options.targetArg;

  if (!options.confirmWrite) {
    throw new Error(
      [
        `--target ${target} was given but --confirm was not.`,
        "Refusing to write data.",
        "",
        "Pass --confirm explicitly to acknowledge this run will write real rows",
        "to the target database. There is no env var alternative to this flag.",
      ].join("\n"),
    );
  }

  if (!options.supabaseUrl) {
    throw new Error(
      "Missing Supabase URL: pass --supabase-url or set NEXT_PUBLIC_SUPABASE_URL.",
    );
  }

  const { host, isLocal } = resolveHostInfo(options.supabaseUrl);

  if (target === "local" && !isLocal) {
    throw new Error(
      [
        `--target local was given, but Supabase URL host "${host}" does not`,
        "look local (localhost/127.0.0.1/::1). Refusing to write.",
        "",
        "Use --target staging instead if this is intentional, after verifying",
        "the URL yourself.",
      ].join("\n"),
    );
  }

  if (target === "staging") {
    if (isLocal) {
      throw new Error(
        [
          `--target staging was given, but Supabase URL host "${host}" looks`,
          "local. Use --target local instead, or double-check --supabase-url.",
        ].join("\n"),
      );
    }

    if (!options.confirmedStaging) {
      throw new Error(
        [
          "--target staging requires --i-know-this-is-staging as an extra,",
          "independent confirmation on top of --confirm. There is no env var",
          "alternative to this flag.",
          "",
          "This cannot technically prove host \"" + host + "\" is not",
          "production — only you can verify that. NEVER run this against a",
          "production Supabase project.",
        ].join("\n"),
      );
    }
  }

  console.log(`Write run authorized: target=${target} host=${host}`);
  return { mode: "write", target, host };
}
