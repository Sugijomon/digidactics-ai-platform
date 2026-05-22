import {
  DashboardAccessPanel,
  DashboardShell,
  MetricCard,
  getDashboardAccess,
} from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

type ActivationMetrics = {
  activeWaves: number;
  completedRuns: number;
  responseRate: number;
  startedRuns: number;
};

export default async function ActivationDashboardPage() {
  const access = await getDashboardAccess();

  if (access.kind !== "authorized") {
    return (
      <DashboardShell>
        <DashboardAccessPanel access={access} />
      </DashboardShell>
    );
  }

  const metrics = await getActivationMetrics(access.roleState.orgId);

  return (
    <DashboardShell>
      <section className="grid gap-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6993aa]">
              DPO Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-[#00658b]">
              Activatie
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#40484e]">
              Eerste cockpit voor scanvoortgang: hoeveel medewerkers zijn gestart,
              hoeveel scans zijn afgerond en of er actieve scanrondes lopen.
            </p>
          </div>
          <span className="rounded-full border border-[#bfc7cf]/60 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#40484e] shadow-sm">
            Organisatiebreed
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Gestart" value={metrics.startedRuns} />
          <MetricCard label="Afgerond" value={metrics.completedRuns} />
          <MetricCard label="Respons" suffix="%" value={metrics.responseRate} />
          <MetricCard label="Actieve rondes" value={metrics.activeWaves} />
        </div>

        <section className="grid gap-4 rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-[0_8px_30px_rgba(0,101,139,0.05)] md:p-6">
          <div>
            <h2 className="text-xl font-extrabold text-[#00658b]">
              Volgende dashboardlagen
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#40484e]">
              Activatie is de basis. Hierna stapelen we Tool Inventaris en
              Risicoprofiel bovenop dezelfde org-scoped data en RLS-grens.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <DashboardNextCard
              title="Tool Inventaris"
              text="Meest gebruikte tools, onbekende tools, accounttypen en gevoelige datapatronen."
            />
            <DashboardNextCard
              title="Risicoprofiel"
              text="Shadow, exposure, priority bands en review triggers voor DPO-triage."
            />
            <DashboardNextCard
              title="Governance"
              text="Later: beleid, opvolging, review items en rapportage."
            />
          </div>
        </section>
      </section>
    </DashboardShell>
  );
}

async function getActivationMetrics(orgId: string): Promise<ActivationMetrics> {
  const supabase = await createClient();

  const [startedRunsResult, completedRunsResult, activeWavesResult] = await Promise.all([
    supabase
      .from("survey_run")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("survey_run")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .not("completed_at", "is", null),
    supabase
      .from("scan_wave")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "active"),
  ]);
  const startedRuns = startedRunsResult.error ? 0 : (startedRunsResult.count ?? 0);
  const completedRuns = completedRunsResult.error
    ? 0
    : (completedRunsResult.count ?? 0);
  const activeWaves = activeWavesResult.error ? 0 : (activeWavesResult.count ?? 0);

  return {
    activeWaves,
    completedRuns,
    responseRate:
      startedRuns > 0 ? Math.round((completedRuns / startedRuns) * 100) : 0,
    startedRuns,
  };
}

function DashboardNextCard({ text, title }: { text: string; title: string }) {
  return (
    <article className="rounded-2xl border border-[#bfc7cf]/50 bg-white p-4">
      <h3 className="font-extrabold text-[#181c1e]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#40484e]">{text}</p>
    </article>
  );
}
