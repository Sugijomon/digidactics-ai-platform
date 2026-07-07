import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  Archive,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Database,
  Eye,
  EyeOff,
  FileCheck,
  FileText,
  Flag,
  FolderArchive,
  Gavel,
  GitBranch,
  GraduationCap,
  Grid2X2,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  PlayCircle,
  Send,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
  UserCircle,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getUserRole, type UserRoleState } from "@/lib/supabase/get-user-role";
import { createClient } from "@/lib/supabase/server";

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

type DashboardNavKey =
  | "activatie"
  | "tools"
  | "risicoprofiel"
  | "governance"
  | "rapportage"
  | "voortgang";

const navItems: {
  href: string;
  icon: string;
  key: DashboardNavKey;
  label: string;
}[] = [
  { href: "/dashboard/activatie", icon: "play_circle", key: "activatie", label: "Activatie" },
  { href: "/dashboard/tools", icon: "grid_view", key: "tools", label: "Tool Inventaris" },
  {
    href: "/dashboard/risicoprofiel",
    icon: "bar_chart",
    key: "risicoprofiel",
    label: "Risicoprofiel",
  },
  { href: "/dashboard/governance", icon: "gavel", key: "governance", label: "Governance" },
  { href: "/dashboard/rapportage", icon: "description", key: "rapportage", label: "Rapportage" },
  { href: "/dashboard/voortgang", icon: "trending_up", key: "voortgang", label: "Voortgang" },
];

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

