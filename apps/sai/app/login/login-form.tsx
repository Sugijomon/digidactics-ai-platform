"use client";

import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { createClient, hasSupabaseBrowserEnv } from "@/lib/supabase/client";

type LoginMode = "password" | "magic";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";
  const callbackError = searchParams.get("error");
  const isSupabaseConfigured = useMemo(() => hasSupabaseBrowserEnv(), []);
  const supabase = useMemo(
    () => (isSupabaseConfigured ? createClient() : null),
    [isSupabaseConfigured],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<LoginMode>("password");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    getInitialError(isSupabaseConfigured, callbackError),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setError("Supabase instellingen ontbreken.");
      return;
    }

    setStatus("loading");
    setError(null);
    setMessage(null);

    if (mode === "password") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setStatus("idle");
        setError(getFriendlyAuthError(signInError.message));
        return;
      }

      router.replace(nextPath);
      router.refresh();
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      nextPath,
    )}`;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false,
      },
    });

    if (otpError) {
      setStatus("idle");
      setError(getFriendlyAuthError(otpError.message));
      return;
    }

    setStatus("success");
    setMessage("Magic link verzonden. Controleer je e-mail om verder te gaan.");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:p-8">
      <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
        <ModeButton
          active={mode === "password"}
          label="Wachtwoord"
          onClick={() => setMode("password")}
        />
        <ModeButton
          active={mode === "magic"}
          label="Magic link"
          onClick={() => setMode("magic")}
        />
      </div>

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <label className="grid gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            E-mailadres
          </span>
          <input
            autoComplete="email"
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#0E5A75] focus:ring-4 focus:ring-[#bfe7ff]/50"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="naam@organisatie.nl"
            required
            type="email"
            value={email}
          />
        </label>

        {mode === "password" ? (
          <label className="grid gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Wachtwoord
            </span>
            <span className="relative">
              <input
                autoComplete="current-password"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#0E5A75] focus:ring-4 focus:ring-[#bfe7ff]/50"
                onChange={(event) => setPassword(event.target.value)}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Verberg wachtwoord" : "Toon wachtwoord"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
                onClick={() => setShowPassword((value) => !value)}
                type="button"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </span>
          </label>
        ) : (
          <div className="rounded-xl border border-[#bfe7ff] bg-[#e8f4fb] px-4 py-3 text-sm font-medium leading-6 text-[#0E5A75]">
            Je ontvangt een eenmalige loginlink. Deze werkt alleen als je
            e-mailadres al als gebruiker bekend is in Supabase.
          </div>
        )}

        {error ? (
          <p className="rounded-xl border border-[#f4b5b3] bg-[#fdecea] px-4 py-3 text-sm font-semibold text-[#b4292d]">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-xl border border-[#cce7a0] bg-[#e6f4cf] px-4 py-3 text-sm font-semibold text-[#3e6a00]">
            {message}
          </p>
        ) : null}

        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0E5A75] px-5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(14,90,117,0.22)] transition hover:bg-[#0A4B61] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "loading" || status === "success"}
          type="submit"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          {mode === "password" ? "Inloggen" : "Magic link sturen"}
        </button>
      </form>
    </section>
  );
}

function getInitialError(isSupabaseConfigured: boolean, callbackError: string | null) {
  if (!isSupabaseConfigured) {
    return "Supabase instellingen ontbreken.";
  }

  if (callbackError === "callback") {
    return "De magic link kon niet worden verwerkt. Vraag een nieuwe magic link aan en open de nieuwste link uit je mailbox.";
  }

  return null;
}

function getFriendlyAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("signups not allowed") && normalized.includes("otp")) {
    return "Dit e-mailadres bestaat nog niet als Supabase-gebruiker. Maak de gebruiker eerst aan in Supabase Auth en koppel daarna een DPO- of org-adminrol in user_roles.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "E-mailadres of wachtwoord klopt niet.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Bevestig eerst het e-mailadres voordat je inlogt.";
  }

  return message;
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
        active ? "bg-white text-[#0E5A75] shadow-sm" : "text-slate-500"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
