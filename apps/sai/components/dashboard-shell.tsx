import Link from "next/link";
import type { ReactNode } from "react";
import { getUserRole, type UserRoleState } from "@/lib/supabase/get-user-role";

export type DashboardAccessState =
  | {
      kind: "authorized";
      roleState: UserRoleState & {
        orgId: string;
        user: NonNullable<UserRoleState["user"]>;
      };
    }
  | { kind: "unauthenticated" }
  | { kind: "unauthorized"; roleState: UserRoleState };

export async function getDashboardAccess(): Promise<DashboardAccessState> {
  const roleState = await getUserRole();
  const canViewDashboard =
    roleState.role === "dpo" ||
    roleState.role === "org_admin" ||
    roleState.role === "super_admin";

  if (!roleState.user) {
    return { kind: "unauthenticated" };
  }

  if (!canViewDashboard || !roleState.orgId) {
    return { kind: "unauthorized", roleState };
  }

  return {
    kind: "authorized",
    roleState: {
      ...roleState,
      orgId: roleState.orgId,
      user: roleState.user,
    },
  };
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7fafc] px-6 py-8 text-[#181c1e]">
      <section className="mx-auto grid max-w-6xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link className="flex items-center gap-3" href="/dashboard/activatie">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#00658b] text-lg font-black text-white shadow-sm">
              S
            </span>
            <span>
              <span className="block text-xl font-extrabold leading-tight">
                Shadow AI Scan
              </span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-[#6993aa]">
                DPO dashboard
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            <DashboardNavLink href="/dashboard/activatie">
              Activatie
            </DashboardNavLink>
            <DashboardNavLink href="/dashboard/tools">
              Tool Inventaris
            </DashboardNavLink>
            <DashboardNavLink href="/dashboard/risicoprofiel">
              Risicoprofiel
            </DashboardNavLink>
            <Link
              className="rounded-full border border-[#bfc7cf] bg-white px-4 py-2 text-sm font-bold text-[#40484e] transition hover:border-[#00658b] hover:text-[#00658b]"
              href="/survey"
            >
              Naar respondentenscan
            </Link>
          </nav>
        </header>
        <section className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_8px_40px_rgba(0,101,139,0.06)] backdrop-blur md:p-8">
          {children}
        </section>
      </section>
    </main>
  );
}

export function AccessPanel({
  eyebrow,
  text,
  title,
}: {
  eyebrow: string;
  text: string;
  title: string;
}) {
  return (
    <section className="mx-auto max-w-xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6993aa]">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-[#00658b]">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-[#40484e]">{text}</p>
    </section>
  );
}

export function DashboardAccessPanel({
  access,
}: {
  access: Exclude<DashboardAccessState, { kind: "authorized" }>;
}) {
  if (access.kind === "unauthenticated") {
    return (
      <AccessPanel
        eyebrow="Dashboard"
        text="Het SAI dashboard toont organisatiebrede scanresultaten en is daarom afgeschermd."
        title="Log in als DPO of beheerder"
      />
    );
  }

  return (
    <AccessPanel
      eyebrow="Geen toegang"
      text="Vraag een DPO- of org-admin rol aan voor jouw organisatie om de scanresultaten te bekijken."
      title="Dashboard niet beschikbaar voor deze rol"
    />
  );
}

export function MetricCard({
  label,
  suffix = "",
  value,
}: {
  label: string;
  suffix?: string;
  value: number | string;
}) {
  return (
    <article className="rounded-[1.25rem] border border-[#c4e7ff] bg-[#f3fbff] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[#00658b]/70">
        {label}
      </p>
      <p className="mt-2 text-3xl font-extrabold text-[#181c1e]">
        {value}
        {suffix}
      </p>
    </article>
  );
}

function DashboardNavLink({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      className="rounded-full border border-[#c4e7ff] bg-[#f3fbff] px-4 py-2 text-sm font-bold text-[#00658b] transition hover:bg-[#c4e7ff]/35"
      href={href}
    >
      {children}
    </Link>
  );
}
