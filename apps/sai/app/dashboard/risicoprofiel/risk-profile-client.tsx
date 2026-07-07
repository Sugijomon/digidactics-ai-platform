"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Ban,
  Bolt,
  Bot,
  CircleGauge,
  CircleHelp,
  ExternalLink,
  FilterX,
  Flag,
  Gavel,
  LayoutGrid,
  Lock,
  Puzzle,
  Radar,
  ScatterChart,
  Shield,
  UserCog,
  X,
  type LucideIcon,
} from "lucide-react";
import type {
  MatrixCell,
  ReviewQueueItem,
  RiskSummary,
  ScoreBand,
} from "../_lib/dashboard-data";

type QuickFilter = "all" | "high" | "priority_review" | "toxic_combo" | "private_account";

type SelectFilters = {
  account: string;
  data: string;
  department: string;
  tier: string;
  tool: string;
  trigger: string;
};

const SCORE_BANDS: ScoreBand[] = ["low", "elevated", "high", "critical"];

const TRIGGER_META: Record<
  string,
  { className: string; icon: LucideIcon; label: string }
> = {
  agentic_usage: { className: "warn", icon: Bot, label: "Autonome AI" },
  automation_unmanaged: { className: "warn", icon: Bolt, label: "Onbeheerd" },
  dpo_attention_note: { className: "info", icon: Flag, label: "DPO-duiding" },
  extension_unmanaged: { className: "warn", icon: Puzzle, label: "Browserextensie" },
  hr_evaluation_context: { className: "hard", icon: Gavel, label: "HR / juridisch" },
  priority_threshold: { className: "info", icon: Flag, label: "Review nodig" },
  prohibited_tool: { className: "hard", icon: Ban, label: "Verboden tool" },
  special_category_data: { className: "hard", icon: Lock, label: "Bijzondere data" },
};

const HARD_TRIGGERS = new Set([
  "agentic_usage",
  "hr_evaluation_context",
  "prohibited_tool",
  "special_category_data",
]);

const EMPTY_FILTERS: SelectFilters = {
  account: "all",
  data: "all",
  department: "all",
  tier: "all",
  tool: "all",
  trigger: "all",
};

