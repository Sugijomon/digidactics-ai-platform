"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Ban,
  FilterX,
  GitBranch,
  Grid2X2,
  Info,
  Search,
  ShieldAlert,
  TriangleAlert,
  X,
} from "lucide-react";
import { ToolLogo } from "@/components/tool-logo";
import { toolOptions, type ToolOption } from "@/lib/sai-survey/options";
import type { ToolInventoryRow } from "../_lib/dashboard-data";

type InventoryMetrics = {
  privateAccountRate: number;
  reviewTools: number;
  totalUses: number;
  uniqueTools: number;
};

type PolicyStatus = "" | "Approved" | "Restricted" | "Under Review" | "Prohibited";
type DpoPolicy = "approved" | "prohibited" | "review" | "shadow";
type ToolSortMode = "euai" | "gebruik" | "risico";
type UseCaseSortMode = "gebruik" | "risico" | "shadow";
type FlowView = "accounts" | "full" | "uses";

type InventoryDisplayRow = {
  accountBusiness: number;
  accountMixed: number;
  accountOwn: number;
  category: string;
  euai: boolean;
  fields: string[];
  matrixId: string;
  name: string;
  policyStatus: PolicyStatus;
  source: "reference-demo" | "supabase";
  status: "Core" | "Deprecated" | "Observed";
  sub: string;
  tool: ToolOption;
  useCases: string[];
  useCaseCounts: Record<string, number>;
  users: number;
  vendor: string;
};

type MatrixTool = {
  eigenPct: number;
  euai: boolean;
  gebruikers: number;
  id: string;
  name: string;
  policy: DpoPolicy;
  sub: string;
  useCaseCounts: Record<string, number>;
};

type MatrixUseCase = {
  euai: boolean;
  gebruikers: number;
  id: string;
  impactfactor: number;
  label: string;
  risk: "hoog" | "laag" | "midden";
  shadowHits?: number;
};

type MatrixCell = {
  a: boolean;
  f: "annex" | "art5" | null;
  gebruikers?: number;
};

const STATUS_OPTIONS: { label: string; value: PolicyStatus }[] = [
  { label: "Nieuw", value: "" },
  { label: "Toegestaan", value: "Approved" },
  { label: "Beperkt", value: "Restricted" },
  { label: "Beoordeling", value: "Under Review" },
  { label: "Verboden", value: "Prohibited" },
];

const FIELD_OPTIONS = [
  "IT, Data & Development",
  "Marketing & Communicatie",
  "HR & Recruitment",
  "Finance & Legal",
  "Sales & Accountmanagement",
  "Operations & Support",
  "Directie & Management",
  "Anders",
];

const POLICY_COLORS: Record<PolicyStatus | "new", { bg: string; border: string; color: string }> = {
  "": { bg: "#f8fafc", border: "#e2e8f0", color: "#64748b" },
  Approved: { bg: "#E6F4CF", border: "#cce7a0", color: "#5A8F19" },
  Prohibited: { bg: "#FCEBEB", border: "#f3b8b8", color: "#D13F3F" },
  Restricted: { bg: "#FFF1CC", border: "#f0d38a", color: "#D08212" },
  "Under Review": { bg: "#EDF3F8", border: "#cad7e4", color: "#59728A" },
  new: { bg: "#f8fafc", border: "#e2e8f0", color: "#64748b" },
};

const DPO_POLICY_LABEL: Record<DpoPolicy, string> = {
  approved: "Toegestaan",
  prohibited: "Verboden",
  review: "Beoordeling",
  shadow: "Shadow AI",
};

const DPO_POLICY_COLOR: Record<DpoPolicy, string> = {
  approved: "#4D7800",
  prohibited: "#8E1B1B",
  review: "#C77700",
  shadow: "#9f403d",
};

const DPO_POLICY_BG: Record<DpoPolicy, string> = {
  approved: "#E6F4CF",
  prohibited: "#FCEBEB",
  review: "#FFF1CC",
  shadow: "#FEF2F2",
};

const DPO_POLICY_WEIGHT: Record<DpoPolicy, number> = {
  approved: 0,
  prohibited: 3,
  review: 1,
  shadow: 2,
};

const DPO_MATRIX_MAX_TOOLS = 8;
const DPO_MATRIX_MAX_UC = 9;

const REFERENCE_ROWS: InventoryDisplayRow[] = [
  referenceRow("ChatGPT", "OpenAI", "AI-assistent", "Approved", "Core", 46, 72, 18, 10, [
    "IT, Data & Development",
    "HR & Recruitment",
    "Operations & Support",
  ], ["Teksten schrijven", "Samenvatten", "Brainstormen", "Informatie opzoeken"], true, "chatgpt"),
  referenceRow("Claude", "Anthropic", "AI-assistent", "Under Review", "Observed", 29, 44, 38, 18, [
    "IT, Data & Development",
    "Finance & Legal",
  ], ["Teksten schrijven", "Samenvatten", "Informatie opzoeken"], false, "claude"),
  referenceRow("Midjourney", "Independent", "Beeldgeneratie", "Prohibited", "Observed", 8, 9, 67, 24, [
    "Marketing & Communicatie",
    "Anders",
  ], ["Afbeeldingen genereren", "Brainstormen"], false, "midj"),
  referenceRow("Jasper", "Jasper AI", "Marketing", "Approved", "Core", 17, 58, 24, 18, [
    "Marketing & Communicatie",
    "Sales & Accountmanagement",
  ], ["Teksten schrijven", "Afbeeldingen genereren"], false, "jasper"),
  referenceRow("Notion AI", "Notion Labs", "Productiviteit", "Restricted", "Observed", 31, 22, 51, 27, [
    "Operations & Support",
    "Directie & Management",
    "IT, Data & Development",
  ], ["Samenvatten", "Automatisering", "Notuleren"], false, "notion"),
  referenceRow("GitHub Copilot", "Microsoft", "Coding", "Approved", "Core", 53, 81, 11, 8, [
    "IT, Data & Development",
  ], ["Code schrijven"], false, "copilot"),
  referenceRow("DeepL Write", "DeepL SE", "Vertaling", "Under Review", "Observed", 11, 16, 49, 35, [
    "Finance & Legal",
    "Operations & Support",
  ], ["Vertalen"], false, "deepl"),
  referenceRow("Stable Diffusion", "Open Source", "Beeldgeneratie", "Restricted", "Deprecated", 6, 12, 54, 34, [
    "Marketing & Communicatie",
    "IT, Data & Development",
  ], ["Afbeeldingen genereren"], false, "stabdif"),
  referenceRow("Make", "Automatisering", "Workflow automation", "Under Review", "Observed", 19, 35, 40, 25, [
    "Operations & Support",
    "IT, Data & Development",
  ], ["Automatisering", "Data analyseren", "Systemen aansturen"], true, "make"),
  referenceRow("Gemini", "Google", "AI-assistent", "Restricted", "Observed", 28, 39, 43, 18, [
    "Marketing & Communicatie",
    "Operations & Support",
  ], ["Samenvatten", "Brainstormen", "Vertalen", "Data analyseren"], false, "gemini"),
];

