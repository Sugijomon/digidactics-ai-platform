import type { ReactNode } from "react";
import {
  DashboardAccessPanel,
  DashboardShell,
  MaterialIcon,
  getDashboardAccess,
} from "@/components/dashboard-shell";
import {
  formatCode,
  getGovernanceSummary,
  getProgressSummary,
  getRiskSummary,
  type GovernanceSummary,
  type ProgressSummary,
  type ReviewQueueItem,
  type RiskSummary,
} from "../_lib/dashboard-data";

const HARD_TRIGGER_CODES = new Set([
  "prohibited_tool",
  "special_category_data",
  "hr_evaluation_context",
  "agentic_usage",
]);

const TRIGGER_META: Record<
  string,
  { color: string; label: string; note: string; type: "hard" | "pattern" | "score" }
> = {
  agentic_usage: {
    color: "#b4292d",
    label: "Agentic AI gebruik",
    note: "Autonoom handelen buiten organisatieregie; ook bij toegestane tools.",
    type: "hard",
  },
  automation_unmanaged: {
    color: "#C06000",
    label: "Automatisering onbeheerd",
    note: "Workflow of automatische verwerking vraagt expliciete inrichting en toezicht.",
    type: "pattern",
  },
  dpo_attention_note: {
    color: "#0369a1",
    label: "DPO-duiding",
    note: "Patroon vraagt interpretatie door DPO of governance-eigenaar.",
    type: "pattern",
  },
  extension_unmanaged: {
    color: "#C06000",
    label: "Browserextensie",
    note: "Mogelijke gegevensstroom buiten het zicht van organisatiebeheer.",
    type: "pattern",
  },
  hr_evaluation_context: {
    color: "#b4292d",
    label: "HR-evaluatie gebruik",
    note: "Potentieel juridisch aandachtspunt bij persoonsgebonden beoordeling.",
    type: "hard",
  },
  priority_threshold: {
    color: "#0369a1",
    label: "Priority score boven drempel",
    note: "Configureerbare reviewdrempel; score is een triagesignaal.",
    type: "score",
  },
  prohibited_tool: {
    color: "#b4292d",
    label: "Toolstatus: niet toegestaan",
    note: "Altijd reviewwaardig; score is niet leidend.",
    type: "hard",
  },
  special_category_data: {
    color: "#b4292d",
    label: "Bijzondere persoonsgegevens",
    note: "Hoge datagevoeligheid vraagt menselijke beoordeling.",
    type: "hard",
  },
};

const SKILL_ROWS = [
  {
    code: "beginner",
    color: "#b45309",
    governance: "basisregels nodig",
    label: "Beginner",
  },
  {
    code: "gemiddeld",
    color: "#0369a1",
    governance: "verdieping mogelijk",
    label: "Gemiddeld",
  },
  {
    code: "gevorderd",
    color: "#6d28d9",
    governance: "complexere werkstromen",
    label: "Gevorderd",
  },
  { code: "expert", color: "#3e6a00", governance: "kopgroep", label: "Expert" },
];

const POLICY_ROWS = [
  {
    code: "ja_goed",
    color: "#3e6a00",
    label: "Hoog — weet goed wat er mag",
  },
  {
    code: "vaag",
    color: "#b45309",
    label: "Partieel — heb er iets over gehoord",
  },
  {
    code: "nee",
    color: "#b4292d",
    label: "Laag — weet niet of er afspraken zijn",
  },
  {
    code: "geen_beleid",
    color: "#6d28d9",
    label: "Signaal — geen officieel beleid bekend",
  },
];