export function DashboardShell({
  active = "activatie",
  children,
}: {
  active?: DashboardNavKey;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f9fb] text-[#2a3439]">
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col gap-2 border-r border-slate-200 bg-slate-50 p-4 lg:flex">
        <div className="mb-7 px-4">
          <h1 className="font-headline text-lg font-extrabold text-slate-800">
            DPO Governance
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Beheerdersdashboard
          </p>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <SideNavLink active={active === item.key} item={item} key={item.key} />
          ))}
        </nav>
        <div className="mt-auto space-y-0.5 px-2 pb-2">
          <UtilityLink icon="menu_book">Kennisbank</UtilityLink>
          <UtilityLink icon="help">Support</UtilityLink>
        </div>
      </aside>

      <section className="flex min-h-screen flex-col lg:ml-64">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/95 shadow-[0_1px_0_rgba(148,163,184,0.10)] backdrop-blur-sm">
          <div className="grid w-full gap-4 px-5 py-3 md:grid-cols-[1fr_auto] md:items-center lg:px-7">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <span className="font-headline text-2xl font-extrabold tracking-tight text-slate-800">
                Shadow AI Scan
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#CFEA7B] px-3.5 py-1.5 text-[13px] font-bold leading-none text-[#4D7800] shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-[#4D7800]" />
                Live dashboard
              </span>
            </div>
            <div className="flex items-center gap-3 justify-self-start md:justify-self-end">
              <Link
                className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-[#0E5A75] hover:text-[#0E5A75] sm:inline-flex"
                href="/survey"
              >
                Naar respondentenscan
              </Link>
              <DashboardAuthControls />
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-5 pb-3 lg:hidden">
            {navItems.map((item) => (
              <Link
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${
                  active === item.key
                    ? "bg-slate-200 text-slate-900"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
                href={item.href}
                key={item.key}
              >
                <MaterialIcon className="text-[18px]">{item.icon}</MaterialIcon>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="flex-1 p-5 md:p-8">{children}</div>
      </section>
    </main>
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
        actionHref="/login"
        actionLabel="Inloggen"
      />
    );
  }

  return (
    <AccessPanel
      actionHref="/login?next=/dashboard"
      actionLabel="Opnieuw inloggen"
      eyebrow="Geen toegang"
      text="Je bent ingelogd, maar deze sessie heeft geen DPO- of org-admin rol voor de organisatie. Log opnieuw in met het juiste account of vraag de rol aan."
      title="Dashboard niet beschikbaar voor deze rol"
    />
  );
}

export function DashboardPageHeader({
  eyebrow = "DPO Dashboard",
  meta,
  subtitle,
  title,
}: {
  eyebrow?: string;
  meta?: string;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6993aa]">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold leading-tight tracking-tight text-[#2a3439]">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
          {subtitle}
        </p>
      </div>
      {meta ? (
        <span className="rounded-full bg-[#CFEA7B] px-3.5 py-1.5 text-[13px] font-bold leading-none text-[#4D7800] shadow-sm">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

export function DashboardSection({
  children,
  className = "",
  subtitle,
  title,
}: {
  children: ReactNode;
  className?: string;
  subtitle?: string;
  title?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#dbe3ec] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)] ${className}`}
    >
      {title ? (
        <div className="mb-5">
          <h2 className="font-headline text-xl font-bold text-[#2a3439]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-[#566166]">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function MetricCard({
  accent = "blue",
  helper,
  label,
  suffix = "",
  value,
}: {
  accent?: "amber" | "blue" | "green" | "red" | "slate";
  helper?: string;
  label: string;
  suffix?: string;
  value: number | string;
}) {
  const color = {
    amber: "#D08212",
    blue: "#0E5A75",
    green: "#5C9E1A",
    red: "#B4292D",
    slate: "#334155",
  }[accent];

  return (
    <article className="rounded-[14px] border border-[rgba(193,201,207,.25)] bg-white p-4 text-center shadow-[0_8px_24px_rgba(26,32,44,0.06)] md:p-5">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-tight text-[#566166]">
        {label}
      </p>
      <h3
        className="font-headline text-[clamp(1.75rem,2.2vw,2.25rem)] font-extrabold leading-tight tabular-nums"
        style={{ color }}
      >
        {value}
        {suffix}
      </h3>
      <p className="mt-1 min-h-[2.5em] text-[10px] font-medium leading-snug text-[#566166]">
        {helper}
      </p>
    </article>
  );
}

export function StatusPill({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "amber" | "blue" | "green" | "grey" | "red";
}) {
  const styles = {
    amber: "bg-[#fff1cc] text-[#b45309]",
    blue: "bg-[#e8f4fb] text-[#0E5A75]",
    green: "bg-[#e6f4cf] text-[#3e6a00]",
    grey: "bg-[#eef2f7] text-[#64748b]",
    red: "bg-[#fdecea] text-[#b4292d]",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${styles}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function EmptyDashboardState({
  text,
  title = "Nog geen data",
}: {
  text: string;
  title?: string;
}) {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <MaterialIcon className="mx-auto text-[32px] text-[#0E5A75]">
        shield_lock
      </MaterialIcon>
      <h2 className="mt-3 font-headline text-lg font-extrabold text-slate-800">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        {text}
      </p>
    </section>
  );
}

export function ProgressBar({
  color = "#0E5A75",
  value,
}: {
  color?: string;
  value: number;
}) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full"
        style={{ backgroundColor: color, width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

function AccessPanel({
  eyebrow,
  actionHref,
  actionLabel,
  text,
  title,
}: {
  eyebrow: string;
  actionHref?: string;
  actionLabel?: string;
  text: string;
  title: string;
}) {
  return (
    <section className="mx-auto mt-16 max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6993aa]">
        {eyebrow}
      </p>
      <h1 className="mt-2 font-headline text-2xl font-extrabold text-[#0E5A75]">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
      {actionHref && actionLabel ? (
        <Link
          className="mt-6 inline-flex rounded-full bg-[#0E5A75] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(14,90,117,0.20)] transition hover:bg-[#0A4B61]"
          href={actionHref}
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}

async function DashboardAuthControls() {
  const roleState = await getUserRole();

  if (!roleState.user) {
    return (
      <Link
        className="inline-flex rounded-full bg-[#0E5A75] px-4 py-2 text-sm font-bold text-white shadow-[0_8px_24px_rgba(14,90,117,0.16)] transition hover:bg-[#0A4B61]"
        href="/login?next=/dashboard"
      >
        Inloggen
      </Link>
    );
  }

  const roleLabel = getRoleLabel(roleState.role);
  const email = roleState.user.email ?? "Ingelogde gebruiker";

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-full px-2.5 py-1 transition-colors hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
          <MaterialIcon className="text-[22px]">account_circle</MaterialIcon>
        </span>
        <span className="hidden max-w-[220px] leading-tight sm:block">
          <span className="block truncate text-[13px] font-bold text-slate-800">
            {roleLabel}
          </span>
          <span className="block truncate text-[10px] font-semibold tracking-wide text-slate-500">
            {email}
          </span>
        </span>
      </summary>
      <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.10)]">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="truncate text-[13px] font-bold text-slate-800">{roleLabel}</p>
          <p className="truncate text-[11px] font-medium text-slate-500">{email}</p>
        </div>
        <Link
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
          href="/dashboard"
        >
          <MaterialIcon className="text-[18px]">person</MaterialIcon>
          Mijn Profiel
        </Link>
        <form action={signOutAction}>
          <button
            className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-[#ff4b3e] transition-colors hover:bg-red-50"
            type="submit"
          >
            <MaterialIcon className="text-[18px]">logout</MaterialIcon>
            Uitloggen
          </button>
        </form>
      </div>
    </details>
  );
}

async function signOutAction() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?next=/dashboard");
}

function getRoleLabel(role: UserRoleState["role"]) {
  if (role === "dpo") {
    return "DPO";
  }

  if (role === "org_admin") {
    return "Org-admin";
  }

  if (role === "super_admin") {
    return "Super-admin";
  }

  if (role === "user") {
    return "Gebruiker";
  }

  return "Geen dashboardrol";
}

function SideNavLink({
  active,
  item,
}: {
  active: boolean;
  item: (typeof navItems)[number];
}) {
  return (
    <Link
      className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
        active
          ? "bg-slate-200 font-bold text-slate-900"
          : "font-semibold text-slate-500 hover:bg-slate-100"
      }`}
      href={item.href}
    >
      <MaterialIcon className="text-[24px]">{item.icon}</MaterialIcon>
      <span className="font-headline text-sm">{item.label}</span>
    </Link>
  );
}

function UtilityLink({
  children,
  icon,
}: {
  children: ReactNode;
  icon: string;
}) {
  return (
    <Link
      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-slate-500 transition-colors hover:bg-slate-100"
      href="#"
    >
      <MaterialIcon className="text-[16px]">{icon}</MaterialIcon>
      <span className="text-[12px] font-medium">{children}</span>
    </Link>
  );
}

export function MaterialIcon({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  const Icon = materialIconMap[children] ?? CircleHelp;
  const sizeClass = getIconSizeClass(className);

  return (
    <Icon
      aria-hidden="true"
      className={`inline-block shrink-0 ${sizeClass} ${className}`}
      strokeWidth={2}
    />
  );
}

const materialIconMap: Record<string, LucideIcon> = {
  account_circle: UserCircle,
  analytics: BarChart3,
  bar_chart: BarChart3,
  business_center: BriefcaseBusiness,
  check: Check,
  crisis_alert: ShieldAlert,
  dashboard: LayoutDashboard,
  data_usage: Database,
  database: Database,
  description: FileText,
  domain: Building2,
  event: CalendarDays,
  fact_check: ClipboardCheck,
  flag: Flag,
  folder_zip: FolderArchive,
  gavel: Gavel,
  grid_view: Grid2X2,
  groups: Users,
  help: HelpCircle,
  hub: GitBranch,
  inventory_2: Archive,
  key: KeyRound,
  logout: LogOut,
  mail: Mail,
  manage_accounts: UserCog,
  menu_book: BookOpen,
  outgoing_mail: Send,
  pending_actions: Clock3,
  person: UserCircle,
  play_circle: PlayCircle,
  policy: FileCheck,
  priority_high: CircleAlert,
  psychology: Brain,
  schedule: Clock3,
  school: GraduationCap,
  send: Send,
  shield_lock: ShieldCheck,
  shield_person: ShieldCheck,
  smart_toy: Bot,
  task_alt: CheckCircle2,
  trending_up: TrendingUp,
  verified: BadgeCheck,
  verified_user: ShieldCheck,
  visibility: Eye,
  visibility_off: EyeOff,
  warning: TriangleAlert,
};

function getIconSizeClass(className: string) {
  if (className.includes("32px")) {
    return "h-8 w-8";
  }

  if (className.includes("24px")) {
    return "h-6 w-6";
  }

  if (className.includes("22px")) {
    return "h-[22px] w-[22px]";
  }

  if (className.includes("18px")) {
    return "h-[18px] w-[18px]";
  }

  if (className.includes("16px")) {
    return "h-4 w-4";
  }

  if (className.includes("14px")) {
    return "h-3.5 w-3.5";
  }

  return "h-5 w-5";
}
