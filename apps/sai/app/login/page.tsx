import Link from "next/link";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f9fb] px-5 py-10 text-[#2a3439]">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <Link className="flex items-center gap-3" href="/">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0E5A75] font-headline text-lg font-black text-white shadow-sm">
              S
            </span>
            <span>
              <span className="block font-headline text-xl font-extrabold leading-tight text-slate-800">
                Shadow AI Scan
              </span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                DPO dashboard
              </span>
            </span>
          </Link>

          <div className="mt-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6993aa]">
              Beheerderslogin
            </p>
            <h1 className="mt-3 font-headline text-4xl font-extrabold leading-tight tracking-tight text-slate-800">
              Log in om de scanresultaten te bekijken
            </h1>
            <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-500">
              Het dashboard toont organisatiebrede scanresultaten en is alleen
              beschikbaar voor gebruikers met een DPO-, org-admin- of
              super-adminrol.
            </p>
          </div>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