export default async function GovernanceDashboardPage() {
  const access = await getDashboardAccess();

  if (access.kind !== "authorized") {
    return (
      <DashboardShell active="governance">
        <DashboardAccessPanel access={access} />
      </DashboardShell>
    );
  }

  const [summary, progress, risk] = await Promise.all([
    getGovernanceSummary(access.roleState.orgId),
    getProgressSummary(access.roleState.orgId),
    getRiskSummary(access.roleState.orgId),
  ]);
  const model = buildGovernanceModel(summary, progress, risk);

  return (
    <DashboardShell active="governance">
      <section className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 font-headline text-3xl font-extrabold tracking-tight text-[#2a3439]">
              Governance
            </h1>
            <p className="max-w-4xl text-sm font-medium leading-6 text-[#566166]">
              Gedragsinzichten, AI Literacy, Policy Awareness en juridische
              aandachtspunten. Sociale indicatoren beïnvloeden de risicoscore
              niet; zij sturen interventie, training en bestuurlijke opvolging.
            </p>
            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-extrabold text-[#0369a1]">
              <MaterialIcon className="text-[14px]">auto_awesome</MaterialIcon>
              Best-of variant: rustige analyse + actiegerichte DPO-laag
            </span>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm">
            <MaterialIcon className="text-[14px] text-slate-400">info</MaterialIcon>
            Geen scorecomponent; puur interventielaag
          </span>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.8)] md:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
            {model.kpis.map((item) => (
              <GovernanceKpiCard item={item} key={item.label} />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <GovernanceCard
            icon="school"
            iconColor="#6d28d9"
            subtitle="Verdeling naar vaardigheidsniveau. Stuurvariabele voor trainingsplanning; niet voor risicoscore."
            title="AI Literacy & vaardigheid"
          >
            <BreakdownList rows={model.literacyRows} />
          </GovernanceCard>

          <GovernanceCard
            icon="policy"
            iconColor="#0e7490"
            subtitle="Bekendheid met het organisatiebeleid over AI. Laag = communicatiebehoefte, niet per se kwade wil."
            title="Policy Awareness"
          >
            <BreakdownList rows={model.policyRows} />
          </GovernanceCard>
        </div>

        <GovernanceCard
          icon="visibility_off"
          iconColor="#C06000"
          subtitle="Rangschikking op urgentie. Grootte = aantal respondenten; kleur = ernst."
          title="Awareness-gaps"
        >
          <AwarenessBubbleStrip gaps={model.awarenessGaps} />
        </GovernanceCard>

        <CombinationSection lanes={model.comboLanes} />

        <HardTriggerSection rows={model.triggerRows} summary={model.triggerSummary} />

        <GovernanceCard
          icon="route"
          iconColor="#3e6a00"
          subtitle="Hoeveelheid respondenten per signaal; divergerende schaal vanuit middenas."
          title="Innovatiedrijvers vs barrières"
        >
          <DivergingSignals left={model.barriers} right={model.innovationSignals} />
        </GovernanceCard>

        <StakeholderSection stakeholders={model.stakeholders} />
      </section>
    </DashboardShell>
  );
}

type KpiModel = {
  color: string;
  label: string;
  percent: number;
  sub: string;
  value: number | string;
};

type BreakdownRow = {
  color: string;
  count: number;
  label: string;
  note?: string;
  percent: number;
};

type AwarenessGap = {
  color: string;
  label: string;
  note: string;
  severity: "amber" | "red";
  value: number;
};

type ComboLane = {
  color: string;
  items: ComboSignal[];
  label: string;
  sub: string;
};

type ComboSignal = {
  action: string;
  color: string;
  count: number;
  icon: string;
  pattern: string;
  type: string;
};

type TriggerRow = {
  color: string;
  count: number;
  label: string;
  note: string;
  type: "hard" | "pattern" | "score";
};

type SignalRow = {
  color: string;
  label: string;
  value: number;
};

type StakeholderModel = {
  background: string;
  color: string;
  icon: string;
  items: string[];
  title: string;
};

function GovernanceKpiCard({ item }: { item: KpiModel }) {
  return (
    <article className="flex min-h-[136px] flex-col justify-start rounded-xl border border-[rgba(193,201,207,.25)] bg-white p-5 text-center shadow-[0_8px_24px_rgba(26,32,44,.06)]">
      <p className="mb-1 flex min-h-[2.5em] items-center justify-center text-center text-[11px] font-medium uppercase leading-tight tracking-tight text-[#566166]">
        {item.label}
      </p>
      <h3
        className="font-headline text-[clamp(1.75rem,2.2vw,2.25rem)] font-extrabold leading-tight tabular-nums"
        style={{ color: item.color }}
      >
        {item.value}
      </h3>
      <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ background: item.color, width: `${Math.min(item.percent, 100)}%` }}
        />
      </div>
      <p className="mt-1 flex min-h-[2.5em] items-start justify-center text-center text-[10px] text-[#566166]">
        {item.sub}
      </p>
    </article>
  );
}

function GovernanceCard({
  action,
  children,
  icon,
  iconColor,
  subtitle,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  icon: string;
  iconColor: string;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dbe3ec] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
      <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 text-[26px] leading-none" style={{ color: iconColor }}>
            <MaterialIcon className="text-[26px]">{icon}</MaterialIcon>
          </span>
          <div className="min-w-0">
            <h3 className="font-headline text-xl font-bold text-[#2a3439]">{title}</h3>
            <p className="mt-0.5 text-sm text-[#566166]">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="px-6 pb-6">{children}</div>
    </section>
  );
}

function BreakdownList({ rows }: { rows: BreakdownRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Nog geen data beschikbaar.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <article
          className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
          key={row.label}
        >
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: row.color }}
              />
              <p className="truncate text-[13px] font-extrabold text-slate-800" title={row.label}>
                {row.label}
                {row.note ? (
                  <span className="font-semibold text-slate-400"> - {row.note}</span>
                ) : null}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-mono text-[12px] font-extrabold" style={{ color: row.color }}>
                {row.count}
              </span>
              <span className="text-[10px] text-slate-400">({row.percent}%)</span>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full"
              style={{ background: row.color, width: `${row.percent}%` }}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function AwarenessBubbleStrip({ gaps }: { gaps: AwarenessGap[] }) {
  const sorted = [...gaps].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((gap) => gap.value), 1);
  const min = Math.min(...sorted.map((gap) => gap.value), max);

  if (sorted.every((gap) => gap.value === 0)) {
    return <p className="text-sm text-slate-500">Nog geen awareness-gaps zichtbaar.</p>;
  }

  return (
    <div className="flex flex-wrap items-end gap-3 lg:flex-nowrap">
      {sorted.map((gap) => {
        const spread = max === min ? 1 : (gap.value - min) / (max - min);
        const size = Math.round(46 + spread * 62);
        const cardWidth = Math.round(132 + spread * 36);
        const cardHeight = Math.round(116 + spread * 70);
        const bg = gap.severity === "red" ? "#fff0f0" : "#fff4e6";
        return (
          <article
            className="flex shrink-0 flex-col items-center justify-center rounded-[13px] border border-[#edf2f7] bg-white px-2.5 py-3 text-center shadow-[0_6px_18px_rgba(15,23,42,.04)]"
            key={gap.label}
            style={{ minHeight: cardHeight, width: cardWidth }}
            title={gap.note}
          >
            <div
              className="mx-auto mb-2.5 flex items-center justify-center rounded-full border-[3px] font-mono font-extrabold shadow-[0_10px_24px_rgba(15,23,42,.06)]"
              style={{
                background: bg,
                borderColor: gap.color,
                color: gap.color,
                fontSize: Math.max(15, Math.round(size / 4.2)),
                height: size,
                width: size,
              }}
            >
              {gap.value}
            </div>
            <p className="flex min-h-[2.35em] items-start justify-center text-[12px] font-extrabold leading-tight text-slate-800">
              {gap.label}
            </p>
          </article>
        );
      })}
    </div>
  );
}

