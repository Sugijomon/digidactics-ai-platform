// Env resolution for the synthetic-flow script.
//
// Deliberately mirrors apps/sai/lib/supabase/env.ts: only the public
// anon/publishable key is used, matching the real respondent flow's
// anon-only RPC surface. No SUPABASE_SERVICE_ROLE_KEY is read anywhere in
// this script.

export type ResolvedEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function resolveEnv(overrides: {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}): ResolvedEnv {
  const supabaseUrl =
    overrides.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    overrides.supabaseAnonKey ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing Supabase URL: pass --supabase-url or set NEXT_PUBLIC_SUPABASE_URL.",
    );
  }
  if (!supabaseAnonKey) {
    throw new Error(
      "Missing Supabase anon key: pass --supabase-anon-key or set " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}
