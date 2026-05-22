import { createBrowserClient } from "@supabase/ssr";
import { getRequiredSupabaseEnv, hasSupabaseEnv } from "./env";

export function hasSupabaseBrowserEnv() {
  return hasSupabaseEnv();
}

export function createClient() {
  const { supabaseKey, supabaseUrl } = getRequiredSupabaseEnv();

  return createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
}
