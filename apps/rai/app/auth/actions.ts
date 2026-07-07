"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = String(formData.get("next") ?? "/learning");

  if (!email) {
    redirect(`/auth/login?error=${encodeURIComponent("E-mailadres ontbreekt")}`);
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect(`/auth/login?error=${encodeURIComponent("Supabase is niet geconfigureerd")}`);
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "http://localhost:3010";
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
}

export async function signOut() {
  const supabase = await getSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/learning");
}