const DPO_MATRIX_UC: MatrixUseCase[] = [
  { euai: true, gebruikers: 18, id: "klant", impactfactor: 2.0, label: "Klantenservice", risk: "hoog" },
  { euai: true, gebruikers: 12, id: "hr", impactfactor: 2.0, label: "HR & evaluatie", risk: "hoog" },
  { euai: false, gebruikers: 24, id: "auto", impactfactor: 2.0, label: "Automatisering", risk: "hoog" },
  { euai: false, gebruikers: 9, id: "systeem", impactfactor: 2.0, label: "Systemen aansturen", risk: "hoog" },
  { euai: false, gebruikers: 38, id: "data", impactfactor: 1.5, label: "Data analyseren", risk: "midden" },
  { euai: false, gebruikers: 41, id: "code", impactfactor: 1.5, label: "Code schrijven", risk: "midden" },
  { euai: false, gebruikers: 52, id: "samen", impactfactor: 1.5, label: "Samenvatten", risk: "midden" },
  { euai: false, gebruikers: 33, id: "notul", impactfactor: 1.5, label: "Vergaderingen notuleren", risk: "midden" },
  { euai: true, gebruikers: 14, id: "fin", impactfactor: 1.5, label: "Financieel & juridisch", risk: "midden" },
  { euai: false, gebruikers: 48, id: "brainstorm", impactfactor: 1.0, label: "Brainstormen", risk: "laag" },
  { euai: false, gebruikers: 29, id: "vertalen", impactfactor: 1.0, label: "Vertalen", risk: "laag" },
];

const MATRIX_USE_CASE_CODES: Record<string, string[]> = {
  auto: ["automatisering", "workflow_uitvoeren", "taken_automatisch_afhandelen"],
  brainstorm: ["brainstormen"],
  code: ["code_schrijven"],
  data: ["data_analyseren"],
  fin: ["financieel_juridisch"],
  hr: ["hr_evaluatie"],
  klant: ["klantenservice"],
  notul: ["vergaderingen_notuleren"],
  samen: ["samenvatten_redigeren"],
  systeem: ["systemen_aansturen"],
  vertalen: ["vertalen"],
};

