export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function hasSupabaseEnv() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function getRequiredSupabaseEnv() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing public Supabase environment variables.");
  }

  return {
    supabaseKey,
    supabaseUrl,
  };
}
