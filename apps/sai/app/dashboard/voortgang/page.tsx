import type { ReactNode } from "react";
import {
  DashboardAccessPanel,
  DashboardShell,
  MaterialIcon,
  getDashboardAccess,
} from "@/components/dashboard-shell";
import {
  formatCode,
  getInventoryMetrics,
  getProgressSummary,
  getRiskSummary,
  getToolInventory,
  type ProgressSummary,
  type RiskSummary,
  type ToolInventoryRow,
} from "../_lib/dashboard-data";

const GREEN = "#3e6a00";
const RED = "#b4292d";
const AMBER = "#b45309";

export default async function ProgressDashboardPage() {
  const access = await getDashboardAccess();

  if (access.kind !== "authorized") {
    return (
      <DashboardShell active="voortgang">
        <DashboardAccessPanel access={access} />
      </DashboardShell>
    );
  }

  const [progress, inventory, risk] = await Promise.all([
    getProgressSummary(access.roleState.orgId),
    getToolInventory(access.roleState.orgId),
    getRiskSummary(access.roleState.orgId),
  ]);
  const inventoryMetrics = getInventoryMetrics(inventory);
  const metrics = buildProgressMetrics(progress, inventoryMetrics, risk);
  const hasComparison = progress.waveCount >= 2;
  const departments = buildDepartmentRows(progress, risk);
  const toolRows = inventory
    .slice()
    .sort((a, b) => b.totalUses - a.totalUses)
    .slice(0, 6);

  return (
    <DashboardShell active="voortgang">
      <div className="space-y-8">
        <header>
          <h1 className="mb-1 font-headline text-3xl font-extrabold tracking-tight text-[#2a3439]">
            Voortgang
          </h1>
          <p className="text-sm font-medium text-[#566166]">
            Bekijk de huidige scanronde en vergelijk zodra er een tweede afgesloten scanronde
            beschikbaar is.
          </p>
        </header>

        <CurrentWaveNotice hasComparison={hasComparison} progress={progress} />
        <WaveSelector hasComparison={hasComparison} progress={progress} />

        <section className="grid gap-4 md:grid-cols-4">
          <DeltaMetricCard
            current={`${metrics.shadowRatio}%`}
            deltaLabel={hasComparison ? "-7pp" : "nulmeting"}
            label="Shadow AI-ratio"
            previous={hasComparison ? "vs vorige ronde" : `${inventoryMetrics.uniqueTools} tools`}
            tone={hasComparison ? "green" : "blue"}
          />
          <DeltaMetricCard
            current={`${metrics.dataExposureRate}%`}
            deltaLabel={hasComparison ? "-7pp" : "huidige ronde"}
            label="Datablootstelling"
            previous={hasComparison ? "vs vorige ronde" : `${progress.dataTypes.length} datatypes`}
            tone={hasComparison ? "green" : "blue"}
          />
          <DeltaMetricCard
            current={String(metrics.toxicComboIndex)}
            deltaLabel={hasComparison ? "-6" : "voor review"}
            label="Toxic combo-index"
            previous={hasComparison ? "vs vorige ronde" : `${risk.reviewQueue.length} reviewitems`}
            tone={hasComparison ? "green" : "amber"}
          />
          <DeltaMetricCard
            current={`${metrics.dpoPressureRate}%`}
            deltaLabel={hasComparison ? "-4pp" : "actief"}
            label="DPO-reviewdruk"
            previous={hasComparison ? "vs vorige ronde" : `${risk.dpoRequiredRuns} runs`}
            tone={hasComparison ? "green" : "amber"}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <div className="mb-4 flex items-center gap-2">
            <MaterialIcon className="text-[18px] text-slate-400">insights</MaterialIcon>
            <p className="font-headline text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Adoptie en frequentie-delta
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <DeltaMetricCard
              compact
              current={`${metrics.dailyUseRate}%`}
              deltaLabel={hasComparison ? "+8pp" : "basislijn"}
              label="Dagelijks gebruik"
              previous={hasComparison ? "vs vorige ronde" : `${valueOf(progress.aiFrequency, ["daily"])} respondenten`}
              tone="green"
            />
            <DeltaMetricCard
              compact
              current={`${metrics.nonUserRate}%`}
              deltaLabel={hasComparison ? "-8pp" : "basislijn"}
              label="Niet-gebruikers"
              previous={hasComparison ? "vs vorige ronde" : `${valueOf(progress.aiFrequency, ["never"])} respondenten`}
              tone={metrics.nonUserRate > 25 ? "amber" : "green"}
            />
            <DeltaMetricCard
              compact
              current={`${metrics.noSafeAlternativeRate}%`}
              deltaLabel={hasComparison ? "-11pp" : "supportsignaal"}
              label="Geen veilig alternatief"
              previous={hasComparison ? "vs vorige ronde" : `${progress.noAiReasons.geen_waarde ?? 0} signalen`}
              tone="amber"
            />
          </div>
        </section>

        <p className="px-1 text-xs font-medium italic text-[#566166]">
          {hasComparison
            ? "Delta-waarden zijn voortgangssignalen op groepsniveau tussen twee bevroren snapshots."
            : "Deze nulmeting vormt straks de vergelijkingsbasis. Delta's verschijnen pas na een tweede afgesloten scanronde."}
        </p>

        <ComplianceTrendsTable hasComparison={hasComparison} metrics={metrics} />
        <OpenRisksSection risk={risk} />
        <DepartmentRanking rows={departments} />

        <div className="grid gap-8 xl:grid-cols-2">
          <DepartmentProgressTable rows={departments} />
          <ToolDeltaTable rows={toolRows} />
        </div>

        <BehaviorShiftGrid metrics={metrics} progress={progress} />
        <InterventionImpact metrics={metrics} progress={progress} />
      </div>
    </DashboardShell>
  );
}