export function ToolInventoryClient({
  inventory,
  metrics,
}: {
  inventory: ToolInventoryRow[];
  metrics: InventoryMetrics;
}) {
  const baseRows = useMemo(() => buildDisplayRows(inventory), [inventory]);
  const [rows, setRows] = useState(baseRows);
  const [search, setSearch] = useState("");
  const [policyFilter, setPolicyFilter] = useState<PolicyStatus>("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [usageSort, setUsageSort] = useState<"asc" | "desc">("desc");
  const [accountSort, setAccountSort] = useState<"business" | "mixed" | "none" | "own">("none");
  const [toolSort, setToolSort] = useState<ToolSortMode>("risico");
  const [useCaseSort, setUseCaseSort] = useState<UseCaseSortMode>("risico");
  const [auditMode, setAuditMode] = useState(false);
  const [linkInventory, setLinkInventory] = useState(false);
  const [matrixModal, setMatrixModal] = useState<{
    cell: MatrixCell;
    tool: MatrixTool;
    useCase: MatrixUseCase;
  } | null>(null);
  const [flowView, setFlowView] = useState<FlowView>("uses");
  const [hiddenFlowPolicies, setHiddenFlowPolicies] = useState<Set<PolicyStatus>>(new Set());

  const visibleRows = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const matchesSearch =
        !searchValue ||
        `${row.name} ${row.vendor} ${row.category}`.toLowerCase().includes(searchValue);
      const matchesPolicy = !policyFilter || row.policyStatus === policyFilter;
      const matchesField = !fieldFilter || row.fields.includes(fieldFilter);
      return matchesSearch && matchesPolicy && matchesField;
    });

    return filtered.sort((a, b) => {
      if (accountSort !== "none") {
        const key =
          accountSort === "business"
            ? "accountBusiness"
            : accountSort === "own"
              ? "accountOwn"
              : "accountMixed";
        return b[key] - a[key];
      }

      const diff = a.users - b.users;
      return usageSort === "asc" ? diff : -diff;
    });
  }, [accountSort, fieldFilter, policyFilter, rows, search, usageSort]);

  const kpis = useMemo(() => buildKpis(rows, metrics), [metrics, rows]);
  const matrix = useMemo(
    () => buildMatrix(linkInventory ? visibleRows : rows, toolSort, useCaseSort, auditMode),
    [auditMode, linkInventory, rows, toolSort, useCaseSort, visibleRows],
  );

  function resetFilters() {
    setSearch("");
    setPolicyFilter("");
    setFieldFilter("");
    setUsageSort("desc");
    setAccountSort("none");
  }

  function updateRowPolicy(name: string, policyStatus: PolicyStatus) {
    setRows((currentRows) =>
      currentRows.map((row) => (row.name === name ? { ...row, policyStatus } : row)),
    );
  }

  function cycleAccountSort() {
    setAccountSort((current) =>
      current === "none" ? "business" : current === "business" ? "own" : current === "own" ? "mixed" : "none",
    );
  }

  function toggleFlowPolicy(policy: PolicyStatus) {
    setHiddenFlowPolicies((current) => {
      const next = new Set(current);
      if (next.has(policy)) {
        next.delete(policy);
      } else {
        next.add(policy);
      }
      return next;
    });
  }

  return (
    <section className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-[#2a3439]">
          Tool Inventaris
        </h1>
        <p className="mt-1 text-sm font-medium leading-6 text-[#566166]">
          Bekijk welke AI-tools in gebruik zijn, hoe ze in de catalogus staan en welk beleid ervoor geldt. De analyse is gegroepeerd op tools en clusters; individuele medewerkers worden niet getoond.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.8)] md:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
          <ToolKpi label="Totaal tools" sub="in de inventaris" value={kpis.totalTools} />
          <ToolKpi
            barColor="#C0392B"
            label="Shadow AI Ratio"
            sub="tools niet goedgekeurd"
            value={`${kpis.shadowToolRatio}%`}
          />
          <ToolKpi
            barColor="#D08212"
            label="Shadow AI Ratio"
            sub="gebruikers op niet-goedgekeurde tools"
            value={`${kpis.shadowUserRatio}%`}
          />
          <ToolKpi label="Nieuw ontdekt" sub="5 nieuw deze week · oudste 41 dagen" value={kpis.newTools} />
          <ToolKpi label="Reviews open" sub="wachten op beoordeling" value={kpis.reviewTools} />
        </div>
      </section>

      <DashboardCard
        icon={<Archive className="h-6 w-6 text-sky-500" />}
        subtitle="Filter, beoordeel en beheer de gevonden AI-tools. De tabel toont toolclusters en beleidsstatussen; individuele medewerkers worden niet getoond."
        title="AI-toolregister"
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700"
            onClick={resetFilters}
            type="button"
          >
            <FilterX className="h-4 w-4" />
            Filters wissen
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <div className="border-b border-slate-100 bg-white">
            <div className="grid grid-cols-[30%_7%_14%_18%_31%] items-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <div className="px-4 py-3">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tool naam + leverancier"
                    type="text"
                    value={search}
                  />
                </label>
              </div>
              <div className="px-2 py-3">
                <button
                  className="relative inline-flex w-full items-center justify-center rounded-md border border-slate-200 bg-white py-2 pl-2 pr-8 text-xs font-semibold normal-case tracking-normal text-slate-700 transition-colors hover:bg-slate-50"
                  onClick={() => setUsageSort((current) => (current === "asc" ? "desc" : "asc"))}
                  type="button"
                >
                  Gebruik
                  <span className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 flex-col leading-none text-slate-400">
                    <ArrowUp className={`h-3 w-3 ${usageSort === "asc" ? "text-slate-700" : ""}`} />
                    <ArrowDown className={`-mt-1 h-3 w-3 ${usageSort === "desc" ? "text-slate-700" : ""}`} />
                  </span>
                </button>
              </div>
              <div className="px-2 py-3">
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  onChange={(event) => setPolicyFilter(event.target.value as PolicyStatus)}
                  value={policyFilter}
                >
                  <option value="">Nieuw</option>
                  <option value="Approved">Toegestaan</option>
                  <option value="Restricted">Beperkt</option>
                  <option value="Under Review">Beoordeling</option>
                  <option value="Prohibited">Verboden</option>
                </select>
              </div>
              <div className="px-2 py-3">
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  onChange={(event) => setFieldFilter(event.target.value)}
                  value={fieldFilter}
                >
                  <option value="">Alle vakgebieden</option>
                  {FIELD_OPTIONS.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              </div>
              <div className="px-2 py-3">
                <button
                  className="relative inline-flex h-[38px] w-full items-center justify-start rounded-md border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold normal-case tracking-normal text-slate-700 transition-colors hover:bg-slate-50"
                  onClick={cycleAccountSort}
                  type="button"
                >
                  {accountSort === "none" ? "Account type" : accountSort === "business" ? "Zakelijk" : accountSort === "own" ? "Privé" : "Gemengd"}
                  <span className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 flex-col leading-none text-slate-400">
                    <ArrowUp className="h-3 w-3" />
                    <ArrowDown className="-mt-1 h-3 w-3" />
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto pr-2 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[7%]" />
                <col className="w-[14%]" />
                <col className="w-[18%]" />
                <col className="w-[31%]" />
              </colgroup>
              <tbody className="divide-y divide-slate-50">
                {visibleRows.map((row) => (
                  <ToolRegisterRow key={row.name} onPolicyChange={updateRowPolicy} row={row} />
                ))}
              </tbody>
            </table>
            {visibleRows.length === 0 ? (
              <div className="px-6 py-8 text-sm font-semibold text-slate-500">
                Geen tools binnen deze filtercombinatie.
              </div>
            ) : null}
          </div>
          <div className="border-t border-slate-100 bg-white px-6 py-3" />
        </div>
      </DashboardCard>

      <DashboardCard
        icon={<Grid2X2 className="h-6 w-6 text-sky-500" />}
        subtitle="Analyseer AI-gebruik op risico's en juridische aandachtspunten. De matrix selecteert uit de gehele set aan tools en toepassingen vanuit de Tool Inventaris. Koppelen aan de filters benut automatisch selecties zoals vakgebied en beleidsstatus in de analyse."
        title="DPO-matrix"
      >
        <div className="flex flex-col gap-5">
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-gradient-to-b from-white to-slate-50 p-4">
            {auditMode ? (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">
                Auditmode - potentiële EU AI-signalen
              </div>
            ) : null}
            <div className="mb-3 ml-9 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Tools in scope: {matrix.tools.length}
              </span>
            </div>
            <MatrixTable matrix={matrix} onOpen={setMatrixModal} />
            <MatrixLegend />
            <div className="mt-2 flex justify-end">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Use-cases in scope: {matrix.useCases.length}
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <MatrixControlCard label="Sorteer tools op">
              <MatrixRadio
                checked={toolSort === "risico"}
                label="Hoogste risico"
                onChange={() => setToolSort("risico")}
                sub="Beleidsstatus x gebruik x accounttype"
              />
              <MatrixRadio
                checked={toolSort === "gebruik"}
                label="Meest gebruikt"
                onChange={() => setToolSort("gebruik")}
                sub="Aantal respondenten"
              />
              <MatrixRadio
                checked={toolSort === "euai"}
                label="EU AI-signalen"
                onChange={() => setToolSort("euai")}
                sub="Potentieel boven"
              />
            </MatrixControlCard>
            <MatrixControlCard label="Sorteer doeleinden op">
              <MatrixRadio
                checked={useCaseSort === "risico"}
                label="Hoogste kritikaliteit"
                onChange={() => setUseCaseSort("risico")}
                sub="Impactfactor 2.0x voor 1.5x"
              />
              <MatrixRadio
                checked={useCaseSort === "gebruik"}
                label="Meest gebruikt"
                onChange={() => setUseCaseSort("gebruik")}
                sub="Respondenten per doeleinde"
              />
              <MatrixRadio
                checked={useCaseSort === "shadow"}
                label="Meeste shadow hits"
                onChange={() => setUseCaseSort("shadow")}
                sub="Risicovolle cellen"
              />
            </MatrixControlCard>
            <MatrixControlCard label="Auditmode">
              <MatrixToggle
                checked={auditMode}
                label="EU AI-signalen"
                onChange={setAuditMode}
                sub="Alleen signalen"
              />
              <MatrixToggle
                checked={linkInventory}
                label="Koppel aan filters"
                onChange={setLinkInventory}
                sub="Gebruik zichtbare tools uit Tool Inventaris"
              />
              <button
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                onClick={() => {
                  setToolSort("risico");
                  setUseCaseSort("risico");
                  setAuditMode(false);
                  setLinkInventory(false);
                }}
                type="button"
              >
                <FilterX className="h-3.5 w-3.5" />
                Filters wissen
              </button>
            </MatrixControlCard>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        action={
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
            <Info className="h-3.5 w-3.5 text-amber-500" />
            Op basis van zelfrapportage
          </span>
        }
        icon={<GitBranch className="h-6 w-6 text-sky-500" />}
        subtitle="Risico-indicatie op basis van gerapporteerd gebruikersgedrag. Klik op de filters en status."
        title="Gebruiksstromen"
      >
        <UsageFlows
          flowView={flowView}
          hiddenPolicies={hiddenFlowPolicies}
          onTogglePolicy={toggleFlowPolicy}
          rows={rows}
          setFlowView={setFlowView}
        />
      </DashboardCard>

      <footer className="border-t border-slate-200/60 pt-4">
        <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-slate-400">
          <ShieldAlert className="h-3.5 w-3.5 opacity-70" />
          Review- en juridische signalen zijn indicatief en gebaseerd op zelfrapportage. Menselijk oordeel blijft leidend.
        </p>
      </footer>

      {matrixModal ? (
        <MatrixModal modal={matrixModal} onClose={() => setMatrixModal(null)} />
      ) : null}
    </section>
  );
}

function DashboardCard({
  action,
  children,
  icon,
  subtitle,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  icon: React.ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dbe3ec] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
      <div className="flex flex-col gap-3 px-6 pb-3 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-1 shrink-0">{icon}</span>
          <div className="min-w-0 flex-1">
            <h2 className="font-headline text-xl font-bold text-[#2a3439]">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-[#566166]">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="p-6 pt-3">{children}</div>
    </section>
  );
}

