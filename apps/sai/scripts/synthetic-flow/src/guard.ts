// Host classification helper for the synthetic-flow script.
//
// This cannot reliably distinguish a staging Supabase project ref from a
// production one by URL shape alone (both are opaque <ref>.supabase.co
// hosts). It only recognizes local hosts; everything else is treated as
// "not local" and must go through the explicit --target/--confirm/
// --i-know-this-is-staging authorization in ./authorization.ts. Always
// verify the Supabase URL yourself before confirming a write run.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

export type HostInfo = {
  host: string;
  isLocal: boolean;
};

export function resolveHostInfo(supabaseUrl: string): HostInfo {
  let host: string;
  try {
    host = new URL(supabaseUrl).hostname;
  } catch {
    throw new Error(
      `Could not parse --supabase-url / NEXT_PUBLIC_SUPABASE_URL as a URL: "${supabaseUrl}"`,
    );
  }

  return { host, isLocal: LOCAL_HOSTS.has(host) };
}
