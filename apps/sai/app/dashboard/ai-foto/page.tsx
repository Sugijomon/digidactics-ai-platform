import type { ReactNode } from "react";
import Link from "next/link";
import {
  DashboardAccessPanel,
  DashboardShell,
  EmptyDashboardState,
  MaterialIcon,
  StatusPill,
  getDashboardAccess,
} from "@/components/dashboard-shell";
import {
  formatCode,
  getAiFotoPreviewSummary,
  getAiFotoWorkbenchData,
  type AiFotoApplicationPreview,
  type AiFotoCardItemRow,
  type AiFotoCardItemStatus,
  type AiFotoCardSignal,
  type AiFotoExportPreview,
  type AiFotoPreviewSummary,
  type AiFotoWorkbenchData,
} from "../_lib/dashboard-data";
import {
  approveAiFotoCardItem,
  generateAiFotoCardItems,
  markAiFotoCardItemReviewed,
  recordAiFotoExportPreview,
  updateAiFotoCardItem,
} from "./actions";

type AiFotoDashboardPageProps = {
  searchParams?: Promise<{ status?: string | string[] }>;
};

const STATUS_FILTERS: Array<{
  label: string;
  value: AiFotoCardItemStatus | "all";
}> = [
  { label: "Alles", value: "all" },
  { label: "AI concept", value: "ai_suggested" },
  { label: "Draft", value: "draft" },
  { label: "Review klaar", value: "consultant_reviewed" },
  { label: "Goedgekeurd", value: "approved" },
];