function CombinationSection({ lanes }: { lanes: ComboLane[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dbe3ec] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
      <div className="flex items-start gap-3 px-6 pb-4 pt-6">
        <span className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center text-[#0369a1]">
          <OverlappingCirclesIcon />
        </span>
        <div>
          <h3 className="font-headline text-xl font-bold text-[#2a3439]">Combinatiesignalen</h3>
          <p className="mt-0.5 text-sm text-[#566166]">
            Meeste waarde uit sociale indicatoren ontstaat door combinaties. Patroon bepaalt de
            juiste interventie.
          </p>
        </div>
      </div>
      <div className="px-6 pb-6">
        <CombinationLanes lanes={lanes} />
      </div>
    </section>
  );
}

function OverlappingCirclesIcon() {
  return (
    <svg aria-hidden="true" className="h-[26px] w-[26px]" fill="none" viewBox="0 0 26 26">
      <circle cx="10.2" cy="13" r="6.2" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="15.8" cy="13" r="6.2" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M12.8 7.5a6.2 6.2 0 0 1 0 11M13.2 7.5a6.2 6.2 0 0 0 0 11"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function CombinationLanes({ lanes }: { lanes: ComboLane[] }) {
  return (
    <div className="grid gap-3">
      {lanes.map((lane) => (
        <section className="overflow-hidden rounded-[14px] border border-[#e2e8f0] bg-white" key={lane.label}>
          <div className="flex items-center justify-between gap-3 border-b border-[#eef2f7] bg-[#f8fafc] px-3.5 py-[9px] max-[760px]:block">
            <p
              className="flex items-center gap-2 font-mono text-[11px] font-extrabold uppercase tracking-[.04em]"
              style={{ color: lane.color }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: lane.color }} />
              {lane.label}
            </p>
            <p className="text-[10px] font-bold text-[#64748b] max-[760px]:mt-0.5">
              {lane.sub} · {lane.items.length} patroon{lane.items.length === 1 ? "" : "en"}
            </p>
          </div>
          <div>
            {lane.items.map((item) => (
              <article
                className="grid gap-3.5 border-l-4 border-t border-[#f1f5f9] px-3.5 py-[13px] transition-[background-color,border-color,box-shadow,transform] first:border-t-0 hover:bg-[#fbfdff] md:grid-cols-[minmax(0,1fr)_auto] md:items-center max-[760px]:grid-cols-1"
                key={item.pattern}
                style={{ borderLeftColor: item.color }}
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${item.color}14`, color: item.color }}
                  >
                    <ComboGlyph icon={item.icon} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-extrabold leading-[1.25] text-[#1e293b]">
                      {item.pattern}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#64748b]">
                      {item.type} · n={item.count}
                    </p>
                  </div>
                </div>
                <span
                  className="inline-flex w-max max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-extrabold max-[760px]:whitespace-normal"
                  style={{ background: `${item.color}12`, color: item.color }}
                >
                  <ActionGlyph icon={actionIcon(item.action)} />
                  {item.action}
                </span>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ComboGlyph({ icon }: { icon: string }) {
  if (icon === "warning") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 20 20">
        <path d="M10 3 18 17H2L10 3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M10 7.5v4.2M10 14.8h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      </svg>
    );
  }
  if (icon === "school") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 20 20">
        <path d="M2.5 7.5 10 4l7.5 3.5L10 11 2.5 7.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
        <path d="M5.5 9v4.2c1.4 1.2 2.9 1.8 4.5 1.8s3.1-.6 4.5-1.8V9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      </svg>
    );
  }
  if (icon === "visibility_off") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 20 20">
        <path d="M3 3l14 14M8.3 8.3a2.4 2.4 0 0 0 3.4 3.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path d="M7.1 4.7A8.6 8.6 0 0 1 10 4c4 0 6.7 3.4 7.7 6-.4.9-1 1.9-1.8 2.7M12.8 15.3A8.8 8.8 0 0 1 10 16c-4 0-6.7-3.4-7.7-6 .4-.9 1-1.8 1.7-2.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    );
  }
  if (icon === "manage_accounts") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 20 20">
        <circle cx="7.2" cy="7" r="2.7" stroke="currentColor" strokeWidth="1.7" />
        <path d="M2.6 15.5c.8-2.8 2.3-4.1 4.6-4.1s3.8 1.3 4.6 4.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        <path d="M15 8.2v3.6M13.2 10h3.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      </svg>
    );
  }
  if (icon === "lightbulb") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 20 20">
        <path d="M6.2 9.2a3.8 3.8 0 1 1 7.6 0c0 1.5-.8 2.3-1.7 3.3-.5.5-.8 1.1-.9 1.8H8.8c-.1-.7-.4-1.3-.9-1.8-.9-1-1.7-1.8-1.7-3.3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
        <path d="M8.8 16h2.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      </svg>
    );
  }
  if (icon === "shield") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 20 20">
        <path d="M10 2.8 15.3 4.3v4.9c0 3.5-2.1 6.6-5.3 8-3.2-1.4-5.3-4.5-5.3-8V4.3L10 2.8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 20 20">
      <path d="M10 3.4 11.7 8 16.6 10 11.7 12 10 16.6 8.3 12 3.4 10 8.3 8 10 3.4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function ActionGlyph({ icon }: { icon: string }) {
  if (icon === "school") return <ComboGlyph icon="school" />;
  if (icon === "verified_user") return <ComboGlyph icon="shield" />;
  if (icon === "groups") return <StakeholderHeaderIcon />;
  if (icon === "route") {
    return (
      <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20">
        <path d="M5 5h2.5a3 3 0 0 1 0 6H12a3 3 0 0 1 0 6H9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <circle cx="4" cy="5" r="1.4" fill="currentColor" />
        <circle cx="16" cy="17" r="1.4" fill="currentColor" />
      </svg>
    );
  }
  if (icon === "search") {
    return (
      <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20">
        <circle cx="8.5" cy="8.5" r="5" stroke="currentColor" strokeWidth="1.8" />
        <path d="m12.2 12.2 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20">
      <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function HardTriggerSection({
  rows,
  summary,
}: {
  rows: TriggerRow[];
  summary: ReturnType<typeof summarizeTriggers>;
}) {
  if (rows.length === 0) {
    return (
      <section className="overflow-hidden rounded-2xl border border-[#dbe3ec] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
        <HardTriggerHeader summary={summary} />
        <p className="px-6 pb-6 pt-4 text-sm text-slate-500">
          Nog geen hard review-trigger zichtbaar.
        </p>
      </section>
    );
  }

  const max = Math.max(...rows.map((row) => row.count), 1);
  const topHard = rows.find((row) => row.type === "hard") ?? rows[0];

  return (
    <section className="overflow-hidden rounded-2xl border border-[#dbe3ec] bg-white pb-6 shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
      <HardTriggerHeader summary={summary} />

      <div className="mx-6 my-[18px] rounded-xl border border-[#fecaca] bg-[#fff7f7] px-4 py-[13px] text-sm leading-[1.45] text-[#b4292d] max-[700px]:mx-4 max-[700px]:text-[13px]">
        <strong>{topHard.label}</strong> — {topHard.count} gevallen.{" "}
        {withoutTrailingPeriod(topHard.note)}. Signaal voor menselijke beoordeling, geen
        juridische eindconclusie.
      </div>

      <div className="mt-[14px]">
        <div className="hidden grid-cols-[minmax(230px,1.2fr)_112px_minmax(160px,.9fr)_48px_minmax(220px,1fr)] items-center gap-[18px] border-b border-slate-200 px-3 pb-2 text-[11px] font-extrabold uppercase tracking-[.06em] text-[#8a9aaf] min-[1101px]:grid">
          <div>Trigger</div>
          <div>Type</div>
          <div>Prevalentie</div>
          <div className="text-right">n</div>
          <div>Toelichting</div>
        </div>

        <div
          className="max-h-[275px] overflow-y-auto pr-1"
          style={{ scrollbarColor: "#cbd5e1 transparent", scrollbarWidth: "thin" }}
        >
          {rows.map((row) => (
            <article
              className="grid items-center gap-2 border-b border-[#eef2f7] px-3 py-[13px] last:border-b-0 max-[1100px]:grid-cols-[minmax(0,1fr)_92px_44px] max-[1100px]:gap-2 max-[700px]:grid-cols-[1fr_44px] min-[1101px]:grid-cols-[minmax(230px,1.2fr)_112px_minmax(160px,.9fr)_48px_minmax(220px,1fr)] min-[1101px]:gap-[18px]"
              key={row.label}
            >
              <p className="text-sm font-extrabold leading-[1.3] text-[#334155]">{row.label}</p>
              <TriggerTypeTag type={row.type} />
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 max-[1100px]:col-span-full max-[1100px]:row-start-2">
                <div
                  className="h-full rounded-full opacity-75"
                  style={{ background: triggerColor(row.type), width: `${Math.round((row.count / max) * 100)}%` }}
                />
              </div>
              <p
                className="text-right font-mono text-[15px] font-extrabold"
                style={{ color: triggerColor(row.type) }}
              >
                {row.count}
              </p>
              <p className="text-[13px] leading-[1.35] text-[#64748b] max-[1100px]:col-span-full max-[1100px]:row-start-3">
                {row.note}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HardTriggerHeader({ summary }: { summary: ReturnType<typeof summarizeTriggers> }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 pb-4 pt-6 max-[700px]:block">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center text-[#b4292d]">
          <CrisisAlertIcon />
        </span>
        <div className="min-w-0">
          <h3 className="font-headline text-xl font-bold text-[#2a3439]">
            Hard review-triggers
          </h3>
          <p className="mt-0.5 text-sm text-[#566166]">
            Triggers voor menselijke beoordeling, ongeacht de uitkomst van de scoreformule.
          </p>
        </div>
      </div>
      <div className="mt-1 shrink-0 text-right text-[11px] font-extrabold text-[#8a9aaf] max-[700px]:mt-3 max-[700px]:text-left">
        {summary.total} trigger-gevallen · hard {summary.hard} · patroon {summary.pattern} ·
        score {summary.score}
        <span className="ml-2 inline-flex rounded-md bg-[#fdecea] px-[9px] py-1 font-mono text-[11px] font-extrabold text-[#b4292d]">
          {summary.hard} hard floor
        </span>
      </div>
    </div>
  );
}

function CrisisAlertIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      fill="none"
      viewBox="0 0 32 32"
    >
      <path
        d="M16 4.2v10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.4"
      />
      <path
        d="M10.2 7.9a12 12 0 1 0 11.6 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
      <path
        d="M11.9 13a6.3 6.3 0 1 0 8.2 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <circle cx="16" cy="19" fill="currentColor" r="2.2" />
    </svg>
  );
}

function TriggerTypeTag({ type }: { type: TriggerRow["type"] }) {
  const styles = {
    hard: "bg-[#fdecea] text-[#b4292d]",
    pattern: "bg-[#fff7ed] text-[#b45309]",
    score: "bg-[#eff6ff] text-[#1d4ed8]",
  }[type];
  const label = {
    hard: "hard floor",
    pattern: "patroon",
    score: "score",
  }[type];
  return (
    <span
      className={`inline-flex w-max items-center gap-1 whitespace-nowrap rounded-[5px] px-2 py-0.5 font-mono text-[10px] font-extrabold tracking-[.02em] ${styles}`}
    >
      {label}
    </span>
  );
}

function triggerColor(type: TriggerRow["type"]) {
  return {
    hard: "#b4292d",
    pattern: "#C06000",
    score: "#0369a1",
  }[type];
}

function withoutTrailingPeriod(value: string) {
  return value.replace(/[.\s]+$/u, "");
}

function DivergingSignals({ left, right }: { left: SignalRow[]; right: SignalRow[] }) {
  const max = Math.max(...left.map((item) => item.value), ...right.map((item) => item.value), 1);
  const rowH = 30;
  const top = 42;
  const gap = 6;
  const rightHeight = Math.max(right.length, 1) * rowH;
  const height = top + rightHeight + gap + Math.max(left.length, 1) * rowH + 28;
  const mid = 360;
  const scale = (value: number) => Math.round((value / max) * 245);

  return (
    <svg
      aria-label="Innovatiedrijvers versus barrières"
      className="block h-auto w-full"
      role="img"
      viewBox={`0 0 760 ${height}`}
    >
      <text
        fill="#b4292d"
        fontFamily="var(--font-mono), ui-monospace, monospace"
        fontSize="12"
        fontWeight="800"
        textAnchor="end"
        x={mid - 18}
        y="20"
      >
        ← Barrières
      </text>
      <text
        fill="#3e6a00"
        fontFamily="var(--font-mono), ui-monospace, monospace"
        fontSize="12"
        fontWeight="800"
        textAnchor="start"
        x={mid + 18}
        y="20"
      >
        Innovatie →
      </text>
      <line stroke="#e2e8f0" strokeWidth="1" x1={mid} x2={mid} y1="28" y2={height - 16} />
      {right.map((item, index) => {
        const y = top + index * rowH;
        const width = scale(item.value);
        return (
          <g key={`right-${item.label}`}>
            <text
              fill="#1e293b"
              fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
              fontSize="12"
              fontWeight="600"
              textAnchor="end"
              x={mid - 10}
              y={y + 15}
            >
              {item.label}
            </text>
            <rect fill="#a8bd8e" height="20" opacity=".82" rx="4" width={width} x={mid + 4} y={y} />
            <text
              fill="#3e6a00"
              fontFamily="var(--font-mono), ui-monospace, monospace"
              fontSize="12"
              fontWeight="800"
              x={mid + width + 10}
              y={y + 15}
            >
              {item.value}
            </text>
          </g>
        );
      })}
      {left.map((item, index) => {
        const y = top + rightHeight + gap + index * rowH;
        const width = scale(item.value);
        return (
          <g key={`left-${item.label}`}>
            <text
              fill="#1e293b"
              fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
              fontSize="12"
              fontWeight="600"
              textAnchor="start"
              x={mid + 10}
              y={y + 15}
            >
              {item.label}
            </text>
            <rect fill="#d7979d" height="20" opacity=".82" rx="4" width={width} x={mid - 4 - width} y={y} />
            <text
              fill="#b4292d"
              fontFamily="var(--font-mono), ui-monospace, monospace"
              fontSize="12"
              fontWeight="800"
              textAnchor="end"
              x={mid - width - 12}
              y={y + 15}
            >
              {item.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StakeholderSection({ stakeholders }: { stakeholders: StakeholderModel[] }) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white px-5 py-5 shadow-[0_8px_24px_rgba(26,32,44,.05)]">
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-[#0E5A75]">
          <StakeholderHeaderIcon />
        </span>
        <div>
          <h3 className="font-headline text-[22px] font-extrabold leading-tight text-[#0b1726]">
            Inzichten per stakeholder
          </h3>
          <p className="mt-0.5 text-[15px] leading-6 text-[#475569]">
            Dezelfde signalen zijn voor verschillende stakeholders relevant op verschillende
            manieren.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stakeholders.map((item) => (
          <StakeholderCard item={item} key={item.title} />
        ))}
      </div>
    </section>
  );
}

function StakeholderCard({ item }: { item: StakeholderModel }) {
  return (
    <article className="min-h-[300px] rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
      <div className="mb-4 flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: item.background, color: item.color }}
        >
          <StakeholderIcon icon={item.icon} />
        </span>
        <p className="font-headline text-[16px] font-extrabold leading-tight text-slate-900">
          {item.title}
        </p>
      </div>
      <ul className="space-y-2.5">
        {item.items.map((entry) => (
          <li className="flex items-start gap-2.5" key={entry}>
            <StakeholderChevron color={item.color} />
            <span className="text-[13px] leading-snug text-slate-700">{entry}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function StakeholderHeaderIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 32 32">
      <circle cx="16" cy="10" r="4" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M8.5 25v-2.2c0-4 3.2-7.2 7.2-7.2h.6c4 0 7.2 3.2 7.2 7.2V25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
      <circle cx="7.5" cy="13" r="3" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M3.5 24v-1.6c0-3 2.3-5.4 5.2-5.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
      <circle cx="24.5" cy="13" r="3" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M28.5 24v-1.6c0-3-2.3-5.4-5.2-5.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function StakeholderIcon({ icon }: { icon: string }) {
  if (icon === "shield") {
    return (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 3.2 18.2 5v5.6c0 4.1-2.5 7.8-6.2 9.4-3.7-1.6-6.2-5.3-6.2-9.4V5L12 3.2Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (icon === "people") {
    return (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M3.8 18.5c.8-3 2.7-4.5 5.2-4.5s4.4 1.5 5.2 4.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M15.8 14.3c2.2.3 3.7 1.7 4.4 4.2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (icon === "developer_board") {
    return (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <rect
          height="15"
          rx="2"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="2"
          width="15"
          x="4.5"
          y="4.5"
        />
        <path d="M9 8.5h2.5V11H9zM13.5 8.5H16V11h-2.5zM9 13h2.5v2.5H9zM13.5 13H16v2.5h-2.5z" fill="currentColor" />
        <path
          d="M2.5 8h2M2.5 12h2M2.5 16h2M19.5 8h2M19.5 12h2M19.5 16h2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 19V9.5h3.5V19H5ZM10.25 19V5h3.5v14h-3.5ZM15.5 19v-8h3.5v8h-3.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M4 19h16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function StakeholderChevron({ color }: { color: string }) {
  return (
    <svg
      aria-hidden="true"
      className="mt-[5px] h-3 w-3 shrink-0"
      fill="none"
      viewBox="0 0 12 12"
    >
      <path
        d="M4.5 3.5 7 6 4.5 8.5"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function buildGovernanceModel(
  summary: GovernanceSummary,
  progress: ProgressSummary,
  risk: RiskSummary,
) {
  const total = Math.max(progress.totalCompleted, progress.totalStarted, 1);
  const triggerRows = buildTriggerRows(risk, summary);
  const dpoRequiredRuns = risk.dpoRequiredRuns;
  const awarenessGaps = buildAwarenessGaps(progress);
  const awarenessTotal = awarenessGaps.reduce((sum, gap) => sum + gap.value, 0);
  const lowPolicy = countRecord(progress.policyAwareness, ["nee", "geen_beleid"]);
  const beginner = progress.skillLevels.beginner ?? 0;

  const kpis: KpiModel[] = [
    {
      color: "#b4292d",
      label: "Hard triggers actief",
      percent: percent(dpoRequiredRuns, total),
      sub: "dpo_review_required",
      value: dpoRequiredRuns,
    },
    {
      color: "#b45309",
      label: "Awareness gaps",
      percent: percent(awarenessTotal, total),
      sub: "unieke respondenten",
      value: awarenessTotal,
    },
    {
      color: "#0369a1",
      label: "Lage policy awareness",
      percent: percent(lowPolicy, total),
      sub: "laag + geen beleid",
      value: lowPolicy,
    },
    {
      color: "#6d28d9",
      label: "Literacy: Beginner",
      percent: percent(beginner, total),
      sub: "trainingsbehoefte hoog",
      value: beginner,
    },
    {
      color: "#3e6a00",
      label: "Ambassadeurs kandidaten",
      percent: percent(progress.ambassadorOptIns, total),
      sub: "opt-in beschikbaar",
      value: progress.ambassadorOptIns,
    },
  ];

  return {
    awarenessGaps,
    barriers: buildBarriers(progress),
    comboLanes: buildComboLanes(progress, risk, dpoRequiredRuns, lowPolicy),
    innovationSignals: buildInnovationSignals(progress),
    kpis,
    literacyRows: SKILL_ROWS.map((row) => toBreakdown(row, progress.skillLevels, total)),
    policyRows: POLICY_ROWS.map((row) => toBreakdown(row, progress.policyAwareness, total)),
    stakeholders: buildStakeholders(),
    triggerRows,
    triggerSummary: summarizeTriggers(triggerRows),
  };
}

function buildAwarenessGaps(progress: ProgressSummary): AwarenessGap[] {
  return [
    {
      color: "#b85a00",
      label: "Data-onzekerheid",
      note: "Geen of beperkte controle op privacy en data-opslag.",
      severity: "amber",
      value: countRecord(progress.dataAwareness, ["gedeeltelijk", "nee_prive", "nee_niet_verdiept"]),
    },
    {
      color: "#b4292d",
      label: "Extensie-onwetendheid",
      note: "Geïnstalleerd, maar onzeker of extensies meekijken.",
      severity: "red",
      value: countRecord(progress.browserExtensionUsage, ["ja_onzeker", "weet_niet"]),
    },
    {
      color: "#b4292d",
      label: "Automatisering onbekend",
      note: "Tools werken mogelijk zelfstandig, maar dat is niet zeker.",
      severity: "red",
      value: countRecord(progress.automationUsage, ["weet_niet_zeker"]),
    },
    {
      color: "#b85a00",
      label: "Output direct overnemen",
      note: "AI-resultaten worden meestal direct overgenomen.",
      severity: "amber",
      value: countRecord(progress.processingOutput, ["direct_overnemen"]),
    },
    {
      color: "#b85a00",
      label: "Anonimisering onbekend",
      note: "Respondenten wisten niet dat anonimiseren nodig of mogelijk was.",
      severity: "amber",
      value: countRecord(progress.anonymizationBehavior, ["wist_niet"]),
    },
    {
      color: "#b85a00",
      label: "Data-opslag aanname",
      note: "Aanname dat gegevens privé blijven zonder expliciete controle.",
      severity: "amber",
      value: countRecord(progress.dataAwareness, ["nee_prive"]),
    },
  ];
}

function buildComboLanes(
  progress: ProgressSummary,
  risk: RiskSummary,
  hardTriggers: number,
  lowPolicy: number,
): ComboLane[] {
  const dataUncertainty = countRecord(progress.dataAwareness, [
    "gedeeltelijk",
    "nee_prive",
    "nee_niet_verdiept",
  ]);
  const complexRisk = sumRespondents(
    risk.reviewQueue.filter(
      (item) =>
        isPrivateAccount(item.accountType) &&
        /gevoelig|klant|financ|jurid|person|persoons/i.test(item.dataType),
    ),
  );
  const businessCase =
    getEntryCount(progress.motivations, "complexe_taken") +
    getEntryCount(progress.motivations, "kwaliteitsverbetering");
  const experimenters =
    getEntryCount(progress.motivations, "experimenteren") + progress.ambassadorOptIns;

  const urgent = [
    {
      action: "DPO-duiding en opvolging",
      color: "#b4292d",
      count: hardTriggers,
      icon: "warning",
      pattern: "Hoge shadow + hoge policy awareness",
      type: "Bewust risico",
    },
  ];
  const elevated = [
    {
      action: "Training en communicatie eerst",
      color: "#b45309",
      count: lowPolicy,
      icon: "school",
      pattern: "Hoge shadow + lage policy awareness",
      type: "Onbewust risico",
    },
    {
      action: "Awareness-check; score kan context missen",
      color: "#0369a1",
      count: dataUncertainty,
      icon: "visibility_off",
      pattern: "Lage exposure + data-onzekerheid",
      type: "Latent risico",
    },
    {
      action: "DPO-duiding en licentie-optie",
      color: "#6d28d9",
      count: complexRisk,
      icon: "manage_accounts",
      pattern: "Expert + privéaccount + gevoelige data",
      type: "Complex risico",
    },
  ];
  const monitor = [
    {
      action: "Direct bruikbaar voor IT-roadmap",
      color: "#3e6a00",
      count: businessCase,
      icon: "lightbulb",
      pattern: "Geen intern alternatief + diverse use-cases",
      type: "Business case",
    },
    {
      action: "Kandidaat AI-kopgroep",
      color: "#0e7490",
      count: experimenters,
      icon: "star",
      pattern: "Experimenteren + ambassadeursbereid + gevorderd+",
      type: "Ambassadeur",
    },
  ];

  return [
    { color: "#b4292d", items: urgent, label: "Urgent", sub: "direct duiden" },
    {
      color: "#C06000",
      items: elevated,
      label: "Verhoogd",
      sub: "opvolgen in planning",
    },
    {
      color: "#0369a1",
      items: monitor,
      label: "Monitor",
      sub: "kans of adoptiesignaal",
    },
  ];
}

function buildTriggerRows(risk: RiskSummary, summary: GovernanceSummary): TriggerRow[] {
  const source = risk.topTriggers.length > 0 ? risk.topTriggers : summary.byReason;

  return source
    .map(([code, count]) => {
      const meta = TRIGGER_META[code] ?? {
        color: HARD_TRIGGER_CODES.has(code) ? "#b4292d" : "#0369a1",
        label: formatCode(code),
        note: "Reviewsignaal uit V8-score of DPO-reviewitem.",
        type: HARD_TRIGGER_CODES.has(code) ? ("hard" as const) : ("pattern" as const),
      };
      return {
        color: meta.color,
        count,
        label: meta.label,
        note: meta.note,
        type: meta.type,
      };
    })
    .sort((a, b) => b.count - a.count);
}

function buildInnovationSignals(progress: ProgressSummary): SignalRow[] {
  return [
    {
      color: "#3e6a00",
      label: "Experimenteren",
      value: getEntryCount(progress.motivations, "experimenteren"),
    },
    {
      color: "#3e6a00",
      label: "Agentisch gebruik",
      value: countRecord(progress.automationUsage, ["agents_reeks_taken"]),
    },
    {
      color: "#3e6a00",
      label: "App-integraties",
      value: countRecord(progress.automationUsage, ["gekoppeld_apps"]),
    },
    {
      color: "#3e6a00",
      label: "Ambassadeursbereidheid",
      value: progress.ambassadorOptIns,
    },
    {
      color: "#3e6a00",
      label: "Ondersteuning gevraagd",
      value: progress.supportNeeds.reduce((sum, [, count]) => sum + count, 0),
    },
  ];
}

function buildBarriers(progress: ProgressSummary): SignalRow[] {
  return [
    {
      color: "#b4292d",
      label: "Geen toegevoegde waarde",
      value: progress.noAiReasons.geen_waarde ?? 0,
    },
    {
      color: "#b4292d",
      label: "Verboden op afdeling",
      value: progress.noAiReasons.verboden ?? 0,
    },
    {
      color: "#b4292d",
      label: "Weet niet hoe te beginnen",
      value: progress.noAiReasons.weet_niet_hoe ?? 0,
    },
  ];
}

function buildStakeholders(): StakeholderModel[] {
  return [
    {
      background: "#fdecef",
      color: "#b4292d",
      icon: "shield",
      items: [
        "Awareness-gaps + hoge exposure-score",
        "Extensie-onwetendheid & automatisering als onbewust risico",
        "Output direct overnemen in juridische context",
        "Policy awareness per afdeling: bewust vs onwetend",
      ],
      title: "DPO & Security",
    },
    {
      background: "#e8f4fb",
      color: "#0369a1",
      icon: "people",
      items: [
        "Skill-verdeling per afdeling — trainingsplanning",
        "Awareness-gaps als trainingsagenda",
        'Niet-gebruik: "weet niet hoe" als L&D-behoefte',
        "Ondersteuningsbehoefte: welke trainingsvormen?",
      ],
      title: "HR & L&D",
    },
    {
      background: "#f1e7ff",
      color: "#6d28d9",
      icon: "developer_board",
      items: [
        '"Geen intern alternatief" — sterkste business case',
        "Use-case clusters per afdeling",
        "Agents en app-integraties — innovatie-roadmap",
        "Gevraagde veilige AI use-cases (open tekstveld)",
      ],
      title: "IT & Innovatie",
    },
    {
      background: "#eef4e8",
      color: "#3e6a00",
      icon: "leaderboard",
      items: [
        "Adoptie-ratio: omvang AI-gebruikersgroep",
        "Shadow AI Index als executive summary",
        "Ambassador candidates als AI-kopgroep input",
        "Business pressure-signalen voor AI-strategie",
      ],
      title: "Management",
    },
  ];
}

function toBreakdown(
  row: { code: string; color: string; governance?: string; label: string },
  record: Record<string, number>,
  total: number,
): BreakdownRow {
  const count = record[row.code] ?? 0;
  return {
    color: row.color,
    count,
    label: row.label,
    note: row.governance,
    percent: percent(count, total),
  };
}

function summarizeTriggers(rows: TriggerRow[]) {
  return {
    hard: rows.filter((row) => row.type === "hard").reduce((sum, row) => sum + row.count, 0),
    pattern: rows
      .filter((row) => row.type === "pattern")
      .reduce((sum, row) => sum + row.count, 0),
    score: rows.filter((row) => row.type === "score").reduce((sum, row) => sum + row.count, 0),
    total: rows.reduce((sum, row) => sum + row.count, 0),
  };
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function countRecord(record: Record<string, number>, codes: string[]) {
  return codes.reduce((sum, code) => sum + (record[code] ?? 0), 0);
}

function getEntryCount(entries: [string, number][], code: string) {
  return entries.find(([entryCode]) => entryCode === code)?.[1] ?? 0;
}

function sumRespondents(items: ReviewQueueItem[]) {
  return items.reduce((sum, item) => sum + item.respondentCount, 0);
}

function isPrivateAccount(value: string) {
  return /priv|personal|eigen/i.test(value);
}

function actionIcon(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("training")) return "school";
  if (lower.includes("licentie")) return "verified_user";
  if (lower.includes("roadmap")) return "route";
  if (lower.includes("kopgroep")) return "groups";
  if (lower.includes("awareness")) return "search";
  return "arrow_forward";
}
