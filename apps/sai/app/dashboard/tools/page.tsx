import {
  DashboardAccessPanel,
  DashboardShell,
  MetricCard,
  getDashboardAccess,
} from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

type SurveyToolRow = {
  id: string;
  survey_run_id: string;
  tool_name: string;
  is_custom: boolean;
  org_policy_status_code_snapshot: string | null;
  eu_ai_act_flag_code_snapshot: string | null;
  survey_tool_account: { account_type_code: string | null } | null;
  survey_tool_use_case: { use_case_code: string | null }[] | null;
};

type ToolInventoryRow = {
  accountTypes: Record<string, number>;
  customCount: number;
  euAiFlagCount: number;
  policyStatus: string;
  respondentCount: number;
  suppressed?: boolean;
  toolName: string;
  totalUses: number;
  useCases: Record<string, number>;
};

export default async function ToolInventoryDashboardPage() {
  const access = await getDashboardAccess();

  if (access.kind !== "authorized") {
    return (
      <DashboardShell>
        <DashboardAccessPanel access={access} />
      </DashboardShell>
    );
  }

  const inventory = await getToolInventory(access.roleState.orgId);
  const metrics = getInventoryMetrics(inventory);

  return (
    <DashboardShell>
      <section className="grid gap-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6993aa]">
              DPO Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-[#00658b]">
              Tool Inventaris
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#40484e]">
              Overzicht van gerapporteerde AI-tools, beleidsstatus,
              accountbeheer en gebruikspatronen. De tabel toont alleen
              organisatiebrede signalen, geen individuele respondenten.
            </p>
          </div>
          <span className="rounded-full border border-[#bfc7cf]/60 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#40484e] shadow-sm">
            {inventory.length} tools in scope
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Unieke tools" value={metrics.uniqueTools} />
          <MetricCard label="Toolmeldingen" value={metrics.totalUses} />
          <MetricCard label="Shadow/review" value={metrics.reviewTools} />
          <MetricCard label="Priveaccounten" suffix="%" value={metrics.privateAccountRate} />
        </div>

        <section className="grid gap-4 rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-[0_8px_30px_rgba(0,101,139,0.05)] md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-[#00658b]">
                Tools en governance-status
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#40484e]">
                Sorteervolgorde: eerst veelgebruikte tools en daarna tools met
                meer governance-aandacht.
              </p>
            </div>
            <PolicyLegend />
          </div>

          {inventory.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-[#dbe3ec] bg-white">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-[#f1f4f6] text-xs font-bold uppercase tracking-wide text-[#40484e]">
                  <tr>
                    <th className="px-4 py-3">Tool</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Meldingen</th>
                    <th className="px-4 py-3 text-right">Respondenten</th>
                    <th className="px-4 py-3">Accountgebruik</th>
                    <th className="px-4 py-3">Top use-cases</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((row) => (
                    <ToolInventoryTableRow key={row.toolName} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyInventory />
          )}
        </section>
      </section>
    </DashboardShell>
  );
}

async function getToolInventory(orgId: string): Promise<ToolInventoryRow[]> {
  const supabase = await createClient();
  const [toolsResult, minCellResult] = await Promise.all([
    supabase
      .from("survey_tool")
      .select(
        `
          id,
          survey_run_id,
          tool_name,
          is_custom,
          org_policy_status_code_snapshot,
          eu_ai_act_flag_code_snapshot,
          survey_run!inner(org_id),
          survey_tool_account(account_type_code),
          survey_tool_use_case(use_case_code)
        `,
      )
      .eq("survey_run.org_id", orgId)
      .returns<SurveyToolRow[]>(),
    supabase
      .from("scan_scoring_config")
      .select("dashboard_min_cell_size")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const { data, error } = toolsResult;
  const minCellSize =
    minCellResult.error || !minCellResult.data
      ? 5
      : (minCellResult.data.dashboard_min_cell_size ?? 5);

  if (error || !data) {
    return [];
  }

  const byTool = new Map<string, ToolInventoryRow & { respondentIds: Set<string> }>();

  for (const row of data) {
    const key = normalizeToolName(row.tool_name);
    const existing =
      byTool.get(key) ??
      {
        accountTypes: {},
        customCount: 0,
        euAiFlagCount: 0,
        policyStatus: row.org_policy_status_code_snapshot ?? "newly_discovered",
        respondentCount: 0,
        respondentIds: new Set<string>(),
        toolName: row.tool_name,
        totalUses: 0,
        useCases: {},
      };

    existing.totalUses += 1;
    existing.respondentIds.add(row.survey_run_id);
    existing.policyStatus = strongestPolicyStatus(
      existing.policyStatus,
      row.org_policy_status_code_snapshot ?? "newly_discovered",
    );
    existing.customCount += row.is_custom ? 1 : 0;
    existing.euAiFlagCount +=
      row.eu_ai_act_flag_code_snapshot &&
      row.eu_ai_act_flag_code_snapshot !== "none"
        ? 1
        : 0;

    const accountCode =
      row.survey_tool_account?.account_type_code ?? "onbekend";
    existing.accountTypes[accountCode] = (existing.accountTypes[accountCode] ?? 0) + 1;

    for (const useCase of row.survey_tool_use_case ?? []) {
      const useCaseCode = useCase.use_case_code ?? "onbekend";
      existing.useCases[useCaseCode] = (existing.useCases[useCaseCode] ?? 0) + 1;
    }

    byTool.set(key, existing);
  }

  const rows = Array.from(byTool.values())
    .map(({ respondentIds, ...row }) => ({
      ...row,
      respondentCount: respondentIds.size,
    }));
  const visibleRows = rows.filter((row) => row.respondentCount >= minCellSize);
  const suppressedRows = rows.filter((row) => row.respondentCount < minCellSize);

  if (suppressedRows.length > 0) {
    visibleRows.push(mergeSuppressedToolRows(suppressedRows));
  }

  return visibleRows
    .sort((a, b) => {
      if (a.suppressed !== b.suppressed) return a.suppressed ? 1 : -1;
      const usageDiff = b.totalUses - a.totalUses;
      return usageDiff !== 0
        ? usageDiff
        : policyWeight(b.policyStatus) - policyWeight(a.policyStatus);
    });
}

function ToolInventoryTableRow({ row }: { row: ToolInventoryRow }) {
  const privateUses =
    (row.accountTypes.personal_free ?? 0) +
    (row.accountTypes.prive_gratis ?? 0) +
    (row.accountTypes.personal_paid ?? 0) +
    (row.accountTypes.prive_betaald ?? 0);
  const businessUses =
    (row.accountTypes.business_license ?? 0) +
    (row.accountTypes.zakelijke_licentie ?? 0);
  const mixedUses = (row.accountTypes.both ?? 0) + (row.accountTypes.beide ?? 0);

  return (
    <tr className="border-t border-[#e5e9eb] align-top">
      <td className="px-4 py-4">
        <p className="font-extrabold text-[#181c1e]">{row.toolName}</p>
        <p className="mt-1 text-xs font-semibold text-[#6993aa]">
          {row.suppressed
            ? "Samengevoegd vanwege minimale celgrootte"
            : row.customCount > 0
              ? `${row.customCount} eigen invoer`
              : "Catalogus/tool"}
          {row.euAiFlagCount > 0 ? ` · ${row.euAiFlagCount} EU AI signaal` : ""}
        </p>
      </td>
      <td className="px-4 py-4">
        <PolicyBadge status={row.policyStatus} />
      </td>
      <td className="px-4 py-4 text-right font-bold">{row.totalUses}</td>
      <td className="px-4 py-4 text-right font-bold">{row.respondentCount}</td>
      <td className="px-4 py-4">
        <div className="grid gap-2">
          <DistributionBar
            businessUses={businessUses}
            mixedUses={mixedUses}
            privateUses={privateUses}
          />
          <p className="text-xs text-[#40484e]">
            Zakelijk {businessUses} · Prive {privateUses} · Beide {mixedUses}
          </p>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex max-w-sm flex-wrap gap-1.5">
          {topEntries(row.useCases, 3).map(([code, count]) => (
            <span
              className="rounded-full border border-[#c4e7ff] bg-[#f3fbff] px-2.5 py-1 text-xs font-bold text-[#00658b]"
              key={code}
            >
              {formatCode(code)} {count}
            </span>
          ))}
          {row.suppressed ? (
            <span className="text-xs font-semibold text-[#94a3b8]">
              Details onderdrukt
            </span>
          ) : Object.keys(row.useCases).length === 0 ? (
            <span className="text-xs font-semibold text-[#94a3b8]">
              Geen use-case vastgelegd
            </span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function PolicyLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {["approved", "newly_discovered", "under_review", "restricted", "prohibited"].map(
        (status) => (
          <PolicyBadge key={status} status={status} />
        ),
      )}
    </div>
  );
}

function PolicyBadge({ status }: { status: string }) {
  const style = getPolicyStyle(status);

  return (
    <span
      className="inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold"
      style={{
        backgroundColor: style.background,
        borderColor: style.border,
        color: style.color,
      }}
    >
      {style.label}
    </span>
  );
}

function DistributionBar({
  businessUses,
  mixedUses,
  privateUses,
}: {
  businessUses: number;
  mixedUses: number;
  privateUses: number;
}) {
  const total = businessUses + mixedUses + privateUses;
  const businessWidth = total > 0 ? (businessUses / total) * 100 : 0;
  const mixedWidth = total > 0 ? (mixedUses / total) * 100 : 0;
  const privateWidth = total > 0 ? (privateUses / total) * 100 : 0;

  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-[#e5e9eb]">
      <span className="bg-[#527a1b]" style={{ width: `${businessWidth}%` }} />
      <span className="bg-[#ca8a04]" style={{ width: `${mixedWidth}%` }} />
      <span className="bg-[#b90360]" style={{ width: `${privateWidth}%` }} />
    </div>
  );
}

function EmptyInventory() {
  return (
    <section className="rounded-2xl border border-dashed border-[#bfc7cf] bg-white p-8 text-center">
      <h2 className="text-lg font-extrabold text-[#00658b]">
        Nog geen tooldata
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#40484e]">
        Zodra respondenten de scan afronden, verschijnt hier de toolinventaris
        voor DPO-triage.
      </p>
    </section>
  );
}

function getInventoryMetrics(inventory: ToolInventoryRow[]) {
  const totalUses = inventory.reduce((sum, row) => sum + row.totalUses, 0);
  const privateUses = inventory.reduce(
    (sum, row) =>
      sum +
      (row.accountTypes.personal_free ?? 0) +
      (row.accountTypes.prive_gratis ?? 0) +
      (row.accountTypes.personal_paid ?? 0) +
      (row.accountTypes.prive_betaald ?? 0),
    0,
  );
  const reviewTools = inventory.filter(
    (row) => policyWeight(row.policyStatus) >= policyWeight("newly_discovered"),
  ).length;

  return {
    privateAccountRate: totalUses > 0 ? Math.round((privateUses / totalUses) * 100) : 0,
    reviewTools,
    totalUses,
    uniqueTools: inventory.length,
  };
}

function mergeSuppressedToolRows(rows: ToolInventoryRow[]): ToolInventoryRow {
  return rows.reduce<ToolInventoryRow>(
    (merged, row) => {
      merged.customCount += row.customCount;
      merged.euAiFlagCount += row.euAiFlagCount;
      merged.policyStatus = strongestPolicyStatus(merged.policyStatus, row.policyStatus);
      merged.respondentCount += row.respondentCount;
      merged.totalUses += row.totalUses;

      for (const [code, count] of Object.entries(row.accountTypes)) {
        merged.accountTypes[code] = (merged.accountTypes[code] ?? 0) + count;
      }

      return merged;
    },
    {
      accountTypes: {},
      customCount: 0,
      euAiFlagCount: 0,
      policyStatus: "newly_discovered",
      respondentCount: 0,
      suppressed: true,
      toolName: "Kleine toolclusters",
      totalUses: 0,
      useCases: {},
    },
  );
}

function strongestPolicyStatus(current: string, candidate: string) {
  return policyWeight(candidate) > policyWeight(current) ? candidate : current;
}

function policyWeight(status: string) {
  return (
    {
      approved: 0,
      newly_discovered: 1,
      under_review: 2,
      restricted: 3,
      prohibited: 4,
    }[status] ?? 1
  );
}

function getPolicyStyle(status: string) {
  const styles: Record<
    string,
    { background: string; border: string; color: string; label: string }
  > = {
    approved: {
      background: "#eef7e1",
      border: "#d6ecb4",
      color: "#527a1b",
      label: "Toegestaan",
    },
    newly_discovered: {
      background: "#fef2f2",
      border: "#f2c8c8",
      color: "#9f403d",
      label: "Nieuw",
    },
    under_review: {
      background: "#fff7df",
      border: "#f0d38a",
      color: "#9a6700",
      label: "Review",
    },
    restricted: {
      background: "#fff1cc",
      border: "#e8bd68",
      color: "#8a5600",
      label: "Beperkt",
    },
    prohibited: {
      background: "#fcebeb",
      border: "#efb5b5",
      color: "#8e1b1b",
      label: "Verboden",
    },
  };

  return styles[status] ?? styles.newly_discovered;
}

function normalizeToolName(value: string) {
  return value.trim().toLowerCase();
}

function topEntries(record: Record<string, number>, maxItems: number) {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems);
}

function formatCode(code: string) {
  return code
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