function ToolKpi({
  barColor,
  label,
  sub,
  value,
}: {
  barColor?: string;
  label: string;
  sub: string;
  value: number | string;
}) {
  const numeric = typeof value === "string" && value.endsWith("%") ? Number(value.replace("%", "")) : 0;
  return (
    <div className="rounded-[14px] border border-[rgba(193,201,207,.25)] bg-white p-4 text-center shadow-[0_8px_24px_rgba(26,32,44,.06)] md:p-5">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-tight text-[#566166]">{label}</p>
      <h3
        className="font-headline text-[clamp(1.75rem,2.2vw,2.25rem)] font-extrabold leading-tight tabular-nums text-slate-800"
        style={{ color: barColor ?? undefined }}
      >
        {value}
      </h3>
      {barColor ? (
        <div className="mt-2 h-[5px] w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full" style={{ background: barColor, width: `${numeric}%` }} />
        </div>
      ) : null}
      <p className="mt-1 flex min-h-[2.5em] items-start justify-center text-center text-[10px] text-[#566166]">{sub}</p>
    </div>
  );
}

function ToolRegisterRow({
  onPolicyChange,
  row,
}: {
  onPolicyChange: (name: string, policyStatus: PolicyStatus) => void;
  row: InventoryDisplayRow;
}) {
  const fieldLabel = `${row.fields.length} ${row.fields.length === 1 ? "vakgebied" : "vakgebieden"}`;
  const colors = POLICY_COLORS[row.policyStatus || "new"];

  return (
    <tr className="transition-colors hover:bg-indigo-50/20">
      <td className="py-3 pl-4 pr-3">
        <div className="flex items-center gap-3">
          <ToolLogo sizeClassName="h-10 w-10 rounded-xl" tool={row.tool} />
          <div>
            <p className="text-xs font-bold text-slate-800">{row.name}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {row.vendor} | {row.category}
            </p>
          </div>
        </div>
      </td>
      <td className="px-1 py-3 text-center text-xs font-semibold text-slate-600">{row.users}</td>
      <td className="px-3 py-3">
        <select
          className="w-full max-w-[132px] rounded-md border bg-white px-2 py-2 text-xs font-bold outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          onChange={(event) => onPolicyChange(row.name, event.target.value as PolicyStatus)}
          style={{ borderColor: colors.border, color: colors.color }}
          value={row.policyStatus}
        >
          {STATUS_OPTIONS.map((option) => (
            <option
              key={option.value || "new"}
              style={{ color: POLICY_COLORS[option.value || "new"].color }}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </td>
      <td className="py-3 pl-4 pr-2 text-[13px] font-medium leading-snug text-slate-600">
        {fieldLabel}
      </td>
      <td className="py-3 pl-4 pr-3">
        <div className="ml-auto w-full space-y-1.5">
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" aria-label={`Accountverdeling ${row.name}`}>
            <span className="block h-full float-left bg-[#5A8F19]" style={{ width: `${row.accountBusiness}%` }} />
            <span className="block h-full float-left bg-[#D08212]" style={{ width: `${row.accountOwn}%` }} />
            <span className="block h-full float-left bg-[#8B5CF6]" style={{ width: `${row.accountMixed}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[11px] font-medium leading-tight text-slate-500">
            <span className="inline-flex min-w-0 items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#5A8F19]" />
              Zakelijk {row.accountBusiness}%
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#D08212]" />
              Privé {row.accountOwn}%
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#8B5CF6]" />
              Gemengd {row.accountMixed}%
            </span>
          </div>
        </div>
      </td>
    </tr>
  );
}

function MatrixTable({
  matrix,
  onOpen,
}: {
  matrix: ReturnType<typeof buildMatrix>;
  onOpen: (modal: { cell: MatrixCell; tool: MatrixTool; useCase: MatrixUseCase }) => void;
}) {
  const usageValues = matrix.tools.flatMap((tool) =>
    matrix.useCases.map((useCase) => getMatrixCell(tool, useCase).gebruikers ?? 0),
  );
  const maxUsers = Math.max(...usageValues, 1);

  return (
    <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-[3px] text-left">
      <thead>
        <tr>
          <th className="w-9" />
          {matrix.tools.map((tool) => (
            <th className="pb-3 text-center align-bottom" key={tool.id}>
              <span className="mx-auto block max-w-[88px] truncate text-[11px] font-extrabold leading-tight text-slate-700" title={tool.name}>
                {tool.name}
              </span>
              <span
                className="mx-auto mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide"
                style={{ background: DPO_POLICY_BG[tool.policy], color: DPO_POLICY_COLOR[tool.policy] }}
              >
                {DPO_POLICY_LABEL[tool.policy]}
              </span>
              <span className="mt-1 block text-[9px] font-medium text-slate-400">{tool.gebruikers} gebr.</span>
            </th>
          ))}
          <th className="min-w-[156px]" />
        </tr>
      </thead>
      <tbody>
        {matrix.useCases.map((useCase) => (
          <tr key={useCase.id}>
            <th aria-hidden="true" className="w-9" />
            {matrix.tools.map((tool) => {
              const cell = getMatrixCell(tool, useCase);
              const color = matrixCellColor(tool, useCase, cell.a);
              const size = matrixCellSize(cell.gebruikers ?? 0, maxUsers);

              return (
                <td
                  className="h-[48px] rounded-lg bg-slate-50 text-center align-middle transition-colors hover:bg-white"
                  key={`${tool.id}-${useCase.id}`}
                >
                  <div className="flex h-full items-center justify-center">
                    {cell.a ? (
                      <button
                        aria-label={`${tool.name} x ${useCase.label}`}
                        className="relative inline-flex items-center justify-center rounded-full text-[10px] font-extrabold text-white shadow-sm transition hover:scale-105"
                        onClick={() => onOpen({ cell, tool, useCase })}
                        style={{ background: color ?? "#EF9F27", height: size, width: size }}
                        type="button"
                      >
                        {cell.f ? <MatrixFlag kind={cell.f} /> : null}
                        {size >= 26 ? cell.gebruikers : null}
                      </button>
                    ) : (
                      <span className="inline-flex h-5 w-5 rounded-full border border-dashed border-slate-300 bg-slate-50" />
                    )}
                  </div>
                </td>
              );
            })}
            <th className="py-1 pl-3 text-left align-middle">
              <div className="text-[12px] font-extrabold leading-tight text-slate-700">{useCase.label}</div>
              <span
                className="mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-extrabold"
                style={{
                  background: useCase.risk === "hoog" ? "#FEF2F2" : useCase.risk === "midden" ? "#FFF1CC" : "#F8FAFC",
                  color: useCase.risk === "hoog" ? "#9f403d" : useCase.risk === "midden" ? "#C77700" : "#475569",
                }}
              >
                {useCase.impactfactor}x
              </span>
            </th>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MatrixFlag({ kind }: { kind: "annex" | "art5" }) {
  return (
    <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-white shadow-sm">
      {kind === "art5" ? (
        <Ban className="h-3 w-3 text-[#FF5A6B]" strokeWidth={2.2} />
      ) : (
        <TriangleAlert className="h-3 w-3 fill-[#FF3B30] text-[#FF3B30]" strokeWidth={2.2} />
      )}
    </span>
  );
}

function MatrixLegend() {
  return (
    <div className="mt-4 ml-9 flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-500">
      <LegendDot color="#E24B4A" label="Hoog risico" />
      <LegendDot color="#EF9F27" label="Gemiddeld risico" />
      <LegendDot color="#97C459" label="Geborgd" />
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full border border-dashed border-slate-300 bg-slate-50" />
        Niet van toepassing
      </span>
      <span className="h-3 w-px bg-slate-200" />
      <span className="inline-flex items-center gap-1.5">
        <Ban className="h-3.5 w-3.5 text-[#FF5A6B]" />
        Pot. Art. 5
      </span>
      <span className="inline-flex items-center gap-1.5">
        <TriangleAlert className="h-3.5 w-3.5 fill-[#FF3B30] text-[#FF3B30]" />
        Pot. Annex III
      </span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function MatrixControlCard({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      {children}
    </div>
  );
}

function MatrixRadio({
  checked,
  label,
  onChange,
  sub,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
  sub: string;
}) {
  return (
    <label className="mb-2 flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1 transition hover:bg-white">
      <input
        checked={checked}
        className="mt-0.5 h-5 w-5 accent-slate-500"
        onChange={onChange}
        type="radio"
      />
      <span className="text-xs font-semibold leading-snug text-slate-800">
        {label}
        <span className="mt-0.5 block text-[10px] font-medium text-slate-500">{sub}</span>
      </span>
    </label>
  );
}

function MatrixToggle({
  checked,
  label,
  onChange,
  sub,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  sub: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="text-xs font-semibold leading-tight text-slate-800">
        {label}
        <span className="mt-0.5 block text-[10px] font-medium text-slate-500">{sub}</span>
      </span>
      <button
        aria-pressed={checked}
        className={`relative h-5 w-10 rounded-full transition ${checked ? "bg-[#0E5A75]" : "bg-slate-300"}`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${checked ? "left-5" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

function MatrixModal({
  modal,
  onClose,
}: {
  modal: { cell: MatrixCell; tool: MatrixTool; useCase: MatrixUseCase };
  onClose: () => void;
}) {
  const { cell, tool, useCase } = modal;
  const flagText = cell.f === "art5" ? "Pot. Art. 5" : cell.f === "annex" ? "Pot. Annex III" : "Geen flag";
  const actionText =
    tool.policy === "prohibited"
      ? "Directe escalatie vereist"
      : tool.policy === "shadow"
        ? "Governance-review starten"
        : cell.f
          ? "DPO/juridische duiding nodig"
          : "Monitoren en opvolgen";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-extrabold text-slate-800">
            {tool.name} x {useCase.label}
          </h3>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div>
          <ModalRow label="Beleidsstatus" value={DPO_POLICY_LABEL[tool.policy]} valueColor={DPO_POLICY_COLOR[tool.policy]} />
          <ModalRow label="Impactfactor" value={`${useCase.impactfactor}x`} />
          <ModalRow label="Respondenten in cluster" value={`${cell.gebruikers ?? 0}`} />
          <ModalRow label="Privéaccountgebruik" value={`${tool.eigenPct}%`} />
          <ModalRow label="Potentieel signaal" value={flagText} />
          <ModalRow label="Aanbevolen actie" value={actionText} valueColor="#0E5A75" />
          <ModalRow label="Herleidbaarheid" value="Alleen anonieme clusterweergave" />
        </div>
        <button
          className="mt-3 w-full rounded-lg border border-[#bfe7ff] bg-[#ecf7ff] px-3 py-2 text-xs font-bold text-[#0E5A75] transition hover:bg-[#d9f0ff]"
          onClick={onClose}
          type="button"
        >
          Terug naar matrix
        </button>
      </div>
    </div>
  );
}

function ModalRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-2 text-xs last:border-b-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-bold text-slate-800" style={{ color: valueColor }}>
        {value}
      </span>
    </div>
  );
}

function UsageFlows({
  flowView,
  hiddenPolicies,
  onTogglePolicy,
  rows,
  setFlowView,
}: {
  flowView: FlowView;
  hiddenPolicies: Set<PolicyStatus>;
  onTogglePolicy: (policy: PolicyStatus) => void;
  rows: InventoryDisplayRow[];
  setFlowView: (view: FlowView) => void;
}) {
  const visibleRows = rows.filter((row) => !hiddenPolicies.has(row.policyStatus));
  const sankey = useMemo(() => buildSankeyLayout(visibleRows, flowView), [flowView, visibleRows]);
  const totalUsers = rows.reduce((sum, row) => sum + row.users, 0);
  const shadowUsers = rows
    .filter((row) => row.policyStatus === "Prohibited" || row.policyStatus === "Restricted")
    .reduce((sum, row) => sum + row.users, 0);
  const privatePct =
    totalUsers > 0
      ? Math.round(rows.reduce((sum, row) => sum + row.users * (row.accountOwn / 100), 0) / totalUsers)
      : 0;
  const topTool = [...rows].sort((a, b) => b.users - a.users)[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FlowTab active={flowView === "uses"} onClick={() => setFlowView("uses")}>
            Tools → Toepassingen
          </FlowTab>
          <FlowTab active={flowView === "accounts"} onClick={() => setFlowView("accounts")}>
            Tools → Accounttype
          </FlowTab>
          <FlowTab active={flowView === "full"} onClick={() => setFlowView("full")}>
            Volledig (3 lagen)
          </FlowTab>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            ["Approved", "Toegestaan", "#5A8F19"],
            ["Restricted", "Beperkt", "#D08212"],
            ["Under Review", "In beoordeling", "#59728A"],
            ["Prohibited", "Verboden", "#D13F3F"],
          ].map(([policy, label, color]) => {
            const hidden = hiddenPolicies.has(policy as PolicyStatus);
            return (
              <button
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition"
                key={policy}
                onClick={() => onTogglePolicy(policy as PolicyStatus)}
                style={{
                  background: hidden ? "#f1f5f9" : `${color}14`,
                  borderColor: hidden ? "#e2e8f0" : `${color}30`,
                  color: hidden ? "#94a3b8" : color,
                  opacity: hidden ? 0.65 : 1,
                }}
                type="button"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: hidden ? "#cbd5e1" : color }} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative rounded-2xl border border-slate-100 bg-white px-4 py-5">
        <SankeyDiagram layout={sankey} rows={visibleRows} />
        <div className="hidden">
          <FlowColumn title="Tools">
            {visibleRows.slice(0, 8).map((row) => (
              <FlowNode color={policyColor(row.policyStatus)} key={row.name} label={row.name} sub={`${row.users} gebr.`} />
            ))}
          </FlowColumn>
          <FlowColumn title={flowView === "accounts" ? "Accounttype" : "Toepassingen"}>
            {flowView === "accounts"
              ? ["Zakelijk", "Privé gratis", "Privé betaald", "Gemengd"].map((label) => (
                  <FlowNode color={accountColor(label)} key={label} label={label} />
                ))
              : topUseCases(visibleRows).map(([label, count]) => (
                  <FlowNode color={getUseCaseColor(label)} key={label} label={label} sub={`${count} signalen`} />
                ))}
          </FlowColumn>
          <FlowColumn title={flowView === "full" ? "Accounttype" : "Beleid"}>
            {(flowView === "full"
              ? ["Zakelijk", "Privé gratis", "Privé betaald", "Gemengd"]
              : ["Toegestaan", "Beperkt", "In beoordeling", "Verboden"]
            ).map((label) => (
              <FlowNode
                color={flowView === "full" ? accountColor(label) : statusLabelColor(label)}
                key={label}
                label={label}
              />
            ))}
          </FlowColumn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <FlowKpi color="#0E5A75" label="Totaal gebruikers" sub="geteld over alle tools" value={totalUsers} />
        <FlowKpi
          color="#D13F3F"
          label="Niet-goedgekeurde tools"
          sub={`${Math.round((shadowUsers / Math.max(totalUsers, 1)) * 100)}% van totaal · beperkt + verboden`}
          value={shadowUsers}
        />
        <FlowKpi color="#D08212" label="Privé accountgebruik" sub="privé gratis/betaald of gemengd" value={`${privatePct}%`} />
        <FlowKpi
          color="#5A8F19"
          label="Meest gebruikte tool"
          small
          sub={`${topTool?.users ?? 0} gebruikers · ${topTool?.policyStatus || "Nieuw"}`}
          value={topTool?.name ?? "Geen tool"}
        />
      </div>
    </div>
  );
}

type SankeyNode = {
  color: string;
  id: string;
  label: string;
  layer: number;
  policy?: PolicyStatus;
  users?: number;
};

type SankeyLink = {
  policy: PolicyStatus;
  source: number;
  target: number;
  value: number;
};

type SankeyLayoutNode = SankeyNode & {
  h: number;
  value: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

type SankeyLayoutLink = SankeyLink & {
  sy0: number;
  sy1: number;
  ty0: number;
  ty1: number;
};

function SankeyDiagram({
  layout,
  rows,
}: {
  layout: { links: SankeyLayoutLink[]; nodes: SankeyLayoutNode[] };
  rows: InventoryDisplayRow[];
}) {
  const [tooltip, setTooltip] = useState<{
    left: number;
    text: string;
    top: number;
  } | null>(null);
  const width = 980;
  const height = 460;
  const leftPad = 148;
  const topPad = 20;
  const maxLayer = Math.max(...layout.nodes.map((node) => node.layer), 0);

  if (rows.length === 0 || layout.nodes.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl bg-slate-50 text-sm font-semibold text-slate-500">
        Nog geen gebruiksstromen beschikbaar.
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto pb-1">
      <svg
        className="block min-w-[860px]"
        height={height}
        role="img"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
      >
        <g transform={`translate(${leftPad} ${topPad})`}>
          {layout.links.map((link, index) => {
            const source = layout.nodes[link.source];
            const target = layout.nodes[link.target];
            const controlX = (source.x1 + target.x0) / 2;
            const fill =
              link.policy === "Prohibited"
                ? "#D13F3F"
                : link.policy === "Restricted"
                  ? "#D08212"
                  : source.color;
            const path = `M${source.x1},${link.sy0} C${controlX},${link.sy0} ${controlX},${link.ty0} ${target.x0},${link.ty0} L${target.x0},${link.ty1} C${controlX},${link.ty1} ${controlX},${link.sy1} ${source.x1},${link.sy1} Z`;

            return (
              <path
                className="transition-opacity hover:opacity-50"
                d={path}
                fill={fill}
                key={`${source.id}-${target.id}-${index}`}
                onMouseEnter={() =>
                  setTooltip({
                    left: leftPad + (source.x1 + target.x0) / 2,
                    text: `${source.label} -> ${target.label}: ${link.value} gebruikers`,
                    top: topPad + (link.sy0 + link.ty0) / 2,
                  })
                }
                onMouseLeave={() => setTooltip(null)}
                opacity={0.2}
              />
            );
          })}

          {layout.nodes.map((node) => (
            <g key={node.id}>
              <rect
                fill={node.color}
                height={Math.max(node.h, 6)}
                rx={4}
                width={16}
                x={node.x0}
                y={node.y0}
              />
              {node.layer === 0 ? (
                <>
                  <text
                    fill="#1e293b"
                    fontFamily="Manrope, sans-serif"
                    fontSize={12}
                    fontWeight={700}
                    textAnchor="end"
                    x={node.x0 - 8}
                    y={node.y0 + node.h / 2 + 4}
                  >
                    {truncateSankeyLabel(node.label, 18)}
                  </text>
                  <text
                    fill="#94a3b8"
                    fontFamily="Manrope, sans-serif"
                    fontSize={10}
                    fontWeight={400}
                    textAnchor="end"
                    x={node.x0 - 8}
                    y={node.y0 + node.h / 2 + 16}
                  >
                    {node.users ?? 0} gebr.
                  </text>
                </>
              ) : null}
              {node.layer === maxLayer ? (
                <text
                  fill="#1e293b"
                  fontFamily="Manrope, sans-serif"
                  fontSize={12}
                  fontWeight={700}
                  textAnchor="start"
                  x={node.x1 + 8}
                  y={node.y0 + node.h / 2 + 4}
                >
                  {truncateSankeyLabel(node.label, 23)}
                </text>
              ) : null}
              {node.layer > 0 && node.layer < maxLayer ? (
                <text
                  fill="#64748b"
                  fontFamily="Manrope, sans-serif"
                  fontSize={10}
                  fontWeight={600}
                  textAnchor="middle"
                  x={node.x0 + 8}
                  y={Math.max(10, node.y0 - 5)}
                >
                  {truncateSankeyLabel(node.label, 18)}
                </text>
              ) : null}
            </g>
          ))}
        </g>
      </svg>
      {tooltip ? (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-[10px] bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-50 shadow-lg"
          style={{ left: tooltip.left, top: tooltip.top }}
        >
          {tooltip.text}
        </div>
      ) : null}
    </div>
  );
}

function FlowTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-lg border px-3.5 py-1.5 text-xs font-bold transition ${
        active
          ? "border-[#00658b] bg-[#00658b] text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function FlowColumn({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FlowNode({ color, label, sub }: { color: string; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
      <span className="h-3 w-3 rounded-full" style={{ background: color }} />
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold text-slate-800">{label}</span>
        {sub ? <span className="block text-[10px] text-slate-400">{sub}</span> : null}
      </span>
    </div>
  );
}

function FlowKpi({
  color,
  label,
  small,
  sub,
  value,
}: {
  color: string;
  label: string;
  small?: boolean;
  sub: string;
  value: number | string;
}) {
  return (
    <div className="rounded-[14px] border border-[rgba(193,201,207,.25)] bg-white p-4 text-center shadow-[0_8px_24px_rgba(26,32,44,.06)] md:p-5">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-tight text-[#566166]">{label}</p>
      <h3
        className={`font-headline font-extrabold leading-tight tabular-nums ${small ? "text-xl" : "text-[clamp(1.75rem,2.2vw,2.25rem)]"}`}
        style={{ color }}
      >
        {value}
      </h3>
      <p className="mt-1 flex min-h-10 items-start justify-center text-center text-[10px] text-slate-500">{sub}</p>
    </div>
  );
}

function buildSankeyLayout(rows: InventoryDisplayRow[], view: FlowView) {
  const graph = buildSankeyGraph(rows.slice(0, 10), view);
  return layoutSankey(graph.nodes, graph.links, 668, 420, 12);
}

function buildSankeyGraph(rows: InventoryDisplayRow[], view: FlowView) {
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const nodeIndex = new Map<string, number>();

  function addNode(node: SankeyNode) {
    const existing = nodeIndex.get(node.id);
    if (existing !== undefined) return existing;
    nodeIndex.set(node.id, nodes.length);
    nodes.push(node);
    return nodes.length - 1;
  }

  for (const row of rows) {
    const toolIndex = addNode({
      color: policyColor(row.policyStatus),
      id: `tool:${row.name}`,
      label: row.name,
      layer: 0,
      policy: row.policyStatus,
      users: row.users,
    });

    if (view === "accounts") {
      for (const account of accountParts(row)) {
        const accountIndex = addNode({
          color: accountColor(account.label),
          id: `account:${account.label}`,
          label: account.label,
          layer: 1,
        });
        links.push({
          policy: row.policyStatus,
          source: toolIndex,
          target: accountIndex,
          value: Math.max(1, Math.round(row.users * (account.percentage / 100))),
        });
      }
      continue;
    }

    const useCases = row.useCases.length > 0 ? row.useCases : ["Onbekend"];
    for (const useCase of useCases) {
      const useCaseIndex = addNode({
        color: getUseCaseColor(useCase),
        id: `use:${useCase}`,
        label: useCase,
        layer: 1,
      });
      const useCaseValue = Math.max(1, Math.round(row.users / useCases.length));
      links.push({
        policy: row.policyStatus,
        source: toolIndex,
        target: useCaseIndex,
        value: useCaseValue,
      });

      if (view === "full") {
        for (const account of accountParts(row)) {
          const accountIndex = addNode({
            color: accountColor(account.label),
            id: `account:${account.label}`,
            label: account.label,
            layer: 2,
          });
          links.push({
            policy: row.policyStatus,
            source: useCaseIndex,
            target: accountIndex,
            value: Math.max(1, Math.round(useCaseValue * (account.percentage / 100))),
          });
        }
      }
    }
  }

  return { links, nodes };
}

function layoutSankey(nodes: SankeyNode[], links: SankeyLink[], width: number, height: number, gap: number) {
  const layers = Array.from(new Set(nodes.map((node) => node.layer))).sort((a, b) => a - b);
  const nodeWidth = 16;
  const xStep = layers.length > 1 ? (width - nodeWidth) / (layers.length - 1) : 0;
  const layoutNodes: SankeyLayoutNode[] = nodes.map((node) => ({
    ...node,
    h: 0,
    value: 0,
    x0: node.layer * xStep,
    x1: node.layer * xStep + nodeWidth,
    y0: 0,
    y1: 0,
  }));

  for (const link of links) {
    layoutNodes[link.target].value += link.value;
  }

  for (const layer of layers) {
    const layerNodes = layoutNodes.filter((node) => node.layer === layer);
    if (layer === 0) {
      for (const node of layerNodes) {
        const index = layoutNodes.indexOf(node);
        node.value = links
          .filter((link) => link.source === index)
          .reduce((sum, link) => sum + link.value, 0);
      }
    }

    const total = Math.max(
      1,
      layerNodes.reduce((sum, node) => sum + node.value, 0),
    );
    const available = Math.max(120, height - gap * Math.max(0, layerNodes.length - 1));
    let y = 0;

    for (const node of layerNodes) {
      node.h = Math.max(6, (node.value / total) * available);
      node.y0 = y;
      node.y1 = y + node.h;
      y += node.h + gap;
    }
  }

  const sourceOffset: Record<number, number> = {};
  const targetOffset: Record<number, number> = {};
  const layoutLinks: SankeyLayoutLink[] = links.map((link) => {
    const source = layoutNodes[link.source];
    const target = layoutNodes[link.target];
    sourceOffset[link.source] = sourceOffset[link.source] ?? 0;
    targetOffset[link.target] = targetOffset[link.target] ?? 0;

    const sourceTotal = Math.max(
      1,
      links.filter((item) => item.source === link.source).reduce((sum, item) => sum + item.value, 0),
    );
    const targetTotal = Math.max(
      1,
      links.filter((item) => item.target === link.target).reduce((sum, item) => sum + item.value, 0),
    );
    const sy0 = source.y0 + (sourceOffset[link.source] / sourceTotal) * source.h;
    const sy1 = source.y0 + ((sourceOffset[link.source] + link.value) / sourceTotal) * source.h;
    const ty0 = target.y0 + (targetOffset[link.target] / targetTotal) * target.h;
    const ty1 = target.y0 + ((targetOffset[link.target] + link.value) / targetTotal) * target.h;

    sourceOffset[link.source] += link.value;
    targetOffset[link.target] += link.value;

    return { ...link, sy0, sy1, ty0, ty1 };
  });

  return { links: layoutLinks, nodes: layoutNodes };
}

function accountParts(row: InventoryDisplayRow) {
  const privateFree = Math.round(row.accountOwn * 0.45);
  const privatePaid = Math.max(0, row.accountOwn - privateFree);
  return [
    { label: "Zakelijk", percentage: row.accountBusiness },
    { label: "Privé gratis", percentage: privateFree },
    { label: "Privé betaald", percentage: privatePaid },
    { label: "Gemengd", percentage: row.accountMixed },
  ];
}

function truncateSankeyLabel(label: string, maxLength: number) {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}

function referenceRow(
  name: string,
  vendor: string,
  category: string,
  policyStatus: PolicyStatus,
  status: InventoryDisplayRow["status"],
  users: number,
  accountBusiness: number,
  accountOwn: number,
  accountMixed: number,
  fields: string[],
  useCases: string[],
  euai: boolean,
  matrixId: string,
): InventoryDisplayRow {
  return {
    accountBusiness,
    accountMixed,
    accountOwn,
    category,
    euai,
    fields,
    matrixId,
    name,
    policyStatus,
    source: "reference-demo",
    status,
    sub: `${vendor} | ${category}`,
    tool: getCatalogTool(name),
    useCases,
    useCaseCounts: {},
    users,
    vendor,
  };
}

function buildDisplayRows(inventory: ToolInventoryRow[]): InventoryDisplayRow[] {
  const supabaseRows = inventory.map(fromSupabaseRow);

  return supabaseRows.sort((a, b) => b.users - a.users);
}

function fromSupabaseRow(row: ToolInventoryRow): InventoryDisplayRow {
  const privateUses =
    (row.accountTypes.personal_free ?? 0) +
    (row.accountTypes.prive_gratis ?? 0) +
    (row.accountTypes.personal_paid ?? 0) +
    (row.accountTypes.prive_betaald ?? 0);
  const businessUses =
    (row.accountTypes.business_license ?? 0) + (row.accountTypes.zakelijke_licentie ?? 0);
  const mixedUses = (row.accountTypes.both ?? 0) + (row.accountTypes.beide ?? 0);
  const total = Math.max(privateUses + businessUses + mixedUses, 1);
  const tool = getCatalogTool(row.toolName);
  const reference = REFERENCE_ROWS.find((item) => normalize(item.name) === normalize(row.toolName));

  return {
    accountBusiness: Math.round((businessUses / total) * 100),
    accountMixed: Math.round((mixedUses / total) * 100),
    accountOwn: Math.round((privateUses / total) * 100),
    category: reference?.category ?? tool.category,
    euai: row.euAiFlagCount > 0 || reference?.euai === true,
    fields: reference?.fields ?? inferFieldsFromUseCases(row.useCases),
    matrixId: reference?.matrixId ?? normalize(row.toolName).replace(/[^a-z0-9]+/g, ""),
    name: row.toolName,
    policyStatus: toReferencePolicy(row.policyStatus),
    source: "supabase",
    status: row.policyStatus === "approved" ? "Core" : row.policyStatus === "restricted" ? "Observed" : "Observed",
    sub: reference?.sub ?? `${tool.category} | Catalogus/tool`,
    tool,
    useCases: Object.entries(row.useCases)
      .sort((a, b) => b[1] - a[1])
      .map(([code]) => formatCode(code)),
    useCaseCounts: row.useCases,
    users: Math.max(row.respondentCount, row.totalUses),
    vendor: reference?.vendor ?? tool.category,
  };
}

function buildKpis(rows: InventoryDisplayRow[], metrics: InventoryMetrics) {
  const nonApproved = rows.filter((row) => row.policyStatus !== "Approved").length;
  const shadowUsers = rows
    .filter((row) => row.policyStatus !== "Approved")
    .reduce((sum, row) => sum + row.users, 0);
  const totalUsers = rows.reduce((sum, row) => sum + row.users, 0);
  const reviewTools = rows.filter((row) => row.policyStatus === "Under Review").length;
  const newTools = Math.max(
    0,
    rows.filter((row) => row.policyStatus === "").length,
  );

  return {
    newTools,
    reviewTools: Math.max(reviewTools, metrics.reviewTools),
    shadowToolRatio: rows.length > 0 ? Math.round((nonApproved / rows.length) * 100) : 0,
    shadowUserRatio: totalUsers > 0 ? Math.round((shadowUsers / totalUsers) * 100) : metrics.privateAccountRate,
    totalTools: rows.length,
  };
}

function buildMatrix(
  sourceRows: InventoryDisplayRow[],
  toolSort: ToolSortMode,
  useCaseSort: UseCaseSortMode,
  auditMode: boolean,
) {
  let tools = sourceRows.map((row) => ({
    eigenPct: Math.max(0, Math.min(100, Math.round(row.accountOwn + row.accountMixed * 0.6))),
    euai: row.euai,
    gebruikers: row.users,
    id: row.matrixId,
    name: row.name,
    policy: normalizeDpoPolicy(row.policyStatus),
    sub: row.vendor,
    useCaseCounts: row.useCaseCounts,
  }));
  let useCases = DPO_MATRIX_UC.map((useCase) => {
    const matchedTools = tools.filter((tool) => getMatrixCell(tool, useCase).a);
    const gebruikers = matchedTools.reduce(
      (sum, tool) => sum + (getMatrixCell(tool, useCase).gebruikers ?? 0),
      0,
    );
    const shadowHits = matchedTools.filter((tool) => tool.policy !== "approved").length;
    const highestWeight = matchedTools.reduce(
      (max, tool) => Math.max(max, DPO_POLICY_WEIGHT[tool.policy] ?? 0),
      0,
    );
    const risk: MatrixUseCase["risk"] =
      highestWeight >= 3 || useCase.impactfactor >= 2
        ? "hoog"
        : highestWeight >= 1 || useCase.impactfactor >= 1.5
          ? "midden"
          : "laag";

    return {
      ...useCase,
      gebruikers,
      risk,
      shadowHits,
    };
  });

  if (auditMode) {
    tools = tools.filter((tool) => tool.euai);
    useCases = useCases.filter((useCase) => useCase.euai);
  }

  tools.sort((a, b) => {
    if (toolSort === "gebruik") return b.gebruikers - a.gebruikers;
    if (toolSort === "euai") return Number(b.euai) - Number(a.euai) || matrixToolRisk(b) - matrixToolRisk(a);
    return matrixToolRisk(b) - matrixToolRisk(a);
  });
  useCases.sort((a, b) => {
    if (useCaseSort === "gebruik") return b.gebruikers - a.gebruikers;
    if (useCaseSort === "shadow") return (b.shadowHits ?? 0) - (a.shadowHits ?? 0);
    return b.impactfactor - a.impactfactor || b.gebruikers - a.gebruikers;
  });

  return {
    tools: tools.slice(0, DPO_MATRIX_MAX_TOOLS),
    useCases: useCases.slice(0, DPO_MATRIX_MAX_UC),
  };
}

function getMatrixCell(tool: MatrixTool, useCase: MatrixUseCase): MatrixCell {
  const codes = MATRIX_USE_CASE_CODES[useCase.id] ?? [useCase.id];
  const gebruikers = codes.reduce(
    (sum, code) => sum + (tool.useCaseCounts[code] ?? 0),
    0,
  );

  if (gebruikers <= 0) return { a: false, f: null };

  return {
    a: true,
    f: tool.policy === "prohibited" ? "art5" : useCase.euai ? "annex" : null,
    gebruikers,
  };
}

function matrixToolRisk(tool: MatrixTool) {
  return (DPO_POLICY_WEIGHT[tool.policy] ?? 0) * 20 + (tool.eigenPct / 100) * 15 + (tool.euai ? 10 : 0);
}

function matrixCellColor(tool: MatrixTool, useCase: MatrixUseCase, applies: boolean) {
  if (!applies) return null;
  const shadow = tool.policy !== "approved";
  const own = tool.eigenPct > 50;
  if (tool.policy === "approved" && !own) return "#97C459";
  if (shadow && (own || useCase.risk === "hoog")) return "#E24B4A";
  return "#EF9F27";
}

function matrixCellSize(users: number, maxUsers: number) {
  return Math.round(20 + (users / Math.max(maxUsers, 1)) * 18);
}

function normalizeDpoPolicy(policyStatus: PolicyStatus): DpoPolicy {
  if (policyStatus === "Approved") return "approved";
  if (policyStatus === "Under Review") return "review";
  if (policyStatus === "Prohibited") return "prohibited";
  return "shadow";
}

function toReferencePolicy(status: string): PolicyStatus {
  if (status === "approved") return "Approved";
  if (status === "restricted") return "Restricted";
  if (status === "under_review") return "Under Review";
  if (status === "prohibited") return "Prohibited";
  return "";
}

function getCatalogTool(name: string): ToolOption {
  const normalized = normalize(name);
  return (
    toolOptions.find((tool) => normalize(tool.name) === normalized) ?? {
      category: "Zelf invullen",
      id: normalized.replace(/[^a-z0-9]+/g, "_") || "custom",
      name,
    }
  );
}

function inferFieldsFromUseCases(useCases: Record<string, number>) {
  const labels = Object.keys(useCases).map(formatCode);
  if (labels.some((label) => label.includes("Code") || label.includes("Data"))) {
    return ["IT, Data & Development"];
  }
  if (labels.some((label) => label.includes("Afbeeldingen") || label.includes("Teksten"))) {
    return ["Marketing & Communicatie"];
  }
  return ["Anders"];
}

function formatCode(code: string) {
  return code
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace("En", "en");
}

function topUseCases(rows: InventoryDisplayRow[]) {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    for (const useCase of row.useCases) {
      acc[useCase] = (acc[useCase] ?? 0) + 1;
    }
    return acc;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
}

function policyColor(policy: PolicyStatus) {
  return (
    {
      "": "#94a3b8",
      Approved: "#5A8F19",
      Prohibited: "#D13F3F",
      Restricted: "#D08212",
      "Under Review": "#59728A",
    }[policy] ?? "#94a3b8"
  );
}

function accountColor(label: string) {
  return (
    {
      Gemengd: "#8B5CF6",
      "Privé betaald": "#B45309",
      "Privé gratis": "#D08212",
      Zakelijk: "#3e6a00",
    }[label] ?? "#94a3b8"
  );
}

function getUseCaseColor(label: string) {
  return (
    {
      "Afbeeldingen genereren": "#ec4899",
      Automatisering: "#d97706",
      Brainstormen: "#8b5cf6",
      "Code schrijven": "#0E5A75",
      "Data Analyseren": "#0E5A75",
      "Data analyseren": "#0E5A75",
      "Informatie opzoeken": "#0891b2",
      Notuleren: "#64748b",
      Samenvatten: "#3b82f6",
      "Teksten schrijven": "#5C9E1A",
      Vertalen: "#059669",
    }[label] ?? "#94a3b8"
  );
}

function statusLabelColor(label: string) {
  return (
    {
      Beperkt: "#D08212",
      Verboden: "#D13F3F",
      "In beoordeling": "#59728A",
      Toegestaan: "#5A8F19",
    }[label] ?? "#94a3b8"
  );
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
