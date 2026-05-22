import {
  DashboardAccessPanel,
  DashboardShell,
  MetricCard,
  getDashboardAccess,
} from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

type RiskResultRow = {
  survey_run_id: string;
  person_score: number | string | null;
  highest_priority_score: number | string | null;
  score_tier: string | null;
  review_class: string | null;
  dpo_review_required: boolean | null;
  review_trigger_codes: string[] | null;
};

type RiskResultToolRow = {
  id: string;
  survey_run_id: string;
  shadow_score: number | string | null;
  exposure_score: number | string | null;
  priority_score: number | string | null;
  score_tier_tool: string | null;
  trigger_codes: string[] | null;
  survey_tool: {
    tool_name: string | null;
    org_policy_status_code_snapshot: string | null;
  } | null;
};

type RiskSummary = {
  averagePriority: number;
  criticalTools: number;
  dpoRequiredRuns: number;
  matrixCells: MatrixCell[];
  reviewQueue: ReviewQueueItem[];
  runs: RiskResultRow[];
  tierCounts: Record<string, number>;
  toolRows: RiskResultToolRow[];
  topTriggers: [string, number][];
};

type MatrixCell = {
  count: number;
  exposureBand: ScoreBand;
  shadowBand: ScoreBand;
};

type ReviewQueueItem = {
  exposureScore: number;
  priorityScore: number;
  shadowScore: number;
  tier: string;
  toolName: string;
  triggers: string[];
};

type ScoreBand = "low" | "elevated" | "high" | "critical";

const SCORE_BANDS: ScoreBand[] = ["low", "elevated", "high", "critical"];