export default async function AiFotoDashboardPage({
  searchParams,
}: AiFotoDashboardPageProps) {
  const access = await getDashboardAccess();

  if (access.kind !== "authorized") {
    return (
      <DashboardShell active="aiFoto">
        <DashboardAccessPanel access={access} />
      </DashboardShell>
    );
  }

  const params = await searchParams;
  const statusFilter = parseStatusFilter(params?.status);
  const [summary, workbench] = await Promise.all([
    getAiFotoPreviewSummary(access.roleState.orgId),
    getAiFotoWorkbenchData(access.roleState.orgId, statusFilter),
  ]);

  return (
    <DashboardShell active="aiFoto">
      <section className="space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6993aa]">
              AI-Foto preview
            </p>
            <h1 className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-[#2a3439]">
              Waarde, aandachtspunten en vaardigheden
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-[#566166]">
              Eerste outputlaag voor de AI-Foto scanvariant. De kaarten zijn
              signalering en besluitvoorbereiding, geen juridische
              classificatie, audit of compliancegarantie.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="blue">{summary.applicationCount} toepassingen</StatusPill>
            <StatusPill tone="green">{summary.completedRuns} afgeronde runs</StatusPill>
          </div>
        </header>

        {summary.applicationCount === 0 ? (
          <EmptyDashboardState
            text="Vul eerst een AI-Foto scan in met de toegangscode ai-foto-preview. Zodra concrete toepassingen zijn opgeslagen, verschijnen hier de drie kaarten."
            title="Nog geen AI-Foto toepassingen"
          />
        ) : (
          <>
            <WorkbenchTabs />

            <section className="grid gap-5 xl:grid-cols-3" id="signalen">
              <SignalCard
                accent="green"
                icon="trending_up"
                signals={summary.valueSignals}
                subtitle="Waar ontstaat zichtbaar voordeel en voor wie?"
                title="Waardekaart"
              >
                <MiniSignalList
                  emptyLabel="Nog geen begunstigde zichtbaar"
                  signals={summary.valueBeneficiaries}
                  title="Begunstigden"
                />
              </SignalCard>

              <SignalCard
                accent="amber"
                icon="warning"
                signals={summary.attentionSignals}
                subtitle="Welke randvoorwaarden of reviews vragen aandacht?"
                title="Aandachtspuntenkaart"
              >
                <MiniSignalList
                  emptyLabel="Nog geen outputbestemming zichtbaar"
                  signals={summary.outputDestinations}
                  title="Outputbestemmingen"
                />
              </SignalCard>

              <SignalCard
                accent="blue"
                icon="school"
                signals={summary.skillSignals}
                subtitle="Waar is extra handelingszekerheid nodig?"
                title="Vaardighedenkaart"
              >
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                  Vaardigheidssignalen tellen alleen onzekere of risicovolle
                  antwoorden mee. Sterke antwoorden blijven beschikbaar als
                  positief adoption-signaal in latere rapportage.
                </p>
              </SignalCard>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <CandidateInventory applications={summary.topApplications} />
              <CardItemWorkbench
                statusFilter={statusFilter}
                summary={summary}
                workbench={workbench}
              />
            </section>

            <DecisionPoints points={summary.decisionPoints} />
            <RouteSection routeItems={summary.routeItems} />
            <ExportReadiness exportPreview={workbench.exportPreview} />
          </>
        )}
      </section>
    </DashboardShell>
  );
}

function WorkbenchTabs() {
  return (
    <nav
      aria-label="AI-Foto werkbank"
      className="flex flex-wrap gap-2 rounded-2xl border border-[#dbe3ec] bg-white p-2 shadow-[0_1px_3px_rgba(0,0,0,.04)]"
    >
      {["Signalen", "Kaartitems", "Besluitpunten & route", "Exports"].map(
        (label) => (
          <a
            className="rounded-xl px-4 py-2 text-sm font-extrabold text-[#0E5A75] transition hover:bg-[#e8f4fb]"
            href={`#${label.toLowerCase().replaceAll(" ", "-").replace("&", "en")}`}
            key={label}
          >
            {label}
          </a>
        ),
      )}
    </nav>
  );
}

function SignalCard({
  accent,
  children,
  icon,
  signals,
  subtitle,
  title,
}: {
  accent: "amber" | "blue" | "green";
  children?: ReactNode;
  icon: string;
  signals: AiFotoCardSignal[];
  subtitle: string;
  title: string;
}) {
  const color = {
    amber: "#b45309",
    blue: "#0E5A75",
    green: "#3e6a00",
  }[accent];
  const soft = {
    amber: "#fff7ed",
    blue: "#e8f4fb",
    green: "#e6f4cf",
  }[accent];
  const topSignals = signals.slice(0, 5);
  const total = Math.max(...topSignals.map((signal) => signal.count), 1);

  return (
    <article className="rounded-2xl border border-[#dbe3ec] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
      <div className="mb-5 flex items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
          style={{ background: soft, color }}
        >
          <MaterialIcon className="text-[22px]">{icon}</MaterialIcon>
        </span>
        <div className="min-w-0">
          <h2 className="font-headline text-xl font-bold text-[#2a3439]">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#566166]">{subtitle}</p>
        </div>
      </div>

      {topSignals.length > 0 ? (
        <div className="space-y-3">
          {topSignals.map((signal) => (
            <div key={signal.code}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="truncate text-sm font-bold text-slate-800">
                  {signal.label}
                </span>
                <span className="font-mono text-xs font-extrabold" style={{ color }}>
                  {signal.count}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full"
                  style={{
                    background: color,
                    width: `${Math.max(12, (signal.count / total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
          Nog geen signalen voor deze kaart.
        </p>
      )}

      {children ? <div className="mt-5 border-t border-slate-100 pt-4">{children}</div> : null}
    </article>
  );
}

function MiniSignalList({
  emptyLabel,
  signals,
  title,
}: {
  emptyLabel: string;
  signals: AiFotoCardSignal[];
  title: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      {signals.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {signals.slice(0, 4).map((signal) => (
            <span
              className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600"
              key={signal.code}
            >
              {signal.label} - {signal.count}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">{emptyLabel}</p>
      )}
    </div>
  );
}

function CandidateInventory({
  applications,
}: {
  applications: AiFotoApplicationPreview[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dbe3ec] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
      <div className="border-b border-slate-100 px-6 py-5">
        <h2 className="font-headline text-xl font-bold text-[#2a3439]">
          Kandidaat-AI-inventaris
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#566166]">
          Concrete toepassingen die geschikt zijn voor vervolgbesluitvorming,
          pilots of randvoorwaarden.
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {applications.map((application) => (
          <ApplicationRow application={application} key={application.id} />
        ))}
      </div>
    </section>
  );
}

function ApplicationRow({
  application,
}: {
  application: AiFotoApplicationPreview;
}) {
  const tone = {
    basis: "green" as const,
    hoog: "red" as const,
    middel: "amber" as const,
  }[application.attentionLevel];

  return (
    <article className="grid gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_210px] lg:items-start">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusPill tone={tone}>{formatCode(application.attentionLevel)}</StatusPill>
          <span className="text-xs font-bold text-slate-400">
            {application.toolName} - {application.useCaseLabel}
          </span>
        </div>
        <h3 className="break-words text-sm font-extrabold text-slate-800">
          {application.taskDescription}
        </h3>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Output: {application.outputDestinationLabel}. Mensimpact:{" "}
          {application.peopleImpactLabel}. Netto effect: {application.netEffectLabel}.
        </p>
      </div>
      <div className="grid gap-2 text-xs">
        <PillGroup label="Waarde" values={application.valueLabels} />
        <PillGroup label="Aandacht" values={application.conditionLabels} />
        <PillGroup label="Data" values={application.dataLabels} />
      </div>
    </article>
  );
}

function PillGroup({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="line-clamp-2 leading-5 text-slate-600">
        {values.length > 0 ? values.join(", ") : "Onbekend"}
      </p>
    </div>
  );
}

function CardItemWorkbench({
  statusFilter,
  summary,
  workbench,
}: {
  statusFilter: AiFotoCardItemStatus | "all";
  summary: AiFotoPreviewSummary;
  workbench: AiFotoWorkbenchData;
}) {
  const counts = summary.cardItemCounts;
  const groupedItems = groupCardItems(workbench.cardItems);

  return (
    <aside
      className="space-y-5 rounded-2xl border border-[#dbe3ec] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]"
      id="kaartitems"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e8f4fb] text-[#0E5A75]">
          <MaterialIcon className="text-[22px]">fact_check</MaterialIcon>
        </span>
        <div>
          <h2 className="font-headline text-xl font-bold text-[#2a3439]">
            Kaartitems
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#566166]">
            Persistente analyse-items voor accordering en export.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatusMetric label="Draft" value={counts.draft} />
        <StatusMetric label="AI concept" value={counts.aiSuggested} />
        <StatusMetric label="Reviewed" value={counts.consultantReviewed} />
        <StatusMetric label="Approved" value={counts.approved} />
      </div>

      <form action={generateAiFotoCardItems}>
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0E5A75] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#0a4559]"
          type="submit"
        >
          <MaterialIcon className="text-[18px]">auto_awesome</MaterialIcon>
          Genereer conceptkaartitems
        </button>
      </form>

      <nav aria-label="Kaartitemstatus" className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Link
            className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
              statusFilter === filter.value
                ? "border-[#0E5A75] bg-[#e8f4fb] text-[#0E5A75]"
                : "border-slate-200 bg-white text-slate-500 hover:border-[#9fc6d7]"
            }`}
            href={
              filter.value === "all"
                ? "/dashboard/ai-foto#kaartitems"
                : `/dashboard/ai-foto?status=${filter.value}#kaartitems`
            }
            key={filter.value}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {workbench.cardItems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
          Nog geen kaartitems binnen dit filter. Genereer eerst concepten uit
          afgeronde AI-Foto scans.
        </p>
      ) : (
        <div className="space-y-5">
          {(["waarde", "aandacht", "vaardigheid"] as const).map((cardType) => {
            const items = groupedItems[cardType];

            if (items.length === 0) return null;

            return (
              <section className="space-y-3" key={cardType}>
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  {cardTypeLabel(cardType)}
                </h3>
                {items.map((item) => (
                  <CardItemEditor item={item} key={item.id} />
                ))}
              </section>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function StatusMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-extrabold text-[#0E5A75]">
        {value}
      </p>
    </div>
  );
}

function CardItemEditor({ item }: { item: AiFotoCardItemRow }) {
  const isApproved = item.status === "approved";

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <StatusPill tone={statusTone(item.status)}>
            {cardItemStatusLabel(item.status)}
          </StatusPill>
          <h4 className="mt-2 break-words text-sm font-extrabold text-slate-800">
            {item.title}
          </h4>
        </div>
        <span className="font-mono text-[11px] font-extrabold text-slate-400">
          n={item.respondent_count ?? 0}
        </span>
      </div>

      <p className="mb-3 text-xs leading-5 text-slate-500">
        Cluster {item.cluster_key}. Bewijsniveau: {item.evidence_level}.
      </p>

      {isApproved ? (
        <div className="space-y-3 text-sm leading-6 text-slate-600">
          <p>{item.observation}</p>
          {item.interpretation ? <p>{item.interpretation}</p> : null}
          {item.approved_at ? (
            <p className="font-mono text-[11px] font-bold text-slate-400">
              Approved {formatDate(item.approved_at)}
            </p>
          ) : null}
        </div>
      ) : (
        <form action={updateAiFotoCardItem} className="space-y-3">
          <input name="card_item_id" type="hidden" value={item.id} />
          <TextField defaultValue={item.title} label="Titel" name="title" required />
          <TextareaField
            defaultValue={item.observation}
            label="Observatie"
            name="observation"
            required
          />
          <TextareaField
            defaultValue={item.interpretation ?? ""}
            label="Interpretatie"
            name="interpretation"
          />
          <TextareaField
            defaultValue={(item.open_questions ?? []).join("\n")}
            label="Open vragen"
            name="open_questions"
          />
          <TextareaField
            defaultValue={item.precaution ?? ""}
            label="Voorbehoud"
            name="precaution"
          />
          <TextField
            defaultValue={item.follow_up_direction ?? ""}
            label="Vervolgrichting"
            name="follow_up_direction"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              defaultValue={item.proposed_owner_role ?? ""}
              label="Eigenaar"
              name="proposed_owner_role"
              options={[
                ["", "Nog niet gekozen"],
                ["management", "Management"],
                ["dpo", "DPO"],
                ["it", "IT"],
                ["hr", "HR"],
                ["proceseigenaar", "Proceseigenaar"],
              ]}
            />
            <TextField
              defaultValue={item.review_date ?? ""}
              label="Reviewdatum"
              name="review_date"
              type="date"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              defaultValue={item.evidence_level}
              label="Bewijsniveau"
              name="evidence_level"
              options={[
                ["gesteld", "Gesteld"],
                ["aannemelijk", "Aannemelijk"],
                ["aangetoond", "Aangetoond"],
              ]}
            />
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
              <input
                className="h-4 w-4 rounded border-slate-300 text-[#0E5A75]"
                name="allow_triangulated_evidence"
                type="checkbox"
              />
              Triangulatie beschikbaar
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-extrabold text-[#0E5A75] ring-1 ring-slate-200 transition hover:bg-[#e8f4fb]"
              type="submit"
            >
              <MaterialIcon className="text-[16px]">save</MaterialIcon>
              Opslaan
            </button>
          </div>
        </form>
      )}

      {!isApproved ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={markAiFotoCardItemReviewed}>
            <input name="card_item_id" type="hidden" value={item.id} />
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100"
              type="submit"
            >
              <MaterialIcon className="text-[16px]">rate_review</MaterialIcon>
              Review klaar
            </button>
          </form>
          <form action={approveAiFotoCardItem}>
            <input name="card_item_id" type="hidden" value={item.id} />
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3e6a00] px-3 py-2 text-xs font-extrabold text-white transition hover:bg-[#2f5100]"
              type="submit"
            >
              <MaterialIcon className="text-[16px]">verified</MaterialIcon>
              Accorderen
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

function TextField({
  defaultValue,
  label,
  name,
  required = false,
  type = "text",
}: {
  defaultValue: string;
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <input
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-[#0E5A75]"
        defaultValue={defaultValue}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function TextareaField({
  defaultValue,
  label,
  name,
  required = false,
}: {
  defaultValue: string;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <textarea
        className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium leading-6 text-slate-700 outline-none transition focus:border-[#0E5A75]"
        defaultValue={defaultValue}
        name={name}
        required={required}
      />
    </label>
  );
}

function SelectField({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue: string;
  label: string;
  name: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <select
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-[#0E5A75]"
        defaultValue={defaultValue}
        name={name}
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DecisionPoints({ points }: { points: string[] }) {
  return (
    <aside
      className="rounded-2xl border border-[#dbe3ec] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]"
      id="besluitpunten-en-route"
    >
      <h2 className="font-headline text-xl font-bold text-[#2a3439]">
        Maximaal vijf besluitpunten
      </h2>
      <p className="mt-1 text-sm leading-6 text-[#566166]">
        Voor bespreking met DPO, management, IT of proceseigenaren.
      </p>
      <ol className="mt-5 space-y-3">
        {points.map((point, index) => (
          <li className="flex gap-3" key={point}>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e8f4fb] font-mono text-xs font-extrabold text-[#0E5A75]">
              {index + 1}
            </span>
            <span className="text-sm leading-6 text-slate-700">{point}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function ExportReadiness({
  exportPreview,
}: {
  exportPreview: AiFotoExportPreview;
}) {
  const isReady = exportPreview.readiness === "ready";

  return (
    <section
      className="rounded-2xl border border-[#dbe3ec] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]"
      id="exports"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-xl font-bold text-[#2a3439]">
            Exports
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#566166]">
            Kaarten worden straks uitsluitend opgebouwd uit approved
            kaartitems met auditmetadata.
          </p>
        </div>
        <StatusPill tone={isReady ? "green" : "amber"}>
          {isReady ? "Export-preview gereed" : exportReadinessLabel(exportPreview.readiness)}
        </StatusPill>
      </div>
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="font-headline text-lg font-bold text-slate-800">
            {exportPreview.organizationName}
          </p>
          <dl className="mt-4 space-y-2 text-xs leading-5 text-slate-600">
            <div>
              <dt className="font-bold uppercase tracking-wide text-slate-400">
                Scanronde
              </dt>
              <dd>{exportPreview.scanWaveName}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wide text-slate-400">
                Methode
              </dt>
              <dd>{exportPreview.methodVersion}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wide text-slate-400">
                Approved items
              </dt>
              <dd>{exportPreview.selectedItemIds.length}</dd>
            </div>
            {exportPreview.latestExport ? (
              <div>
                <dt className="font-bold uppercase tracking-wide text-slate-400">
                  Laatste preview
                </dt>
                <dd>
                  {exportPreview.latestExport.export_status} op{" "}
                  {formatDate(exportPreview.latestExport.created_at)}
                </dd>
              </div>
            ) : null}
          </dl>
          <form action={recordAiFotoExportPreview} className="mt-4">
            <input
              name="method_version"
              type="hidden"
              value={exportPreview.methodVersion}
            />
            <input
              name="scan_wave_id"
              type="hidden"
              value={exportPreview.scanWaveId ?? ""}
            />
            <input
              name="selected_item_ids"
              type="hidden"
              value={exportPreview.selectedItemIds.join(",")}
            />
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0E5A75] px-4 py-3 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!isReady}
              type="submit"
            >
              <MaterialIcon className="text-[18px]">inventory</MaterialIcon>
              Registreer preview
            </button>
          </form>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {(["waarde", "aandacht", "vaardigheid"] as const).map((cardType) => {
            const items = exportPreview.approvedItems.filter(
              (item) => item.card_type === cardType,
            );

            return (
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-5" key={cardType}>
                <p className="font-headline text-lg font-bold text-slate-800">
                  {cardTypeLabel(cardType)}
                </p>
                {items.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {items.map((item) => (
                      <li className="text-sm leading-6 text-slate-600" key={item.id}>
                        <span className="font-bold text-slate-800">{item.title}</span>
                        <span className="block font-mono text-[11px] font-bold text-slate-400">
                          {item.id}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Nog geen approved items voor deze kaart.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function RouteSection({
  routeItems,
}: {
  routeItems: AiFotoPreviewSummary["routeItems"];
}) {
  return (
    <section className="rounded-2xl border border-[#dbe3ec] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-xl font-bold text-[#2a3439]">
            30/60/90-route
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#566166]">
            Eerste routevoorstel op basis van de drie kaarten.
          </p>
        </div>
        <StatusPill tone="blue">Preview</StatusPill>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {routeItems.map((item) => (
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5" key={item.horizon}>
            <p className="font-mono text-xs font-extrabold text-[#0E5A75]">
              Dag {item.horizon}
            </p>
            <h3 className="mt-1 font-headline text-lg font-bold text-slate-800">
              {item.title}
            </h3>
            <ul className="mt-4 space-y-3">
              {item.items.map((routeItem) => (
                <li className="flex gap-2 text-sm leading-6 text-slate-600" key={routeItem}>
                  <MaterialIcon className="mt-1 text-[14px] text-[#3e6a00]">
                    check
                  </MaterialIcon>
                  <span>{routeItem}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function parseStatusFilter(
  value: string | string[] | undefined,
): AiFotoCardItemStatus | "all" {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (
    normalized === "ai_suggested" ||
    normalized === "approved" ||
    normalized === "consultant_reviewed" ||
    normalized === "draft"
  ) {
    return normalized;
  }

  return "all";
}

function groupCardItems(items: AiFotoCardItemRow[]) {
  return items.reduce<Record<AiFotoCardItemRow["card_type"], AiFotoCardItemRow[]>>(
    (groups, item) => {
      groups[item.card_type].push(item);
      return groups;
    },
    {
      aandacht: [],
      vaardigheid: [],
      waarde: [],
    },
  );
}

function cardTypeLabel(cardType: AiFotoCardItemRow["card_type"]) {
  return {
    aandacht: "Aandachtspuntenkaart",
    vaardigheid: "Vaardighedenkaart",
    waarde: "Waardekaart",
  }[cardType];
}

function cardItemStatusLabel(status: AiFotoCardItemStatus) {
  return {
    ai_suggested: "AI concept",
    approved: "Goedgekeurd",
    consultant_reviewed: "Review klaar",
    draft: "Draft",
  }[status];
}

function statusTone(status: AiFotoCardItemStatus) {
  return {
    ai_suggested: "blue",
    approved: "green",
    consultant_reviewed: "amber",
    draft: "grey",
  }[status] as "amber" | "blue" | "green" | "grey";
}

function exportReadinessLabel(readiness: AiFotoExportPreview["readiness"]) {
  return {
    incomplete_metadata: "Metadata incompleet",
    no_approved_items: "Nog geen approved items",
    ready: "Export-preview gereed",
  }[readiness];
}

function formatDate(value: string | null) {
  if (!value) {
    return "onbekend";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