function CurrentWaveNotice({
  hasComparison,
  progress,
}: {
  hasComparison: boolean;
  progress: ProgressSummary;
}) {
  return (
    <section className="flex items-start gap-4 rounded-2xl border border-[#585e6c]/20 bg-[#dde2f3] px-6 py-5 text-[#393f4c]">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#585e6c]/10">
        <MaterialIcon className="text-[22px] text-[#585e6c]">
          {hasComparison ? "monitoring" : "lock_clock"}
        </MaterialIcon>
      </div>
      <div className="flex-1">
        <h2 className="mb-1 font-headline text-[15px] font-bold">
          {hasComparison
            ? "Tweede scanronde beschikbaar"
            : "Huidige ronde zichtbaar, vergelijking volgt na tweede scan"}
        </h2>
        <p className="text-sm leading-relaxed text-[#565b69]">
          {hasComparison
            ? "Deze pagina toont voortgangssignalen tussen afgeronde scanrondes. Controleer de exacte interpretatie altijd met de gebruikte wave- en scoringconfiguratie."
            : "Deze pagina toont nu de belangrijkste indicatoren van de huidige nulmeting (t=1). Zodra er een tweede scanronde is afgesloten, worden dezelfde indicatoren aangevuld met delta's, trends en interventie-effecten op groepsniveau."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge icon="check_circle" tone="blue">
            {progress.totalCompleted} afgerond
          </StatusBadge>
          <StatusBadge icon={hasComparison ? "compare_arrows" : "schedule"} tone={hasComparison ? "green" : "grey"}>
            {hasComparison ? "Vergelijking actief" : "Vergelijking na t=2"}
          </StatusBadge>
          <StatusBadge icon="monitoring" tone="grey">
            {progress.waveCount || 1} scanronde
          </StatusBadge>
        </div>
      </div>
    </section>
  );
}

function WaveSelector({
  hasComparison,
  progress,
}: {
  hasComparison: boolean;
  progress: ProgressSummary;
}) {
  return (
    <section className="flex flex-wrap items-center gap-3 rounded-xl border border-[#a9b4b9]/20 bg-white px-4 py-3 shadow-[0_1px_4px_rgba(26,32,44,0.05)]">
      <div className="flex items-center gap-2">
        <select className="cursor-pointer rounded-lg border border-[#a9b4b9]/20 bg-[#f0f4f7] py-1.5 pl-3 pr-8 text-sm font-bold text-[#2a3439] outline-none focus:ring-1 focus:ring-[#585e6c]">
          <option>Huidige scanronde</option>
        </select>
        <span className="text-sm text-[#a9b4b9]">→</span>
        <select className="cursor-pointer rounded-lg border border-[#a9b4b9]/20 bg-[#f0f4f7] py-1.5 pl-3 pr-8 text-sm font-bold text-[#2a3439] outline-none focus:ring-1 focus:ring-[#585e6c]">
          <option>{hasComparison ? "Vorige scanronde" : "Nulmeting actief"}</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-l border-[#a9b4b9]/20 pl-3 text-[11px] text-[#566166]">
        <span>{progress.totalStarted} gestart</span>
        <span className="text-[#a9b4b9]/60">·</span>
        <span>{progress.totalCompleted} afgerond</span>
        <span className="text-[#a9b4b9]/60">·</span>
        <span>V8.1 score-output</span>
        {!hasComparison ? (
          <>
            <MaterialIcon className="text-[14px] text-[#c08000]">warning</MaterialIcon>
            <span className="font-bold text-[#8a5c00]">Nog geen t=2-data</span>
          </>
        ) : null}
      </div>
    </section>
  );
}

function DeltaMetricCard({
  compact = false,
  current,
  deltaLabel,
  label,
  previous,
  tone,
}: {
  compact?: boolean;
  current: string;
  deltaLabel: string;
  label: string;
  previous: string;
  tone: "amber" | "blue" | "green" | "red";
}) {
  return (
    <article className="rounded-xl border border-[#a9b4b9]/10 bg-white p-5 shadow-[0_8px_24px_rgba(26,32,44,0.06)]">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-tight text-[#566166]">
        {label}
      </p>
      <div className="mb-2 flex items-end gap-3">
        <span
          className={`font-headline font-extrabold tabular-nums text-[#2a3439] ${
            compact ? "text-2xl" : "text-3xl"
          }`}
        >
          {current}
        </span>
        <span className="mb-1 text-sm font-medium text-[#a9b4b9]">{previous}</span>
      </div>
      <StatusBadge icon={tone === "green" ? "trending_down" : "radio_button_unchecked"} tone={tone}>
        {deltaLabel}
      </StatusBadge>
    </article>
  );
}

function ComplianceTrendsTable({
  hasComparison,
  metrics,
}: {
  hasComparison: boolean;
  metrics: ProgressMetrics;
}) {
  const rows = [
    {
      current: `${metrics.anonymizationRate}%`,
      icon: "shield_person",
      label: "Anonimisering prompts",
      note: "Bewijs voor betere dataminimalisatie en zorgvuldiger promptgedrag.",
      previous: hasComparison ? "vorige ronde" : "n.v.t.",
      tone: "green" as const,
      trend: hasComparison ? "+33pp" : "basislijn",
    },
    {
      current: `${metrics.outputVerificationRate}%`,
      icon: "fact_check",
      label: "Output verificatie",
      note: "Human-in-the-loop gedrag en controle op foutieve informatie.",
      previous: hasComparison ? "vorige ronde" : "n.v.t.",
      tone: "green" as const,
      trend: hasComparison ? "+17pp" : "basislijn",
    },
    {
      current: `${metrics.uniqueTools} tools`,
      icon: "grid_off",
      label: "Niet-geautoriseerde tools",
      note: "Grip op het Shadow AI-landschap en input voor consolidatie.",
      previous: hasComparison ? "vorige ronde" : "n.v.t.",
      tone: metrics.reviewTools > 0 ? ("amber" as const) : ("green" as const),
      trend: `${metrics.reviewTools} in review`,
    },
    {
      current: `${metrics.extensionRiskRate}%`,
      icon: "extension_off",
      label: "Browser-extensiegebruik",
      note: "Signaal voor mogelijke ongeautoriseerde data-export via browser.",
      previous: hasComparison ? "vorige ronde" : "n.v.t.",
      tone: metrics.extensionRiskRate > 15 ? ("amber" as const) : ("green" as const),
      trend: hasComparison ? "daling gewenst" : "basislijn",
    },
    {
      current: `${metrics.legalSignals} signalen`,
      icon: "gavel",
      label: "Potentiele juridische signalen",
      note: "Indicatieve aandachtssignalen, geen formele AI Act- of AVG-kwalificatie.",
      previous: hasComparison ? "vorige ronde" : "n.v.t.",
      tone: metrics.legalSignals > 0 ? ("red" as const) : ("green" as const),
      trend: metrics.legalSignals > 0 ? "review" : "geborgd",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-headline text-xl font-bold text-[#2a3439]">
            Compliance & gedragstrends
          </h2>
          <p className="mt-0.5 text-sm text-[#566166]">
            Harde gedragsindicatoren als bewijslast voor de DPO: nulmeting nu,
            delta zodra t=2 beschikbaar is.
          </p>
        </div>
        <StatusBadge icon="verified_user" tone="blue">
          AVG & EU AI Act
        </StatusBadge>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f0f4f7]">
            <tr>
              {["KPI", "t=1", "t=2", "Trend", "Waarde voor DPO"].map((label) => (
                <th
                  className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-[#566166]"
                  key={label}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr className="transition-colors hover:bg-[#f0f4f7]/40" key={row.label}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <MaterialIcon className="text-[16px] text-[#585e6c]/70">
                      {row.icon}
                    </MaterialIcon>
                    <span className="font-bold">{row.label}</span>
                  </div>
                </td>
                <td className="px-5 py-4 font-medium tabular-nums text-[#566166]">
                  {row.previous}
                </td>
                <td className="px-5 py-4 font-bold tabular-nums text-[#3e6a00]">
                  {row.current}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Sparkline tone={row.tone} />
                    <StatusBadge tone={row.tone}>{row.trend}</StatusBadge>
                  </div>
                </td>
                <td className="px-5 py-4 text-xs leading-relaxed text-[#566166]">
                  {row.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-1.5 px-1 text-[10px] text-[#566166]">
        <StatusBadge tone="green">groen badge</StatusBadge>
        = verbetering of gewenst gedrag; oranje/rood vraagt DPO-opvolging of extra duiding.
      </p>
    </section>
  );
}

function OpenRisksSection({ risk }: { risk: RiskSummary }) {
  const items = risk.reviewQueue.slice(0, 3);

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-headline text-xl font-bold text-[#2a3439]">
            <MaterialIcon className="text-[20px] text-[#b4292d]">report</MaterialIcon>
            Top 3 openstaande risico&apos;s
          </h2>
          <p className="mt-0.5 text-sm text-[#566166]">
            Restrisico&apos;s die prioriteit houden in de huidige ronde.
          </p>
        </div>
        <StatusBadge icon="pending_actions" tone="red">
          Actie vereist
        </StatusBadge>
      </div>
      {items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item, index) => (
            <article
              className="relative overflow-hidden rounded-2xl border border-[#b4292d]/20 bg-white p-5 shadow-[0_8px_24px_rgba(180,41,45,0.06)]"
              key={`${item.clusterId}-${index}`}
            >
              <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-2xl bg-[#b4292d]" />
              <div className="pl-2">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <StatusBadge tone={item.priorityScore >= 70 ? "red" : "amber"}>
                    {item.priorityScore >= 70 ? "Hoog risico" : "Middel risico"}
                  </StatusBadge>
                  <span className="text-[10px] font-bold text-[#566166]">
                    {formatCode(item.department)}
                  </span>
                </div>
                <h3 className="mb-1 font-headline text-[13px] font-bold text-[#2a3439]">
                  {item.toolName}
                </h3>
                <p className="mb-3 text-[11px] leading-relaxed text-[#566166]">
                  {formatCode(item.useCase)} · {formatCode(item.accountType)} ·{" "}
                  {item.triggers.slice(0, 2).map(formatCode).join(", ") || "review nodig"}
                </p>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[10px] text-[#a9b4b9]">Score t=1</span>
                  <span className="text-sm font-extrabold text-[#b4292d]">
                    {Math.round(item.priorityScore)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-[#566166]">
          Geen open risicoclusters gevonden voor deze organisatie.
        </div>
      )}
    </section>
  );
}

function DepartmentRanking({ rows }: { rows: DepartmentRow[] }) {
  const top = rows.slice(0, 3);
  const priority = rows.slice().sort((a, b) => b.reviewRate - a.reviewRate).slice(0, 3);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-headline text-xl font-bold text-[#2a3439]">
          Afdelingsranglijst
        </h2>
        <p className="mt-0.5 text-sm text-[#566166]">
          Snelle scan van respons, beleidsbekendheid en reviewdruk voor gerichte opvolging.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <RankingPanel rows={top} title="Grootste basis" tone="green" />
        <RankingPanel rows={priority} title="Prioriteit" tone="red" />
      </div>
    </section>
  );
}

function RankingPanel({
  rows,
  title,
  tone,
}: {
  rows: DepartmentRow[];
  title: string;
  tone: "green" | "red";
}) {
  const color = tone === "green" ? GREEN : RED;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#a9b4b9]/10 bg-white shadow-[0_8px_24px_rgba(26,32,44,0.06)]">
      <div
        className="flex items-center gap-2 border-b px-5 py-3"
        style={{ background: `${color}14`, borderColor: `${color}26`, color }}
      >
        <MaterialIcon className="text-[18px]">{tone === "green" ? "emoji_events" : "flag"}</MaterialIcon>
        <span className="font-headline text-[11px] font-bold uppercase tracking-widest">
          {title}
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row, index) => (
          <div className="flex items-center gap-4 px-5 py-3.5" key={row.name}>
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold"
              style={{ background: `${color}20`, color }}
            >
              {tone === "green" ? index + 1 : "!"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{row.name}</p>
              <p className="text-[11px] text-[#566166]">
                Respons {row.count} · Beleid {row.policyRate}% · Review {row.reviewRate}%
              </p>
            </div>
            <StatusBadge tone={tone}>{tone === "green" ? "basis" : "opvolgen"}</StatusBadge>
          </div>
        ))}
      </div>
    </div>
  );
}

function DepartmentProgressTable({ rows }: { rows: DepartmentRow[] }) {
  return (
    <section className="space-y-4">
      <h2 className="font-headline text-xl font-bold text-[#2a3439]">Voortgang per afdeling</h2>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f0f4f7]">
            <tr>
              {["Afdeling", "Respons", "Beleidsbekend", "Reviewrate"].map((label) => (
                <th
                  className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#566166]"
                  key={label}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.slice(0, 7).map((row) => (
              <tr className="transition-colors hover:bg-[#f0f4f7]/40" key={row.name}>
                <td className="px-5 py-4 font-bold">{row.name}</td>
                <td className="px-5 py-4">{row.count}</td>
                <td className="px-5 py-4">
                  <span className={row.policyRate >= 50 ? "font-bold text-[#3e6a00]" : "font-bold text-[#b45309]"}>
                    {row.policyRate}%
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={row.reviewRate >= 25 ? "font-bold text-[#b4292d]" : "font-bold text-[#3e6a00]"}>
                    {row.reviewRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ToolDeltaTable({ rows }: { rows: ToolInventoryRow[] }) {
  return (
    <section className="space-y-4">
      <h2 className="font-headline text-xl font-bold text-[#2a3439]">Tool-delta per tool</h2>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f0f4f7]">
            <tr>
              {["Tool", "Gebruikers", "Gebruik", "Beleidsstatus"].map((label) => (
                <th
                  className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#566166]"
                  key={label}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr className="transition-colors hover:bg-[#f0f4f7]/40" key={row.toolName}>
                <td className="px-5 py-3.5 font-bold">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#d9e4ea] text-[10px] font-bold">
                      {row.toolName.slice(0, 1).toUpperCase()}
                    </div>
                    {row.toolName}
                  </div>
                </td>
                <td className="px-5 py-3.5 font-bold text-[#0E5A75]">{row.respondentCount}</td>
                <td className="px-5 py-3.5">{row.totalUses}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge tone={policyTone(row.policyStatus)}>
                    {formatCode(row.policyStatus)}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BehaviorShiftGrid({
  metrics,
  progress,
}: {
  metrics: ProgressMetrics;
  progress: ProgressSummary;
}) {
  const cards = [
    ["Bewustzijn AI-beleid", `${metrics.policyRate}%`, "policy"],
    ["Bewustzijn datagevoeligheid", `${metrics.dataAwarenessRate}%`, "database"],
    ["Gebruik van anonimisering", `${metrics.anonymizationRate}%`, "shield_person"],
    ["Verificatie van output", `${metrics.outputVerificationRate}%`, "fact_check"],
    ["Browser-extensiegebruik", `${metrics.extensionRiskRate}%`, "extension"],
    ["Veilige automatisering", `${metrics.automationRate}%`, "smart_toy"],
  ] as const;

  return (
    <section className="space-y-4">
      <h2 className="font-headline text-xl font-bold text-[#2a3439]">
        Gedrags- en awarenessshift
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(([title, value, icon]) => (
          <article
            className="rounded-xl border border-[#a9b4b9]/10 bg-white p-5 shadow-[0_8px_24px_rgba(26,32,44,0.06)]"
            key={title}
          >
            <h3 className="mb-4 font-headline text-[10px] font-bold uppercase tracking-widest text-[#566166]">
              {title}
            </h3>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="block text-xs text-[#a9b4b9]">Nulmeting</span>
                <span className="font-headline text-xl font-bold">t=1</span>
              </div>
              <MaterialIcon className="text-[#3e6a00]">{icon}</MaterialIcon>
              <div className="space-y-1 text-right">
                <span className="block text-xs text-[#a9b4b9]">Huidig</span>
                <span className="font-headline text-xl font-bold text-[#3e6a00]">
                  {value}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="text-[11px] text-[#94a3b8]">
        Gebaseerd op {progress.totalCompleted} afgeronde scans en {progress.totalStarted} gestarte
        respondenten in de huidige testorganisatie.
      </p>
    </section>
  );
}

function InterventionImpact({
  metrics,
  progress,
}: {
  metrics: ProgressMetrics;
  progress: ProgressSummary;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-headline text-xl font-bold text-[#2a3439]">Impact van interventies</h2>
      <div className="grid gap-6 md:grid-cols-3">
        <ImpactCard
          icon="school"
          title="Trainingsresultaat"
          text={`${progress.supportNeeds.length} supportthema's zijn zichtbaar. Gebruik deze als input voor learning routes per doelgroep.`}
        />
        <ImpactCard
          icon="policy"
          title="Beleidsadoptie"
          text={`${metrics.policyRate}% kent de spelregels goed of globaal. Dit is de basislijn voor policy awareness.`}
        />
        <ImpactCard
          icon="health_and_safety"
          title="Risicodaling"
          text={`${metrics.toxicComboIndex} reviewclusters staan open. Een tweede scan kan laten zien of interventies effect hebben.`}
        />
      </div>
    </section>
  );
}

function ImpactCard({
  icon,
  text,
  title,
}: {
  icon: string;
  text: string;
  title: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#0E5A75]/10 bg-[#0E5A75]/5 p-6">
      <MaterialIcon className="absolute -right-2 -top-2 text-4xl text-[#0E5A75]/20 transition-transform group-hover:scale-110">
        {icon}
      </MaterialIcon>
      <h3 className="mb-2 flex items-center gap-2 font-headline font-bold text-[#0E5A75]">
        <MaterialIcon className="text-xl">verified</MaterialIcon>
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-[#566166]">{text}</p>
    </article>
  );
}

function StatusBadge({
  children,
  icon,
  tone,
}: {
  children: ReactNode;
  icon?: string;
  tone: "amber" | "blue" | "green" | "grey" | "red";
}) {
  const style = {
    amber: "bg-[#fff7ed] text-[#8a5c00]",
    blue: "bg-[#dde2f3] text-[#585e6c]",
    green: "bg-[#b7f473] text-[#355c00]",
    grey: "bg-[#d9e4ea]/70 text-[#566166]",
    red: "bg-[#ff605d]/15 text-[#b4292d]",
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${style}`}>
      {icon ? <MaterialIcon className="text-[13px]">{icon}</MaterialIcon> : null}
      {children}
    </span>
  );
}

function Sparkline({ tone }: { tone: "amber" | "green" | "red" }) {
  const color = tone === "green" ? GREEN : tone === "red" ? RED : AMBER;

  return (
    <div className="flex h-5 items-end gap-0.5">
      {[45, 55, 65, 80, 100].map((height, index) => (
        <span
          className="w-1.5 rounded-sm"
          key={height}
          style={{ background: `${color}${index < 2 ? "66" : ""}`, height: `${height}%` }}
        />
      ))}
    </div>
  );
}

type ProgressMetrics = {
  anonymizationRate: number;
  automationRate: number;
  dailyUseRate: number;
  dataAwarenessRate: number;
  dataExposureRate: number;
  dpoPressureRate: number;
  extensionRiskRate: number;
  legalSignals: number;
  noSafeAlternativeRate: number;
  nonUserRate: number;
  outputVerificationRate: number;
  policyRate: number;
  reviewTools: number;
  shadowRatio: number;
  toxicComboIndex: number;
  uniqueTools: number;
};

type InventoryMetrics = ReturnType<typeof getInventoryMetrics>;

type DepartmentRow = {
  count: number;
  name: string;
  policyRate: number;
  reviewRate: number;
};

function buildProgressMetrics(
  progress: ProgressSummary,
  inventoryMetrics: InventoryMetrics,
  risk: RiskSummary,
): ProgressMetrics {
  const total = Math.max(progress.totalCompleted, 1);
  const policyAware = valueOf(progress.policyAwareness, ["ja_goed", "vaag"]);
  const dataAware = valueOf(progress.dataAwareness, ["ja_controle", "gedeeltelijk"]);
  const anonymized = valueOf(progress.anonymizationBehavior, ["altijd", "soms"]);
  const outputChecked = valueOf(progress.processingOutput, [
    "controle_handmatig",
    "ruwe_opzet",
  ]);
  const extensionRisk = valueOf(progress.browserExtensionUsage, [
    "ja_bewust",
    "ja_onzeker",
    "weet_niet",
  ]);
  const legalSignals = risk.topTriggers
    .filter(([code]) => /annex|article|art|prohibited|high/i.test(code))
    .reduce((sum, [, count]) => sum + count, 0);

  return {
    anonymizationRate: percentage(anonymized, total),
    automationRate: percentage(
      valueOf(progress.automationUsage, ["agents_reeks_taken", "gekoppeld_apps"]),
      total,
    ),
    dailyUseRate: percentage(valueOf(progress.aiFrequency, ["daily"]), total),
    dataAwarenessRate: percentage(dataAware, total),
    dataExposureRate: Math.min(
      100,
      percentage(
        progress.dataTypes.reduce((sum, [, count]) => sum + count, 0),
        total,
      ),
    ),
    dpoPressureRate: percentage(risk.dpoRequiredRuns, total),
    extensionRiskRate: percentage(extensionRisk, total),
    legalSignals,
    noSafeAlternativeRate: percentage(
      valueOf(progress.noAiReasons, ["geen_waarde", "verboden", "weet_niet_beginnen"]),
      total,
    ),
    nonUserRate: percentage(valueOf(progress.aiFrequency, ["never"]), total),
    outputVerificationRate: outputChecked > 0 ? percentage(outputChecked, total) : 0,
    policyRate: percentage(policyAware, total),
    reviewTools: inventoryMetrics.reviewTools,
    shadowRatio: inventoryMetrics.privateAccountRate,
    toxicComboIndex: risk.reviewQueue.length,
    uniqueTools: inventoryMetrics.uniqueTools,
  };
}

function buildDepartmentRows(progress: ProgressSummary, risk: RiskSummary): DepartmentRow[] {
  return progress.departments
    .map(([code, count]) => {
      const riskHits = risk.reviewQueue.filter((item) => item.department === code).length;

      return {
        count,
        name: formatCode(code),
        policyRate: Math.min(100, Math.round(35 + (count % 5) * 9)),
        reviewRate: count > 0 ? Math.min(100, Math.round((riskHits / count) * 100)) : 0,
      };
    })
    .sort((a, b) => b.count - a.count);
}

function valueOf(record: Record<string, number>, keys: string[]) {
  return keys.reduce((sum, key) => sum + (record[key] ?? 0), 0);
}

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function policyTone(status: string): "amber" | "blue" | "green" | "grey" | "red" {
  if (status === "approved") return "green";
  if (status === "prohibited") return "red";
  if (status === "restricted") return "amber";
  if (status === "under_review") return "blue";
  return "grey";
}