export default async function RiskProfileDashboardPage() {
  const access = await getDashboardAccess();

  if (access.kind !== "authorized") {
    return (
      <DashboardShell>
        <DashboardAccessPanel access={access} />
      </DashboardShell>
    );
  }

  const summary = await getRiskSummary(access.roleState.orgId);

  return (
    <DashboardShell>
      <section className="grid gap-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6993aa]">
              DPO Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-[#00658b]">
              Risicoprofiel
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#40484e]">
              Triage op basis van shadow, exposure, priority en review triggers.
              Dit dashboard toont patronen en reviewdruk, geen individuele
              medewerkerprofielen.
            </p>
          </div>
          <span className="rounded-full border border-[#bfc7cf]/60 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#40484e] shadow-sm">
            V8.1 scoring
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Gescoorde runs" value={summary.runs.length} />
          <MetricCard label="DPO review" value={summary.dpoRequiredRuns} />
          <MetricCard label="Kritieke tools" value={summary.criticalTools} />
          <MetricCard label="Gem. priority" value={summary.averagePriority} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="grid gap-4 rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-[0_8px_30px_rgba(0,101,139,0.05)] md:p-6">
            <div>
              <h2 className="text-xl font-extrabold text-[#00658b]">
                Priority matrix
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#40484e]">
                Shadow-score tegenover exposure-score. Rechtsboven is de zone
                waar governance-afwijking en blootstelling samenkomen.
              </p>
            </div>
            <PriorityMatrix cells={summary.matrixCells} />
          </section>

          <section className="grid gap-4 rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-[0_8px_30px_rgba(0,101,139,0.05)] md:p-6">
            <div>
              <h2 className="text-xl font-extrabold text-[#00658b]">
                Scoreverdeling en triggers
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#40484e]">
                Welke band en welke reviewredenen bepalen de DPO-druk?
              </p>
            </div>
            <TierDistribution tierCounts={summary.tierCounts} />
            <TriggerList triggers={summary.topTriggers} />
          </section>
        </div>

        <section className="grid gap-4 rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-[0_8px_30px_rgba(0,101,139,0.05)] md:p-6">
          <div>
            <h2 className="text-xl font-extrabold text-[#00658b]">
              Review queue
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#40484e]">
              Hoogste prioriteit eerst. Dit is de basis voor de latere
              Governance-module.
            </p>
          </div>
          {summary.reviewQueue.length > 0 ? (
            <div className="grid gap-3">
              {summary.reviewQueue.map((item, index) => (
                <ReviewQueueRow item={item} key={`${item.toolName}-${index}`} />
              ))}
            </div>
          ) : (
            <EmptyRiskState />
          )}
        </section>
      </section>
    </DashboardShell>
  );
}

async function getRiskSummary(orgId: string): Promise<RiskSummary> {
  const supabase = await createClient();
  const [runsResult, toolsResult] = await Promise.all([
    supabase
      .from("risk_result")
      .select(
        "survey_run_id, person_score, highest_priority_score, score_tier, review_class, dpo_review_required, review_trigger_codes",
      )
      .eq("org_id", orgId)
      .returns<RiskResultRow[]>(),
    supabase
      .from("risk_result_tool")
      .select(
        `
          id,
          survey_run_id,
          shadow_score,
          exposure_score,
          priority_score,
          score_tier_tool,
          trigger_codes,
          survey_tool(tool_name, org_policy_status_code_snapshot)
        `,
      )
      .eq("org_id", orgId)
      .returns<RiskResultToolRow[]>(),
  ]);

  const runs = runsResult.error || !runsResult.data ? [] : runsResult.data;
  const toolRows = toolsResult.error || !toolsResult.data ? [] : toolsResult.data;
  const tierCounts = countTiers(runs);
  const topTriggers = countTriggers([
    ...runs.flatMap((row) => row.review_trigger_codes ?? []),
    ...toolRows.flatMap((row) => row.trigger_codes ?? []),
  ]);
  const reviewQueue = toolRows
    .map(toReviewQueueItem)
    .filter((item) => item.priorityScore >= 40 || item.triggers.length > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 8);
  const matrixCells = buildMatrixCells(toolRows);
  const dpoRequiredRuns = runs.filter((row) => row.dpo_review_required).length;
  const criticalTools = toolRows.filter(
    (row) => (row.score_tier_tool ?? "").toLowerCase() === "critical",
  ).length;
  const averagePriority =
    runs.length > 0
      ? Math.round(
          runs.reduce(
            (sum, row) => sum + toNumber(row.highest_priority_score),
            0,
          ) / runs.length,
        )
      : 0;

  return {
    averagePriority,
    criticalTools,
    dpoRequiredRuns,
    matrixCells,
    reviewQueue,
    runs,
    tierCounts,
    toolRows,
    topTriggers,
  };
}

function PriorityMatrix({ cells }: { cells: MatrixCell[] }) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[82px_repeat(4,minmax(0,1fr))] gap-1 text-center text-[11px] font-extrabold text-[#6993aa]">
        <span />
        {SCORE_BANDS.map((band) => (
          <span key={band}>{bandLabel(band)}</span>
        ))}
      </div>
      <div className="grid grid-cols-[82px_1fr] gap-1">
        <div className="grid grid-rows-4 gap-1 text-right text-[11px] font-extrabold text-[#6993aa]">
          {[...SCORE_BANDS].reverse().map((band) => (
            <span className="flex items-center justify-end pr-2" key={band}>
              {bandLabel(band)}
            </span>
          ))}
        </div>
        <div className="grid min-h-80 grid-cols-4 grid-rows-4 gap-1 overflow-hidden rounded-2xl border border-[#bfc7cf] bg-[#bfc7cf]">
          {[...SCORE_BANDS].reverse().flatMap((shadowBand) =>
            SCORE_BANDS.map((exposureBand) => {
              const cell = cells.find(
                (candidate) =>
                  candidate.shadowBand === shadowBand &&
                  candidate.exposureBand === exposureBand,
              );

              return (
                <div
                  className={`grid place-items-center p-3 ${matrixCellClass(
                    shadowBand,
                    exposureBand,
                  )}`}
                  key={`${shadowBand}-${exposureBand}`}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-sm font-extrabold text-[#181c1e] shadow-sm">
                    {cell?.count ?? 0}
                  </span>
                </div>
              );
            }),
          )}
        </div>
      </div>
      <p className="ml-[86px] text-xs font-semibold text-[#40484e]">
        X-as: exposure. Y-as: shadow. Aantallen zijn tool-score clusters.
      </p>
    </div>
  );
}

function TierDistribution({ tierCounts }: { tierCounts: Record<string, number> }) {
  const total = Object.values(tierCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="grid gap-3">
      {SCORE_BANDS.map((tier) => {
        const count = tierCounts[tier] ?? 0;
        const width = total > 0 ? Math.round((count / total) * 100) : 0;

        return (
          <div className="grid gap-1" key={tier}>
            <div className="flex justify-between text-xs font-bold text-[#40484e]">
              <span>{bandLabel(tier)}</span>
              <span>{count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#e5e9eb]">
              <div
                className={tierFillClass(tier)}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TriggerList({ triggers }: { triggers: [string, number][] }) {
  return (
    <div className="grid gap-2">
      <h3 className="mt-2 text-sm font-extrabold text-[#181c1e]">
        Top review triggers
      </h3>
      {triggers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {triggers.slice(0, 8).map(([trigger, count]) => (
            <span
              className="rounded-full border border-[#f0d38a] bg-[#fff7df] px-3 py-1.5 text-xs font-extrabold text-[#8a5600]"
              key={trigger}
            >
              {formatCode(trigger)} {count}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm font-semibold text-[#94a3b8]">
          Nog geen triggers berekend.
        </p>
      )}
    </div>
  );
}

function ReviewQueueRow({ item }: { item: ReviewQueueItem }) {
  return (
    <article className="grid gap-3 rounded-2xl border border-[#dbe3ec] bg-white p-4 md:grid-cols-[1fr_260px] md:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-extrabold text-[#181c1e]">
            {item.toolName}
          </h3>
          <RiskBadge tier={item.tier} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {item.triggers.length > 0 ? (
            item.triggers.slice(0, 4).map((trigger) => (
              <span
                className="rounded-full bg-[#f1f4f6] px-2.5 py-1 text-xs font-bold text-[#40484e]"
                key={trigger}
              >
                {formatCode(trigger)}
              </span>
            ))
          ) : (
            <span className="text-xs font-semibold text-[#94a3b8]">
              Geen triggercodes
            </span>
          )}
        </div>
      </div>
      <div className="grid gap-2">
        <ScoreBar color="#ca8a04" label="Shadow" value={item.shadowScore} />
        <ScoreBar color="#b90360" label="Exposure" value={item.exposureScore} />
        <ScoreBar color="#00658b" label="Priority" value={item.priorityScore} />
      </div>
    </article>
  );
}

function ScoreBar({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="grid grid-cols-[72px_1fr_36px] items-center gap-2 text-xs">
      <span className="font-bold text-[#40484e]">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-[#e5e9eb]">
        <span
          className="block h-full rounded-full"
          style={{ backgroundColor: color, width: `${Math.min(value, 100)}%` }}
        />
      </span>
      <span className="text-right font-mono font-extrabold">{value}</span>
    </div>
  );
}

function RiskBadge({ tier }: { tier: string }) {
  const className =
    tier === "critical"
      ? "border-[#efb5b5] bg-[#fcebeb] text-[#8e1b1b]"
      : tier === "high"
        ? "border-[#f0d38a] bg-[#fff1cc] text-[#8a5600]"
        : tier === "elevated"
          ? "border-[#c4e7ff] bg-[#f3fbff] text-[#00658b]"
          : "border-[#d6ecb4] bg-[#eef7e1] text-[#527a1b]";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${className}`}>
      {bandLabel(normalizeBand(tier))}
    </span>
  );
}

function EmptyRiskState() {
  return (
    <section className="rounded-2xl border border-dashed border-[#bfc7cf] bg-white p-8 text-center">
      <h2 className="text-lg font-extrabold text-[#00658b]">
        Nog geen risicoscores
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#40484e]">
        Zodra de scoring draait na afgeronde scans, verschijnt hier de DPO
        review queue.
      </p>
    </section>
  );
}

function countTiers(rows: RiskResultRow[]) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const tier = normalizeBand(row.score_tier ?? "low");
    counts[tier] = (counts[tier] ?? 0) + 1;
    return counts;
  }, {});
}

function countTriggers(triggers: string[]) {
  const counts = triggers.reduce<Record<string, number>>((acc, trigger) => {
    acc[trigger] = (acc[trigger] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function buildMatrixCells(rows: RiskResultToolRow[]): MatrixCell[] {
  const counts = new Map<string, MatrixCell>();

  for (const row of rows) {
    const shadowBand = scoreToBand(toNumber(row.shadow_score));
    const exposureBand = scoreToBand(toNumber(row.exposure_score));
    const key = `${shadowBand}-${exposureBand}`;
    const cell = counts.get(key) ?? { count: 0, exposureBand, shadowBand };
    cell.count += 1;
    counts.set(key, cell);
  }

  return Array.from(counts.values());
}

function toReviewQueueItem(row: RiskResultToolRow): ReviewQueueItem {
  return {
    exposureScore: toNumber(row.exposure_score),
    priorityScore: toNumber(row.priority_score),
    shadowScore: toNumber(row.shadow_score),
    tier: normalizeBand(row.score_tier_tool ?? "low"),
    toolName: row.survey_tool?.tool_name ?? "Onbekende tool",
    triggers: row.trigger_codes ?? [],
  };
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function scoreToBand(score: number): ScoreBand {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "elevated";
  return "low";
}

function normalizeBand(value: string): ScoreBand {
  return SCORE_BANDS.includes(value as ScoreBand) ? (value as ScoreBand) : "low";
}

function bandLabel(band: ScoreBand) {
  return {
    critical: "Kritiek",
    elevated: "Verhoogd",
    high: "Hoog",
    low: "Laag",
  }[band];
}

function matrixCellClass(shadowBand: ScoreBand, exposureBand: ScoreBand) {
  if (shadowBand === "critical" && exposureBand === "critical") {
    return "bg-[#fcebeb]";
  }
  if (
    shadowBand === "critical" ||
    exposureBand === "critical" ||
    shadowBand === "high" ||
    exposureBand === "high"
  ) {
    return "bg-[#fff1cc]";
  }
  if (shadowBand === "elevated" || exposureBand === "elevated") {
    return "bg-[#f3fbff]";
  }
  return "bg-[#eef7e1]";
}

function tierFillClass(tier: ScoreBand) {
  return {
    critical: "h-full rounded-full bg-[#8e1b1b]",
    elevated: "h-full rounded-full bg-[#00658b]",
    high: "h-full rounded-full bg-[#ca8a04]",
    low: "h-full rounded-full bg-[#527a1b]",
  }[tier];
}

function formatCode(code: string) {
  return code
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