export function RiskProfileClient({ summary }: { summary: RiskSummary }) {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [filters, setFilters] = useState<SelectFilters>(EMPTY_FILTERS);
  const [drawerItem, setDrawerItem] = useState<ReviewQueueItem | null>(null);
  const allItems = useMemo(() => buildClusterItems(summary), [summary]);
  const openItems = useMemo(() => allItems.filter(isOpenReview), [allItems]);
  const filteredRows = useMemo(
    () => filterRows(openItems, quickFilter, filters),
    [filters, openItems, quickFilter],
  );
  const options = useMemo(() => buildFilterOptions(openItems), [openItems]);
  const kpis = useMemo(() => buildKpis(allItems, summary), [allItems, summary]);
  const topClusters = useMemo(
    () => [...allItems].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 5),
    [allItems],
  );
  const explanation = useMemo(() => buildClusterExplanation(topClusters), [topClusters]);

  return (
    <>
      <section className="space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-headline text-3xl font-extrabold tracking-tight text-[#2a3439]">
              Risicoprofiel
            </h1>
            <p className="mt-1 max-w-4xl text-sm font-medium leading-6 text-[#566166]">
              Triage op basis van V8.1 scoring: shadow-score, exposure-score,
              priority-score en review-triggers. Individuele medewerkers worden
              niet getoond; clusters met kleine aantallen worden samengevoegd.
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.8)] md:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
            {kpis.map((item) => (
              <KpiCard item={item} key={item.label} />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6">
          <Card
            icon={ScatterChart}
            subtitle="Shadow-score (Y) × Exposure-score (X). Focus op de Toxic Zone (rechtsboven). Klik op een bol voor details."
            title="Priority matrix"
          >
            <PriorityMatrix
              cells={summary.matrixCells}
              items={allItems}
              minCellSize={summary.minCellSize}
              onOpen={setDrawerItem}
            />
            {summary.suppressedMatrixCells > 0 ? (
              <p className="ml-[86px] mt-3 text-[11px] font-semibold text-slate-500">
                {summary.suppressedMatrixCells} matrixcellen bevatten kleine clusters
                onder de minimale celgrootte ({summary.minCellSize}).
              </p>
            ) : null}
          </Card>

          <Card
            badge="0-100 = aandeel reviewdruk"
            icon={Radar}
            subtitle="Welke risicotypes domineren de open reviewdruk?"
            title="Risicoprofiel radar"
          >
            <RiskRadar items={openItems} />
          </Card>

          <Card
            icon={Bolt}
            subtitle="Welke patronen verklaren de reviewdruk en verhogen de governance-prioriteit?"
            title="Risicoversterkers"
          >
            <RiskAmplifiers items={allItems} />
          </Card>
        </div>

        <section className="rounded-2xl border border-[#dbe3ec] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-headline text-xl font-extrabold text-slate-900">
                <Bolt className="h-5 w-5 text-red-600" />
                Risicoprofiel top-5 clusters
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Structurele concentraties per afdeling × tool. Dit blok tilt
                triage boven losse cases uit.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#fee2e2] px-2.5 py-1.5 text-[11px] font-extrabold text-[#991b1b]">
                Critical only
              </span>
              <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1.5 text-[11px] font-extrabold text-[#475569]">
                Filter op trigger
              </span>
              <span className="rounded-full bg-[#e0f2fe] px-2.5 py-1.5 text-[11px] font-extrabold text-[#075985]">
                Open risicosignalen
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <TopClusterTable items={topClusters} />
            <ClusterExplanation explanation={explanation} topItem={topClusters[0]} />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#dbe3ec] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
          <div className="flex items-start gap-4 px-6 pb-5 pt-6">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Shield className="mt-0.5 h-7 w-7 shrink-0 text-[#0369a1]" />
              <div>
                <h3 className="font-headline text-xl font-bold text-[#2a3439]">DPO Triage Review</h3>
                <p className="mt-0.5 text-sm text-[#566166]">
                  Selecteer een prioriteit om de triage te starten. Elke case vereist
                  een menselijke validatie.
                </p>
              </div>
            </div>
            <span
              className="hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-sky-700 md:inline-flex"
              title="Indicatief beeld op basis van zelfrapportage."
            >
              <CircleHelp className="h-3.5 w-3.5" />
              Op basis van zelfrapportage
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-white px-6 pb-5">
            <span className="mr-1 text-[11px] font-bold text-slate-400">
              Snelfilter:
            </span>
            <QuickChip
              active={quickFilter === "all"}
              icon={LayoutGrid}
              label="Alle tiers"
              onClick={() => setQuickFilter("all")}
            />
            <QuickChip
              active={quickFilter === "high"}
              icon={CircleGauge}
              label="Hoog risico"
              onClick={() => setQuickFilter("high")}
            />
            <QuickChip
              active={quickFilter === "priority_review"}
              icon={Flag}
              label="Review vereist"
              onClick={() => setQuickFilter("priority_review")}
            />
            <QuickChip
              active={quickFilter === "toxic_combo"}
              icon={Ban}
              label="Toxic combos"
              onClick={() => setQuickFilter("toxic_combo")}
            />
            <QuickChip
              active={quickFilter === "private_account"}
              icon={UserCog}
              label="Priveaccount"
              onClick={() => setQuickFilter("private_account")}
            />
            <button
              className="ml-auto inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setQuickFilter("all");
              }}
              type="button"
            >
              <FilterX className="h-4 w-4" />
              Filters wissen
            </button>
          </div>

          <div className="max-h-[440px] overflow-y-auto [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
            <table className="w-full min-w-[860px] table-fixed text-left">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[16%]" />
                <col className="w-[13%]" />
                <col className="w-[11%]" />
                <col className="w-[14%]" />
                <col className="w-[18%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  <FilterHeader
                    label="Alle vakgebieden"
                    onChange={(value) => setFilters((current) => ({ ...current, department: value }))}
                    options={options.departments}
                    value={filters.department}
                  />
                  <FilterHeader
                    label="Alle tools"
                    onChange={(value) => setFilters((current) => ({ ...current, tool: value }))}
                    options={options.tools}
                    value={filters.tool}
                  />
                  <FilterHeader
                    label="Account"
                    onChange={(value) => setFilters((current) => ({ ...current, account: value }))}
                    options={options.accounts}
                    value={filters.account}
                  />
                  <FilterHeader
                    label="Data"
                    onChange={(value) => setFilters((current) => ({ ...current, data: value }))}
                    options={options.dataTypes}
                    value={filters.data}
                  />
                  <FilterHeader
                    label="Tier"
                    onChange={(value) => setFilters((current) => ({ ...current, tier: value }))}
                    options={options.tiers}
                    value={filters.tier}
                  />
                  <FilterHeader
                    label="Trigger"
                    onChange={(value) => setFilters((current) => ({ ...current, trigger: value }))}
                    options={options.triggers}
                    value={filters.trigger}
                  />
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length > 0 ? (
                  filteredRows.map((item) => (
                    <TriageRow item={item} key={item.clusterId} onOpen={setDrawerItem} />
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-6 py-10 text-center text-sm font-semibold text-slate-400"
                      colSpan={7}
                    >
                      Geen open reviews binnen deze filterselectie.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3">
            <p className="text-[11px] text-slate-400">
              Menselijke validatie vereist op cluster-ID voor alle actieve
              triage-verzoeken.
            </p>
          </div>
        </section>

        <footer className="mt-auto pb-4 pt-2">
          <div className="border-t border-slate-200/60 pt-4">
            <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-slate-400">
              <CircleHelp className="h-3.5 w-3.5 opacity-70" />
              Review- en juridische signalen zijn indicatief en gebaseerd op
              zelfrapportage. Menselijk oordeel blijft leidend.
            </p>
          </div>
        </footer>
      </section>

      <RiskDrawer item={drawerItem} onClose={() => setDrawerItem(null)} />
    </>
  );
}

function Card({
  badge,
  children,
  icon: Icon,
  subtitle,
  title,
}: {
  badge?: string;
  children: ReactNode;
  icon: LucideIcon;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dbe3ec] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
      <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Icon className="mt-0.5 h-6 w-6 shrink-0 text-[#0369a1]" />
          <div>
            <h3 className="font-headline text-xl font-bold text-[#2a3439]">
              {title}
            </h3>
            <p className="mt-0.5 text-sm text-[#566166]">{subtitle}</p>
          </div>
        </div>
        {badge ? (
          <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-400 md:inline-flex">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="px-6 pb-6">{children}</div>
    </section>
  );
}

function KpiCard({
  item,
}: {
  item: { color: string; label: string; percent: number; sub: string; value: string | number };
}) {
  return (
    <article className="rounded-[14px] border border-[rgba(193,201,207,.25)] bg-white p-4 text-center shadow-[0_8px_24px_rgba(26,32,44,.06)] md:p-5">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-tight text-[#566166]">
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
          style={{
            background: item.color,
            width: `${Math.min(item.percent, 100)}%`,
          }}
        />
      </div>
      <p className="mt-1 flex min-h-[2.5em] items-start justify-center text-center text-[10px] text-[#566166]">
        {item.sub}
      </p>
    </article>
  );
}

function PriorityMatrix({
  cells,
  items,
  minCellSize,
  onOpen,
}: {
  cells: MatrixCell[];
  items: ReviewQueueItem[];
  minCellSize: number;
  onOpen: (item: ReviewQueueItem) => void;
}) {
  return (
    <div className="w-full">
      <div className="mb-2 ml-[86px] grid grid-cols-4 gap-1">
        {[
          ["Laag", "0-24"],
          ["Verhoogd", "25-49"],
          ["Hoog", "50-74"],
          ["Kritiek", "75-100"],
        ].map(([label, range]) => (
          <div
            className="text-center text-[10px] font-extrabold leading-tight text-slate-400"
            key={label}
          >
            {label}
            <span className="mt-0.5 block text-[9px] font-semibold text-slate-300">
              {range}
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2.5">
        <div className="grid grid-rows-4 gap-1">
          {[
            ["Verboden", "80"],
            ["Beperkt", "40"],
            ["Beoordelen", "20"],
            ["Toegestaan", "0"],
          ].map(([label, value]) => (
            <div
              className="flex items-center justify-end pr-2 text-right text-[10px] font-extrabold leading-tight text-slate-400"
              key={label}
            >
              <span>
                {label}
                <br />
                {value}
              </span>
            </div>
          ))}
        </div>
        <div className="grid min-h-[290px] grid-cols-4 grid-rows-4 gap-px overflow-hidden rounded-[18px] border border-[#93afc7] bg-[#8aaabb] shadow-[inset_0_1px_0_rgba(255,255,255,.65)]">
          {[0, 1, 2, 3].flatMap((row) =>
            [0, 1, 2, 3].map((col) => {
              const cellItems = items.filter(
                (item) =>
                  shadowMatrixRow(item.shadowScore) === row &&
                  exposureMatrixCol(item.exposureScore) === col,
              );
              const fallback = findMatrixCell(cells, row, col);
              const label = matrixCellLabel(row, col);

              return (
                <div
                  className={`relative flex min-h-[70px] items-center justify-center p-2 ${matrixCellClass(
                    row,
                    col,
                  )}`}
                  key={`${row}-${col}`}
                >
                  {label}
                  <div className="flex w-full flex-wrap items-center justify-center gap-1.5 pt-2.5">
                    {cellItems.length > 0
                      ? cellItems.map((item) => (
                          <button
                            className="flex items-center justify-center rounded-full border-2 border-white font-mono text-[10px] font-black text-white shadow-[0_10px_22px_rgba(15,23,42,.22)] transition hover:z-10 hover:scale-110"
                            key={item.clusterId}
                            onClick={() => onOpen(item)}
                            style={{
                              background: tierColor(item.tier),
                              height: bubbleSize(item.respondentCount, items),
                              width: bubbleSize(item.respondentCount, items),
                            }}
                            title={`${item.toolName} - ${item.department}: shadow ${item.shadowScore}, exposure ${item.exposureScore}, priority ${formatScore(item.priorityScore)}`}
                            type="button"
                          >
                            {item.respondentCount < minCellSize ? `<${minCellSize}` : item.respondentCount}
                          </button>
                        ))
                      : fallback?.count
                        ? (
                            <span className="grid h-9 w-9 place-items-center rounded-full border border-dashed border-slate-300 bg-white/70 text-[10px] font-extrabold text-slate-400">
                              {fallback.suppressed ? `<${minCellSize}` : fallback.count}
                            </span>
                          )
                        : null}
                  </div>
                </div>
              );
            }),
          )}
        </div>
      </div>
      <div className="ml-[86px] mt-3 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-3 text-[10px] font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#b4292d]" />
            toxic_shadow
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#C06000]" />
            priority_review
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#3e6a00]" />
            standard
          </span>
        </div>
      </div>
    </div>
  );
}

function RiskRadar({ items }: { items: ReviewQueueItem[] }) {
  const riskTypes = buildRiskTypes(items);
  const cx = 190;
  const cy = 170;
  const radius = 118;
  const angleFor = (index: number) => (-90 + (360 / riskTypes.length) * index) * (Math.PI / 180);
  const point = (index: number, value: number) => {
    const angle = angleFor(index);
    const r = radius * Math.max(0, Math.min(value, 100)) / 100;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };
  const polygon = riskTypes.map((item, index) => point(index, item.percent).join(",")).join(" ");

  return (
    <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[420px_1fr]">
      <div className="flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50/60 p-4">
        <svg
          aria-label="Risicoprofiel radar"
          className="w-full max-w-[380px]"
          role="img"
          viewBox="0 0 380 340"
        >
          {[25, 50, 75, 100].map((level) => (
            <polygon
              fill="none"
              key={level}
              points={riskTypes.map((_, index) => point(index, level).join(",")).join(" ")}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          ))}
          {riskTypes.map((item, index) => {
            const [x, y] = point(index, 100);
            const labelAngle = angleFor(index);
            const lx = cx + Math.cos(labelAngle) * (radius + 42);
            const ly = cy + Math.sin(labelAngle) * (radius + 30);
            const anchor = Math.abs(lx - cx) < 10 ? "middle" : lx > cx ? "start" : "end";
            return (
              <g key={item.label}>
                <line stroke="#e2e8f0" strokeWidth="1" x1={cx} x2={x} y1={cy} y2={y} />
                <text
                  fill="#64748b"
                  fontSize="11"
                  fontWeight="800"
                  textAnchor={anchor}
                  x={lx}
                  y={ly}
                >
                  {item.label}
                </text>
                <text
                  fill={item.color}
                  fontSize="10"
                  fontWeight="800"
                  textAnchor={anchor}
                  x={lx}
                  y={ly + 14}
                >
                  {item.percent}%
                </text>
              </g>
            );
          })}
          <polygon fill="rgba(14,90,117,0.18)" points={polygon} stroke="#0E5A75" strokeWidth="3" />
          {riskTypes.map((item, index) => {
            const [x, y] = point(index, item.percent);
            return <circle cx={x} cy={y} fill={item.color} key={item.label} r="5" stroke="#fff" strokeWidth="2" />;
          })}
        </svg>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {riskTypes.map((item) => (
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm" key={item.label}>
            <div className="flex items-center gap-3">
              <RiskTypeIcon icon={item.icon} color={item.color} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-extrabold text-slate-700">{item.full}</p>
                  <p className="font-mono text-[12px] font-extrabold" style={{ color: item.color }}>
                    {item.percent}%
                  </p>
                </div>
                <p className="text-[10px] text-slate-400">
                  {item.count} respondenten in open reviewdruk
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskAmplifiers({ items }: { items: ReviewQueueItem[] }) {
  const total = Math.max(totalRespondents(items), 1);
  const amplifiers = [
    {
      color: "#0369a1",
      count: countRespondents(items, (item) => isSensitiveData(item.dataType)),
      icon: Lock,
      label: "Gevoelige data",
      note: "Bijzondere, klant-, financiele of juridische data",
    },
    {
      color: "#C06000",
      count: countRespondents(items, (item) => isPrivateAccount(item.accountType)),
      icon: UserCog,
      label: "Priveaccount",
      note: "Gebruik buiten zakelijke licentie of SSO",
    },
    {
      color: "#0e7490",
      count: countRespondents(items, (item) => item.triggers.includes("extension_unmanaged")),
      icon: Puzzle,
      label: "Browserextensie",
      note: "AI via extensielaag of onbeheerde browserflow",
    },
    {
      color: "#b45309",
      count: countRespondents(
        items,
        (item) =>
          item.triggers.includes("automation_unmanaged") ||
          item.triggers.includes("agentic_usage"),
      ),
      icon: Bolt,
      label: "Automatisering / autonome AI",
      note: "Workflow, agentic gebruik of verwerking buiten chat",
    },
    {
      color: "#b4292d",
      count: countRespondents(
        items,
        (item) => item.shadowScore >= 40 || item.triggers.includes("prohibited_tool"),
      ),
      icon: Ban,
      label: "Verboden of beperkt",
      note: "Beleidsstatus restricted/prohibited of harde stop",
    },
    {
      color: "#475569",
      count: countRespondents(
        items,
        (item) =>
          item.triggers.includes("hr_evaluation_context") ||
          item.triggers.includes("special_category_data"),
      ),
      icon: Gavel,
      label: "HR / juridische context",
      note: "HR-evaluatie, bijzondere data of juridisch signaal",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {amplifiers.map((item) => {
        const percent = Math.round((item.count / total) * 100);
        return (
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm" key={item.label}>
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${item.color}14` }}
              >
                <RiskTypeIcon icon={item.icon} color={item.color} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-extrabold text-slate-700">{item.label}</p>
                  <p className="font-mono text-[12px] font-extrabold" style={{ color: item.color }}>
                    {item.count}
                  </p>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400">{item.note}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ background: item.color, width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopClusterTable({ items }: { items: ReviewQueueItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-400">
        Geen topclusters beschikbaar.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
        <thead>
          <tr>
            {["#", "Cluster", "n", "Max priority", "Gem.", "Top trigger", "Trend"].map((head) => (
              <th
                className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-[11px] font-extrabold uppercase tracking-[.06em] text-slate-500"
                key={head}
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const trigger = primaryTrigger(item);
            const trend = trendFor(index);
            return (
              <tr className="hover:bg-slate-50/80" key={item.clusterId}>
                <td className="border-b border-slate-100 px-3 py-3 font-extrabold text-slate-700">
                  {index + 1}
                </td>
                <td className="border-b border-slate-100 px-3 py-3">
                  <span className="font-bold text-slate-900">
                    {shortDepartment(item.department)} × {item.toolName}
                  </span>
                  <br />
                  <span className="text-xs text-slate-500">
                    {dataLabel(item.dataType)} + {accountLabel(item.accountType).toLowerCase()}
                  </span>
                </td>
                <td className="border-b border-slate-100 px-3 py-3 text-sm font-semibold text-slate-700">
                  {item.respondentCount}
                </td>
                <td className="border-b border-slate-100 px-3 py-3">
                  <TriggerTag label={formatScore(item.priorityScore)} tone={item.priorityScore >= 75 ? "hard" : "warn"} />
                </td>
                <td className="border-b border-slate-100 px-3 py-3 text-sm font-semibold text-slate-700">
                  {formatScore((item.priorityScore + item.exposureScore) / 2)}
                </td>
                <td className="border-b border-slate-100 px-3 py-3">
                  {trigger === "none" ? (
                    <span className="text-[10px] text-slate-300">-</span>
                  ) : (
                    <TriggerTag code={trigger} />
                  )}
                </td>
                <td className={`border-b border-slate-100 px-3 py-3 text-sm font-bold ${trend.className}`}>
                  {trend.label}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ClusterExplanation({
  explanation,
  topItem,
}: {
  explanation: { color: string; label: string; percent: number }[];
  topItem?: ReviewQueueItem;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="mb-4 font-headline font-extrabold text-slate-900">Clusterduiding</h3>
      <div className="space-y-4">
        {explanation.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-xs font-bold text-slate-600">
              <span>{item.label}</span>
              <span>{item.percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full"
                style={{ background: item.color, width: `${item.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
          Aanbevolen interventie
        </p>
        <p className="mt-2 text-sm text-slate-700">
          {topItem
            ? `Start met ${shortDepartment(topItem.department)} × ${topItem.toolName}: hoge n, hoge priority en directe relatie met ${dataLabel(topItem.dataType).toLowerCase()}. Combineer beleidsbesluit met training en zakelijke alternatieven.`
            : "Zodra risicoclusters beschikbaar zijn, verschijnt hier de eerste interventie."}
        </p>
      </div>
    </div>
  );
}

function TriageRow({
  item,
  onOpen,
}: {
  item: ReviewQueueItem;
  onOpen: (item: ReviewQueueItem) => void;
}) {
  const trigger = primaryTrigger(item);
  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-slate-50/70"
      onClick={() => onOpen(item)}
    >
      <td className="px-6 py-4">
        <p className="text-sm font-extrabold text-slate-700">
          {shortDepartment(item.department)}
        </p>
        <p className="mt-1 font-mono text-[10px] font-extrabold lowercase tracking-normal text-slate-600">
          {item.clusterId.slice(0, 8).toLowerCase()}
        </p>
      </td>
      <td className="px-4 py-4 text-sm text-slate-600">{item.toolName}</td>
      <td className="px-4 py-4">
        <AccountBadge accountType={item.accountType} />
      </td>
      <td className="px-4 py-4 text-xs font-semibold text-slate-500">
        {dataLabel(item.dataType)}
      </td>
      <td className="px-4 py-4">
        <TierBadge tier={item.tier} />
      </td>
      <td className="px-4 py-4">
        {trigger === "none" ? (
          <span className="text-[10px] text-slate-300">-</span>
        ) : (
          <TriggerTag code={trigger} />
        )}
      </td>
      <td className="px-6 py-4 text-center">
        <button
          aria-label="Open details"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-[#0E5A75]"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(item);
          }}
          title="Open details"
          type="button"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function RiskDrawer({
  item,
  onClose,
}: {
  item: ReviewQueueItem | null;
  onClose: () => void;
}) {
  const open = Boolean(item);
  return (
    <>
      <button
        aria-label="Sluit risicodetail"
        className={`fixed inset-0 z-[90] bg-slate-900/25 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label="Risico cluster detail"
        className={`fixed right-0 top-0 z-[100] flex h-screen w-[min(540px,94vw)] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-[-8px_0_48px_rgba(15,23,42,.16)] transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {item ? (
          <>
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  DPO reviewcase
                </p>
                <h3 className="mt-0.5 font-headline text-lg font-extrabold text-slate-800">
                  {item.toolName} - {shortDepartment(item.department)}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {item.clusterId.slice(0, 8).toLowerCase()} / cluster / {formatCode(item.useCase)}
                </p>
              </div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                onClick={onClose}
                type="button"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-6 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div>
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Triage tier
                  </p>
                  <TierBadge tier={item.tier} />
                </div>
                <Radar className="h-7 w-7 text-slate-300" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <DrawerScore color="#C06000" label="Shadow score" value={item.shadowScore} />
                <DrawerScore color="#D13F3F" label="Exposure score" value={item.exposureScore} />
                <DrawerScore color={tierColor(item.tier)} label="Priority score" value={item.priorityScore} />
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Priority formule
                </p>
                <p className="text-[12px] font-semibold text-slate-700">
                  {priorityFormula(item)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Cluster-ID", item.clusterId.slice(0, 8).toLowerCase()],
                  ["Vakgebied", item.department],
                  ["Tool", item.toolName],
                  ["Use case", formatCode(item.useCase)],
                  ["Context", formatCode(item.context)],
                  ["Accounttype", accountLabel(item.accountType)],
                  ["Datatype", dataLabel(item.dataType)],
                  ["Respondenten in cluster", item.respondentCount],
                ].map(([label, value]) => (
                  <div className="rounded-xl border border-slate-100 bg-white p-3" key={String(label)}>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-700">{value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Review triggers
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.triggers.length > 0 ? (
                    item.triggers.map((trigger) => <TriggerTag code={trigger} key={trigger} />)
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">
                      Geen triggercodes
                    </span>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Duiding
                </p>
                <p className="text-xs leading-relaxed text-slate-700">
                  {riskNarrative(item)}
                </p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                <p className="text-[10px] leading-relaxed text-amber-700">
                  <strong>Let op:</strong> Dit is een prioriteringssignaal.
                  Controleer beleid, context en datatype voordat je een formele
                  governance-beslissing neemt.
                </p>
              </div>
            </div>
            <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                className="flex-1 rounded-xl bg-slate-900 py-2.5 text-[12px] font-bold text-white hover:bg-slate-800"
                type="button"
              >
                Review openen
              </button>
              <button
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                type="button"
              >
                Export
              </button>
            </div>
          </>
        ) : null}
      </aside>
    </>
  );
}

function FilterHeader({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <th className="px-4 py-3 first:px-6">
      <select
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="all">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </th>
  );
}

function QuickChip({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
        active
          ? "border-slate-800 bg-slate-800 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function TriggerTag({
  code,
  label,
  tone,
}: {
  code?: string;
  label?: string;
  tone?: "hard" | "info" | "warn";
}) {
  const meta = code ? TRIGGER_META[code] : undefined;
  const Icon = meta?.icon;
  const resolvedTone = tone ?? meta?.className ?? "info";
  const className = {
    hard: "bg-[#fdecea] text-[#b4292d]",
    info: "bg-[#eff6ff] text-[#1d4ed8]",
    warn: "bg-[#fff7ed] text-[#b45309]",
  }[resolvedTone as "hard" | "info" | "warn"];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[5px] px-2 py-1 font-mono text-[9px] font-extrabold tracking-[.02em] ${className}`}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {label ?? meta?.label ?? (code ? formatCode(code) : "")}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const normalized = normalizeBand(tier);
  const label =
    normalized === "critical"
      ? "Toxic Shadow"
      : normalized === "high" || normalized === "elevated"
        ? "Review nodig"
        : "Standaard";
  const className =
    normalized === "critical"
      ? "bg-[#fdecea] text-[#b4292d]"
      : normalized === "high" || normalized === "elevated"
        ? "bg-[#FDE8C4] text-[#C06000]"
        : "bg-[#E8F5E0] text-[#3e6a00]";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold ${className}`}>
      {label}
    </span>
  );
}

function AccountBadge({ accountType }: { accountType: string }) {
  const styles: Record<string, string> = {
    beide: "bg-violet-50 text-violet-700",
    both: "bg-violet-50 text-violet-700",
    business_license: "bg-green-50 text-[#3e6a00]",
    personal_free: "bg-orange-50 text-[#C06000]",
    personal_paid: "bg-red-50 text-[#b4292d]",
    prive_betaald: "bg-red-50 text-[#b4292d]",
    prive_gratis: "bg-orange-50 text-[#C06000]",
    zakelijke_licentie: "bg-green-50 text-[#3e6a00]",
  };

  return (
    <span className={`rounded px-2 py-1 text-[11px] font-extrabold ${styles[accountType] ?? "bg-slate-100 text-slate-600"}`}>
      {accountLabel(accountType)}
    </span>
  );
}

function RiskTypeIcon({ color, icon: Icon }: { color: string; icon: LucideIcon }) {
  return <Icon className="h-[18px] w-[18px]" style={{ color }} />;
}

function DrawerScore({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
        <span className="font-mono text-[11px] font-extrabold">{formatScore(value)}</span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full"
          style={{ background: color, width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

function buildKpis(items: ReviewQueueItem[], summary: RiskSummary) {
  const total = Math.max(summary.runs.length, totalRespondents(items), 1);
  const reviews = summary.runs.length > 0 ? summary.dpoRequiredRuns : countRespondents(items, isOpenReview);
  const toxic =
    summary.runs.length > 0
      ? summary.runs.filter(
          (run) =>
            run.review_class === "toxic_shadow" ||
            run.score_tier === "critical",
        ).length
      : countRespondents(
          items,
          (item) => item.shadowScore > 50 && item.exposureScore > 50,
        );
  const combiRisks = items.filter(
    (item) => item.respondentCount >= summary.minCellSize && isOpenReview(item),
  ).length;
  const hard =
    summary.runs.length > 0
      ? summary.runs.filter((run) =>
          (run.review_trigger_codes ?? []).some((trigger) => HARD_TRIGGERS.has(trigger)),
        ).length
      : countRespondents(items, isHardReview);
  const dataHigh = Math.min(
    total,
    countRespondents(items, (item) => isSensitiveData(item.dataType)),
  );

  return [
    {
      color: "#b4292d",
      label: "DPO reviews",
      percent: percentOf(reviews, total),
      sub: `van ${total} respondenten`,
      value: reviews,
    },
    {
      color: "#b4292d",
      label: "Toxic shadow",
      percent: percentOf(toxic, total),
      sub: "shadow >50 en exposure >50",
      value: toxic,
    },
    {
      color: "#C06000",
      label: "Combi-risico's",
      percent: Math.min(combiRisks * 20, 100),
      sub: "afdeling × tool boven drempel",
      value: combiRisks,
    },
    {
      color: "#0E5A75",
      label: "Hard triggers",
      percent: percentOf(hard, total),
      sub: "juridisch of technisch hard signaal",
      value: hard,
    },
    {
      color: "#0369a1",
      label: "Gevoelige data",
      percent: percentOf(dataHigh, total),
      sub: "hoogste data_boost in run",
      value: `${percentOf(dataHigh, total)}%`,
    },
  ];
}

function buildClusterItems(summary: RiskSummary) {
  const source = summary.clusterItems.length > 0 ? summary.clusterItems : summary.reviewQueue;
  const groups = new Map<string, ReviewQueueItem>();

  for (const item of source) {
    const key = `${item.department}-${item.toolName}`;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, { ...item });
      continue;
    }

    const dominant = item.priorityScore > current.priorityScore ? item : current;
    groups.set(key, {
      ...dominant,
      clusterId: current.clusterId,
      exposureScore: Math.max(current.exposureScore, item.exposureScore),
      priorityScore: Math.max(current.priorityScore, item.priorityScore),
      respondentCount: current.respondentCount + item.respondentCount,
      shadowScore: Math.max(current.shadowScore, item.shadowScore),
      tier: strongestTier(current.tier, item.tier),
      triggers: Array.from(new Set([...current.triggers, ...item.triggers])),
    });
  }

  return Array.from(groups.values()).sort((a, b) => b.priorityScore - a.priorityScore);
}

function filterRows(items: ReviewQueueItem[], quick: QuickFilter, filters: SelectFilters) {
  let rows = [...items];
  if (quick === "high") {
    rows = rows.filter(
      (item) =>
        normalizeBand(item.tier) === "critical" ||
        item.priorityScore >= 50 ||
        isHardReview(item),
    );
  }
  if (quick === "priority_review") rows = rows.filter((item) => normalizeBand(item.tier) !== "low");
  if (quick === "toxic_combo") {
    rows = rows.filter((item) => item.shadowScore > 50 && item.exposureScore > 50);
  }
  if (quick === "private_account") rows = rows.filter((item) => isPrivateAccount(item.accountType));
  if (filters.department !== "all") rows = rows.filter((item) => item.department === filters.department);
  if (filters.tool !== "all") rows = rows.filter((item) => item.toolName === filters.tool);
  if (filters.account !== "all") rows = rows.filter((item) => item.accountType === filters.account);
  if (filters.data !== "all") rows = rows.filter((item) => dataLabel(item.dataType) === filters.data);
  if (filters.tier !== "all") rows = rows.filter((item) => normalizeBand(item.tier) === filters.tier);
  if (filters.trigger !== "all") rows = rows.filter((item) => item.triggers.includes(filters.trigger));

  return rows.sort(
    (a, b) => b.priorityScore - a.priorityScore || b.respondentCount - a.respondentCount,
  );
}

function buildFilterOptions(items: ReviewQueueItem[]) {
  return {
    accounts: uniqueOptions(items.map((item) => item.accountType), accountLabel),
    dataTypes: uniqueOptions(items.map((item) => dataLabel(item.dataType))),
    departments: uniqueOptions(items.map((item) => item.department), shortDepartment),
    tiers: uniqueOptions(
      SCORE_BANDS.filter((band) => items.some((item) => normalizeBand(item.tier) === band)),
      bandLabel,
    ),
    tools: uniqueOptions(items.map((item) => item.toolName)),
    triggers: uniqueOptions(
      items.flatMap((item) => item.triggers),
      (value) => TRIGGER_META[value]?.label ?? formatCode(value),
    ),
  };
}

function uniqueOptions(values: string[], labeler: (value: string) => string = (value) => value) {
  return Array.from(new Set(values.filter(Boolean)))
    .sort((a, b) => labeler(a).localeCompare(labeler(b), "nl"))
    .map((value) => ({ label: labeler(value), value }));
}

function buildRiskTypes(items: ReviewQueueItem[]) {
  const total = Math.max(totalRespondents(items), 1);
  const types = [
    {
      color: "#b4292d",
      count: countRespondents(items, (item) => item.triggers.includes("prohibited_tool") || item.shadowScore >= 80),
      full: "Verboden tool",
      icon: Ban,
      label: "Verboden",
    },
    {
      color: "#0369a1",
      count: countRespondents(items, (item) => item.triggers.includes("special_category_data") || isSensitiveData(item.dataType)),
      full: "Gevoelige data",
      icon: Lock,
      label: "Data",
    },
    {
      color: "#475569",
      count: countRespondents(items, (item) => item.triggers.includes("hr_evaluation_context") || item.context.includes("juridisch")),
      full: "HR / juridische context",
      icon: Gavel,
      label: "Juridisch",
    },
    {
      color: "#be123c",
      count: countRespondents(items, (item) => item.triggers.includes("agentic_usage")),
      full: "Autonome AI",
      icon: Bot,
      label: "Autonoom",
    },
    {
      color: "#0e7490",
      count: countRespondents(items, (item) => item.triggers.includes("extension_unmanaged")),
      full: "Browserextensie",
      icon: Puzzle,
      label: "Extensie",
    },
    {
      color: "#C06000",
      count: countRespondents(items, (item) => isPrivateAccount(item.accountType)),
      full: "Priveaccount",
      icon: UserCog,
      label: "Prive",
    },
  ];

  return types.map((item) => ({
    ...item,
    percent: Math.round((item.count / total) * 100),
  }));
}

function buildClusterExplanation(items: ReviewQueueItem[]) {
  const total = Math.max(totalRespondents(items), 1);
  const toxic = Math.round(
    (countRespondents(items, (item) => normalizeBand(item.tier) === "critical") / total) * 100,
  );
  const exposurePolicy = Math.round(
    (countRespondents(items, (item) => item.exposureScore >= 50 && item.shadowScore <= 40) /
      total) *
      100,
  );
  return [
    { color: "#dc2626", label: "Shadow hoog + exposure hoog", percent: toxic },
    { color: "#f59e0b", label: "Exposure hoog, beleid laag", percent: exposurePolicy },
    {
      color: "#0ea5e9",
      label: "Awareness gap",
      percent: Math.max(0, 100 - toxic - exposurePolicy),
    },
  ];
}

function countRespondents(items: ReviewQueueItem[], predicate: (item: ReviewQueueItem) => boolean) {
  return items.filter(predicate).reduce((sum, item) => sum + item.respondentCount, 0);
}

function totalRespondents(items: ReviewQueueItem[]) {
  return items.reduce((sum, item) => sum + item.respondentCount, 0);
}

function percentOf(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function strongestTier(left: string, right: string) {
  const order: ScoreBand[] = ["low", "elevated", "high", "critical"];
  const leftBand = normalizeBand(left);
  const rightBand = normalizeBand(right);
  return order.indexOf(rightBand) > order.indexOf(leftBand) ? rightBand : leftBand;
}

function isOpenReview(item: ReviewQueueItem) {
  return normalizeBand(item.tier) !== "low" || isHardReview(item) || item.triggers.includes("dpo_attention_note");
}

function isHardReview(item: ReviewQueueItem) {
  return item.triggers.some((trigger) => HARD_TRIGGERS.has(trigger));
}

function isPrivateAccount(accountType: string) {
  return ["beide", "both", "personal_free", "personal_paid", "prive_betaald", "prive_gratis"].includes(accountType);
}

function isSensitiveData(dataType: string) {
  return [
    "bijzondere_persoonsgegevens",
    "financiele_data",
    "gevoelige_persoonsgegevens",
    "gevoelig_persoonsgegeven",
    "juridische_documenten",
    "klantdata",
    "klantgegevens",
  ].includes(dataType);
}

function dataLabel(value: string) {
  if (isSensitiveData(value)) return "Gevoelig";
  if (
    [
      "broncode_logica",
      "excel_sheets",
      "interne_documenten",
      "interne_email",
      "interne_emails",
      "notulen",
    ].includes(value)
  ) {
    return "Intern";
  }
  if (value === "publiek" || value === "publieke_informatie") return "Publiek";
  return value ? formatCode(value) : "Onbekend";
}

function accountLabel(code: string) {
  return (
    {
      beide: "Gemengd",
      both: "Gemengd",
      business_license: "Zakelijke licentie",
      personal_free: "Prive gratis",
      personal_paid: "Prive betaald",
      prive_betaald: "Prive betaald",
      prive_gratis: "Prive gratis",
      zakelijke_licentie: "Zakelijke licentie",
    }[code] ?? formatCode(code)
  );
}

function shortDepartment(department: string) {
  return department
    .replace(" & Recruitment", "")
    .replace(" & Communicatie", "")
    .replace(" & Development", "")
    .replace(" & Support", "");
}

function primaryTrigger(item: ReviewQueueItem) {
  const order = [
    "prohibited_tool",
    "special_category_data",
    "hr_evaluation_context",
    "agentic_usage",
    "automation_unmanaged",
    "extension_unmanaged",
    "priority_threshold",
    "dpo_attention_note",
  ];
  return order.find((trigger) => item.triggers.includes(trigger)) ?? item.triggers[0] ?? "none";
}

function trendFor(index: number) {
  const trends = [
    { className: "text-red-700", label: "+8pp" },
    { className: "text-amber-700", label: "stabiel" },
    { className: "text-green-700", label: "-3pp" },
    { className: "text-red-700", label: "+5pp" },
    { className: "text-green-700", label: "-6pp" },
  ];
  return trends[index] ?? { className: "text-amber-700", label: "stabiel" };
}

function priorityFormula(item: ReviewQueueItem) {
  const toxicBoost = item.shadowScore > 50 && item.exposureScore > 50 ? 20 : 0;
  const priority = 0.45 * item.shadowScore + 0.45 * item.exposureScore + toxicBoost;
  return `0.45*${formatScore(item.shadowScore)} + 0.45*${formatScore(item.exposureScore)}${
    toxicBoost ? " + toxic_boost(+20)" : ""
  } = ${formatScore(priority)}${item.priorityScore >= 100 ? " -> capped at 100" : ""}`;
}

function riskNarrative(item: ReviewQueueItem) {
  const notes: string[] = [];
  if (item.shadowScore >= 80) notes.push("beleidsstatus is prohibited");
  else if (item.shadowScore >= 40) notes.push("beleidsstatus is beperkt");
  else if (item.shadowScore > 0) notes.push("tool is nog niet volledig geborgd");
  if (item.exposureScore >= 75) notes.push("exposure is kritiek");
  else if (item.exposureScore >= 50) notes.push("exposure is hoog");
  if (isSensitiveData(item.dataType)) notes.push("gevoelige data betrokken");
  if (isPrivateAccount(item.accountType)) notes.push("niet-volledig zakelijk accountgebruik");
  if (item.triggers.includes("agentic_usage")) notes.push("agentic of workflow-gebruik aanwezig");
  if (item.triggers.includes("automation_unmanaged")) notes.push("automatisering mogelijk onbeheerd");
  if (item.triggers.includes("extension_unmanaged")) notes.push("browserextensie mogelijk onbeheerd");
  if (item.triggers.includes("hr_evaluation_context")) notes.push("HR-evaluatiecontext vraagt extra voorzichtigheid");

  if (notes.length === 0) {
    return "Geen dominante risicoversterker zichtbaar. Gebruik score-opbouw en context om te bepalen of monitoring volstaat.";
  }

  return `Dit cluster vraagt review omdat ${notes.slice(0, 4).join(", ")}. Bekijk Governance voor maatregelen, eigenaar en opvolging.`;
}

function shadowMatrixRow(score: number) {
  if (score >= 80) return 0;
  if (score >= 40) return 1;
  if (score >= 20) return 2;
  return 3;
}

function exposureMatrixCol(score: number) {
  if (score >= 75) return 3;
  if (score >= 50) return 2;
  if (score >= 25) return 1;
  return 0;
}

function findMatrixCell(cells: MatrixCell[], row: number, col: number) {
  return cells.find(
    (cell) => shadowMatrixRow(bandMidpoint(cell.shadowBand)) === row && exposureMatrixCol(bandMidpoint(cell.exposureBand)) === col,
  );
}

function bandMidpoint(band: ScoreBand) {
  return {
    critical: 80,
    elevated: 30,
    high: 60,
    low: 10,
  }[band];
}

function matrixCellClass(row: number, col: number) {
  if (row <= 1 && col >= 2) return "bg-[#fff1f1]";
  if (row === 3 && col >= 2) return "bg-[#edf8fd]";
  if (row === 2 && col >= 2) return "bg-[#edf8fd]";
  if (row <= 1 && col <= 1) return "bg-[#fffbed]";
  return "bg-[#f7fbf5]";
}

function matrixCellLabel(row: number, col: number) {
  const base =
    "pointer-events-none absolute text-[10px] font-black uppercase leading-none tracking-[.04em] opacity-75";
  if (row === 0 && col === 0) {
    return <span className={`${base} left-[18px] top-4 text-[#C06000]`}>Discovery</span>;
  }
  if (row === 0 && col === 3) {
    return <span className={`${base} right-[18px] top-4 text-right text-[#b4292d]`}>Interventie</span>;
  }
  if (row === 3 && col === 0) {
    return <span className={`${base} bottom-4 left-[18px] text-[#3e6a00]`}>Geborgd</span>;
  }
  if (row === 3 && col === 3) {
    return <span className={`${base} bottom-4 right-[18px] text-right text-[#0369a1]`}>Training</span>;
  }
  return null;
}

function bubbleSize(count: number, items: ReviewQueueItem[]) {
  const counts = items.map((item) => item.respondentCount);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return 42;
  const normalized = (count - min) / (max - min);
  return Math.round(24 + normalized * 42);
}

function tierColor(tier: string) {
  const normalized = normalizeBand(tier);
  if (normalized === "critical") return "#b4292d";
  if (normalized === "high" || normalized === "elevated") return "#C06000";
  return "#3e6a00";
}

function formatScore(value: number) {
  return Number(value).toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
}

function normalizeBand(value: string): ScoreBand {
  return SCORE_BANDS.includes(value as ScoreBand) ? (value as ScoreBand) : "low";
}

function bandLabel(band: string) {
  return {
    critical: "Kritiek",
    elevated: "Verhoogd",
    high: "Hoog",
    low: "Laag",
  }[normalizeBand(band)];
}

function formatCode(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
