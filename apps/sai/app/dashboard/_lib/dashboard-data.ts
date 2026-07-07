import { createClient } from "@/lib/supabase/server";

export type ActivationMetrics = {
  activeWaves: number;
  ambassadorOptIns: number;
  completedRuns: number;
  invitedRuns: number;
  latestWaveEndsAt: string | null;
  latestWaveName: string;
  latestWaveStartsAt: string | null;
  latestWaveStatus: string;
  reminderCount: number;
  responseRate: number;
  startedRuns: number;
};

export type ActivationOrgContext = {
  dpoEmail: string;
  dpoName: string;
  dpoPhone: string;
  employeeCount: number;
  organizationName: string;
  sector: string;
};

export type ToolInventoryRow = {
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

export type RiskResultRow = {
  dpo_review_required: boolean | null;
  highest_priority_score: number | string | null;
  person_score: number | string | null;
  review_class: string | null;
  review_trigger_codes: string[] | null;
  score_tier: string | null;
  survey_run_id: string;
};

export type RiskResultToolRow = {
  exposure_score: number | string | null;
  id: string;
  priority_score: number | string | null;
  score_breakdown?: Record<string, unknown> | null;
  score_tier_tool: string | null;
  shadow_score: number | string | null;
  survey_run_id: string;
  survey_tool_id: string;
  survey_tool: {
    org_policy_status_code_snapshot: string | null;
    tool_name: string | null;
  } | null;
  trigger_codes: string[] | null;
};

export type ScoreBand = "low" | "elevated" | "high" | "critical";

export type MatrixCell = {
  count: number;
  exposureBand: ScoreBand;
  shadowBand: ScoreBand;
  suppressed?: boolean;
};

export type ReviewQueueItem = {
  accountType: string;
  clusterId: string;
  context: string;
  dataType: string;
  department: string;
  exposureScore: number;
  priorityScore: number;
  respondentCount: number;
  shadowScore: number;
  tier: string;
  toolName: string;
  triggers: string[];
  useCase: string;
};

export type RiskSummary = {
  averagePriority: number;
  clusterItems: ReviewQueueItem[];
  criticalTools: number;
  dpoRequiredRuns: number;
  matrixCells: MatrixCell[];
  minCellSize: number;
  reviewQueue: ReviewQueueItem[];
  runs: RiskResultRow[];
  suppressedMatrixCells: number;
  suppressedReviewItems: number;
  tierCounts: Record<string, number>;
  toolRows: RiskResultToolRow[];
  topTriggers: [string, number][];
};

export type GovernanceReviewItem = {
  created_at: string | null;
  decision_code: string | null;
  priority_score: number | string | null;
  reason_code: string;
  review_class: string;
  status: string;
  survey_tool: { tool_name: string | null } | null;
  trigger_codes: string[] | null;
};

export type GovernanceSummary = {
  auditEvents: number;
  byReason: [string, number][];
  byStatus: Record<string, number>;
  items: GovernanceReviewItem[];
  openItems: number;
  totalItems: number;
};

export type ReportExportRow = {
  created_at: string | null;
  export_status: string;
  export_type: string;
  file_size_bytes: number | string | null;
  row_count: number | null;
  suppressed_cell_count: number | null;
};

export type ReportSummary = {
  ambassadorOptIns: number;
  completedRuns: number;
  exportCount: number;
  exports: ReportExportRow[];
  latestExportStatus: string;
  reviewItems: number;
  scoredRuns: number;
  suppressedCells: number;
};

export type ProgressSummary = {
  ambassadorOptIns: number;
  anonymizationBehavior: Record<string, number>;
  aiFrequency: Record<string, number>;
  automationUsage: Record<string, number>;
  browserExtensionUsage: Record<string, number>;
  dataTypes: [string, number][];
  dataAwareness: Record<string, number>;
  departments: [string, number][];
  motivations: [string, number][];
  noAiReasons: Record<string, number>;
  policyAwareness: Record<string, number>;
  processingOutput: Record<string, number>;
  skillLevels: Record<string, number>;
  supportNeeds: [string, number][];
  totalCompleted: number;
  totalStarted: number;
  waveCount: number;
  weeklyStarts: [string, number][];
};

type SurveyToolRow = {
  eu_ai_act_flag_code_snapshot: string | null;
  id: string;
  is_custom: boolean;
  org_policy_status_code_snapshot: string | null;
  survey_run_id: string;
  survey_tool_account: { account_type_code: string | null } | null;
  survey_tool_use_case: { use_case_code: string | null }[] | null;
  tool_name: string;
};

type ProfileRow = {
  ai_policy_awareness_code: string | null;
  ai_frequency_code: string | null;
  ai_skill_level_code: string | null;
  anonymization_behavior_code: string | null;
  automation_usage_code: string | null;
  browser_extension_usage_code: string | null;
  data_awareness_code: string | null;
  department_code: string | null;
  no_ai_reason_code: string | null;
  processing_output_code: string | null;
  survey_run: { completed_at: string | null; started_at: string | null } | null;
};

type CodeRow = { [key: string]: string | null };

export const SCORE_BANDS: ScoreBand[] = ["low", "elevated", "high", "critical"];

export async function getActivationMetrics(orgId: string): Promise<ActivationMetrics> {
  const supabase = await createClient();
  const [
    startedRunsResult,
    completedRunsResult,
    activeWavesResult,
    latestWaveResult,
    ambassadorResult,
  ] = await Promise.all([
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
    supabase
      .from("scan_wave")
      .select("name, starts_at, ends_at, status")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("survey_run")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("consent_ambassador", true),
  ]);

  const startedRuns = startedRunsResult.error ? 0 : (startedRunsResult.count ?? 0);
  const completedRuns = completedRunsResult.error
    ? 0
    : (completedRunsResult.count ?? 0);
  const invitedRuns = startedRuns;

  return {
    activeWaves: activeWavesResult.error ? 0 : (activeWavesResult.count ?? 0),
    ambassadorOptIns: ambassadorResult.error ? 0 : (ambassadorResult.count ?? 0),
    completedRuns,
    invitedRuns,
    latestWaveEndsAt:
      latestWaveResult.error || !latestWaveResult.data
        ? null
        : (latestWaveResult.data.ends_at ?? null),
    latestWaveName:
      latestWaveResult.error || !latestWaveResult.data
        ? "Geen scanronde"
        : (latestWaveResult.data.name ?? "Scanronde"),
    latestWaveStartsAt:
      latestWaveResult.error || !latestWaveResult.data
        ? null
        : (latestWaveResult.data.starts_at ?? null),
    latestWaveStatus:
      latestWaveResult.error || !latestWaveResult.data
        ? "draft"
        : (latestWaveResult.data.status ?? "draft"),
    reminderCount: Math.max(startedRuns - completedRuns, 0),
    responseRate:
      invitedRuns > 0 ? Math.round((completedRuns / invitedRuns) * 100) : 0,
    startedRuns,
  };
}

export async function getActivationOrgContext(
  orgId: string,
  userEmail: string | null | undefined,
): Promise<ActivationOrgContext> {
  const supabase = await createClient();
  const result = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();

  return {
    dpoEmail: userEmail ?? "dpo@testorg.nl",
    dpoName: userEmail ? userEmail.split("@")[0] ?? "DPO" : "Marianne de Vries",
    dpoPhone: "+31 6 12345678",
    employeeCount: 1250,
    organizationName:
      result.error || !result.data ? "SAI Smoke Test Organisatie" : result.data.name,
    sector: "Financial Services",
  };
}

export async function getToolInventory(orgId: string): Promise<ToolInventoryRow[]> {
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
    getMinCellSizeQuery(orgId),
  ]);

  const minCellSize = getMinCellSize(minCellResult);
  const { data, error } = toolsResult;

  if (error || !data) return [];

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

    const accountCode = row.survey_tool_account?.account_type_code ?? "onbekend";
    existing.accountTypes[accountCode] = (existing.accountTypes[accountCode] ?? 0) + 1;

    for (const useCase of row.survey_tool_use_case ?? []) {
      const useCaseCode = useCase.use_case_code ?? "onbekend";
      existing.useCases[useCaseCode] = (existing.useCases[useCaseCode] ?? 0) + 1;
    }

    byTool.set(key, existing);
  }

  const rows = Array.from(byTool.values()).map(({ respondentIds, ...row }) => ({
    ...row,
    respondentCount: respondentIds.size,
  }));
  const visibleRows = rows.filter((row) => row.respondentCount >= minCellSize);
  const suppressedRows = rows.filter((row) => row.respondentCount < minCellSize);

  if (suppressedRows.length > 0) {
    visibleRows.push(mergeSuppressedToolRows(suppressedRows));
  }

  return visibleRows.sort((a, b) => {
    if (a.suppressed !== b.suppressed) return a.suppressed ? 1 : -1;
    const usageDiff = b.totalUses - a.totalUses;
    return usageDiff !== 0
      ? usageDiff
      : policyWeight(b.policyStatus) - policyWeight(a.policyStatus);
  });
}

export async function getRiskSummary(orgId: string): Promise<RiskSummary> {
  const supabase = await createClient();
  const [runsResult, toolsResult, minCellResult] = await Promise.all([
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
          survey_tool_id,
          shadow_score,
          exposure_score,
          priority_score,
          score_tier_tool,
          trigger_codes,
          score_breakdown,
          survey_tool(tool_name, org_policy_status_code_snapshot)
        `,
      )
      .eq("org_id", orgId)
      .returns<RiskResultToolRow[]>(),
    getMinCellSizeQuery(orgId),
  ]);

  const runs = runsResult.error || !runsResult.data ? [] : runsResult.data;
  const toolRows = toolsResult.error || !toolsResult.data ? [] : toolsResult.data;
  const minCellSize = getMinCellSize(minCellResult);
  const enrichment = await getRiskToolEnrichment(toolRows);
  const visibleToolNames = getVisibleToolNames(toolRows, minCellSize);
  const tierCounts = countTiers(runs);
  const topTriggers = countTriggers([
    ...runs.flatMap((row) => row.review_trigger_codes ?? []),
    ...toolRows.flatMap((row) => row.trigger_codes ?? []),
  ]);
  const clusterItems = toolRows
    .map((row) => toReviewQueueItem(row, enrichment))
    .filter((item) => visibleToolNames.has(item.toolName))
    .sort((a, b) => b.priorityScore - a.priorityScore);
  const allReviewItems = clusterItems.filter(
    (item) => item.priorityScore >= 40 || item.triggers.length > 0,
  );
  const reviewQueue = allReviewItems
    .filter((item) => visibleToolNames.has(item.toolName))
    .sort((a, b) => b.priorityScore - a.priorityScore);
  const matrixCells = buildMatrixCells(toolRows, minCellSize);
  const dpoRequiredRuns = runs.filter((row) => row.dpo_review_required).length;
  const criticalTools = toolRows.filter(
    (row) => (row.score_tier_tool ?? "").toLowerCase() === "critical",
  ).length;
  const averagePriority =
    runs.length > 0
      ? Math.round(
          runs.reduce((sum, row) => sum + toNumber(row.highest_priority_score), 0) /
            runs.length,
        )
      : 0;

  return {
    averagePriority,
    clusterItems,
    criticalTools,
    dpoRequiredRuns,
    matrixCells,
    minCellSize,
    reviewQueue,
    runs,
    suppressedMatrixCells: matrixCells.filter((cell) => cell.suppressed).length,
    suppressedReviewItems: allReviewItems.filter(
      (item) => !visibleToolNames.has(item.toolName),
    ).length,
    tierCounts,
    toolRows,
    topTriggers,
  };
}

export async function getGovernanceSummary(orgId: string): Promise<GovernanceSummary> {
  const supabase = await createClient();
  const [itemsResult, auditResult] = await Promise.all([
    supabase
      .from("dpo_review_items")
      .select(
        `
          reason_code,
          review_class,
          trigger_codes,
          priority_score,
          status,
          decision_code,
          created_at,
          survey_tool(tool_name)
        `,
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .returns<GovernanceReviewItem[]>(),
    supabase
      .from("audit_events")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  const items = itemsResult.error || !itemsResult.data ? [] : itemsResult.data;

  return {
    auditEvents: auditResult.error ? 0 : (auditResult.count ?? 0),
    byReason: countValues(items.map((item) => item.reason_code)),
    byStatus: items.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {}),
    items,
    openItems: items.filter((item) => item.status === "open" || item.status === "in_review")
      .length,
    totalItems: items.length,
  };
}

export async function getReportSummary(orgId: string): Promise<ReportSummary> {
  const supabase = await createClient();
  const [exportsResult, runsResult, riskResult, reviewResult, ambassadorResult] =
    await Promise.all([
      supabase
        .from("report_exports")
        .select(
          "export_type, export_status, row_count, file_size_bytes, suppressed_cell_count, created_at",
          { count: "exact" },
        )
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8)
        .returns<ReportExportRow[]>(),
      supabase
        .from("survey_run")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .not("completed_at", "is", null),
      supabase
        .from("risk_result")
        .select("survey_run_id", { count: "exact", head: true })
        .eq("org_id", orgId),
      supabase
        .from("dpo_review_items")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .in("status", ["open", "in_review"]),
      supabase
        .from("survey_run")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("consent_ambassador", true),
    ]);

  const exports = exportsResult.error || !exportsResult.data ? [] : exportsResult.data;

  return {
    ambassadorOptIns: ambassadorResult.error ? 0 : (ambassadorResult.count ?? 0),
    completedRuns: runsResult.error ? 0 : (runsResult.count ?? 0),
    exportCount: exportsResult.error ? exports.length : (exportsResult.count ?? exports.length),
    exports,
    latestExportStatus: exports[0]?.export_status ?? "geen export",
    reviewItems: reviewResult.error ? 0 : (reviewResult.count ?? 0),
    scoredRuns: riskResult.error ? 0 : (riskResult.count ?? 0),
    suppressedCells: exports.reduce(
      (sum, row) => sum + (row.suppressed_cell_count ?? 0),
      0,
    ),
  };
}

export async function getProgressSummary(orgId: string): Promise<ProgressSummary> {
  const supabase = await createClient();
  const [
    startedRunsResult,
    completedRunsResult,
    profilesResult,
    supportResult,
    dataTypeResult,
    motivationResult,
    ambassadorResult,
    waveResult,
  ] = await Promise.all([
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
      .from("survey_profile")
      .select(
        "department_code, ai_frequency_code, no_ai_reason_code, data_awareness_code, anonymization_behavior_code, browser_extension_usage_code, automation_usage_code, ai_skill_level_code, ai_policy_awareness_code, processing_output_code, survey_run!inner(org_id, started_at, completed_at)",
      )
      .eq("survey_run.org_id", orgId)
      .returns<ProfileRow[]>(),
    supabase
      .from("survey_support_need")
      .select("support_need_code, survey_run!inner(org_id)")
      .eq("survey_run.org_id", orgId)
      .returns<CodeRow[]>(),
    supabase
      .from("survey_data_type")
      .select("data_type_code, survey_run!inner(org_id)")
      .eq("survey_run.org_id", orgId)
      .returns<CodeRow[]>(),
    supabase
      .from("survey_motivation")
      .select("motivation_code, survey_run!inner(org_id)")
      .eq("survey_run.org_id", orgId)
      .returns<CodeRow[]>(),
    supabase
      .from("survey_run")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("consent_ambassador", true),
    supabase
      .from("survey_run")
      .select("wave_id")
      .eq("org_id", orgId)
      .not("wave_id", "is", null)
      .returns<Array<{ wave_id: string | null }>>(),
  ]);

  const profiles =
    profilesResult.error || !profilesResult.data ? [] : profilesResult.data;
  const supports =
    supportResult.error || !supportResult.data ? [] : supportResult.data;
  const dataTypes =
    dataTypeResult.error || !dataTypeResult.data ? [] : dataTypeResult.data;
  const motivations =
    motivationResult.error || !motivationResult.data ? [] : motivationResult.data;
  const waveCount =
    waveResult.error || !waveResult.data
      ? 0
      : new Set(waveResult.data.map((row) => row.wave_id).filter(Boolean)).size;

  return {
    ambassadorOptIns: ambassadorResult.error ? 0 : (ambassadorResult.count ?? 0),
    aiFrequency: toRecord(countValues(profiles.map((row) => row.ai_frequency_code))),
    anonymizationBehavior: toRecord(
      countValues(profiles.map((row) => row.anonymization_behavior_code)),
    ),
    automationUsage: toRecord(
      countValues(profiles.map((row) => row.automation_usage_code)),
    ),
    browserExtensionUsage: toRecord(
      countValues(profiles.map((row) => row.browser_extension_usage_code)),
    ),
    dataTypes: countValues(dataTypes.map((row) => row.data_type_code)),
    dataAwareness: toRecord(countValues(profiles.map((row) => row.data_awareness_code))),
    departments: countValues(profiles.map((row) => row.department_code)),
    motivations: countValues(motivations.map((row) => row.motivation_code)),
    noAiReasons: toRecord(countValues(profiles.map((row) => row.no_ai_reason_code))),
    policyAwareness: toRecord(
      countValues(profiles.map((row) => row.ai_policy_awareness_code)),
    ),
    processingOutput: toRecord(
      countValues(profiles.map((row) => row.processing_output_code)),
    ),
    skillLevels: toRecord(countValues(profiles.map((row) => row.ai_skill_level_code))),
    supportNeeds: countValues(supports.map((row) => row.support_need_code)),
    totalCompleted: completedRunsResult.error ? 0 : (completedRunsResult.count ?? 0),
    totalStarted: startedRunsResult.error ? 0 : (startedRunsResult.count ?? 0),
    waveCount,
    weeklyStarts: countValues(
      profiles.map((row) => {
        const startedAt = row.survey_run?.started_at;
        return startedAt ? startedAt.slice(0, 10) : null;
      }),
    ).slice(0, 8),
  };
}

export function getInventoryMetrics(inventory: ToolInventoryRow[]) {
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

export function getPolicyStyle(status: string) {
  const styles: Record<
    string,
    { background: string; border: string; color: string; label: string }
  > = {
    approved: {
      background: "#e6f4cf",
      border: "#cce7a0",
      color: "#3e6a00",
      label: "Toegestaan",
    },
    newly_discovered: {
      background: "#fdecea",
      border: "#f4c5c3",
      color: "#b4292d",
      label: "Nieuw",
    },
    prohibited: {
      background: "#fdecea",
      border: "#f4b5b3",
      color: "#b4292d",
      label: "Verboden",
    },
    restricted: {
      background: "#fff1cc",
      border: "#f0d38a",
      color: "#b45309",
      label: "Beperkt",
    },
    under_review: {
      background: "#e8f4fb",
      border: "#bfe7ff",
      color: "#0E5A75",
      label: "Review",
    },
  };

  return styles[status] ?? styles.newly_discovered;
}

export function policyWeight(status: string) {
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

export function topEntries(record: Record<string, number>, maxItems: number) {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems);
}

export function formatCode(code: string | null | undefined) {
  if (!code) return "Onbekend";

  return code
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function bandLabel(band: ScoreBand) {
  return {
    critical: "Kritiek",
    elevated: "Verhoogd",
    high: "Hoog",
    low: "Laag",
  }[band];
}

export function normalizeBand(value: string): ScoreBand {
  return SCORE_BANDS.includes(value as ScoreBand) ? (value as ScoreBand) : "low";
}

function getMinCellSizeQuery(orgId: string) {
  return createClient().then((supabase) =>
    supabase
      .from("scan_scoring_config")
      .select("dashboard_min_cell_size")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
}

function getMinCellSize(result: {
  data: { dashboard_min_cell_size: number | null } | null;
  error: unknown;
}) {
  return result.error || !result.data ? 5 : (result.data.dashboard_min_cell_size ?? 5);
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

function normalizeToolName(value: string) {
  return value.trim().toLowerCase();
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

function buildMatrixCells(rows: RiskResultToolRow[], minCellSize: number): MatrixCell[] {
  const counts = new Map<string, MatrixCell>();

  for (const row of rows) {
    const shadowBand = scoreToBand(toNumber(row.shadow_score));
    const exposureBand = scoreToBand(toNumber(row.exposure_score));
    const key = `${shadowBand}-${exposureBand}`;
    const cell = counts.get(key) ?? { count: 0, exposureBand, shadowBand };
    cell.count += 1;
    counts.set(key, cell);
  }

  return Array.from(counts.values()).map((cell) => ({
    ...cell,
    suppressed: cell.count > 0 && cell.count < minCellSize,
  }));
}

type RiskToolEnrichment = {
  accounts: Map<string, string>;
  contextsByTool: Map<string, string[]>;
  dataTypesByRun: Map<string, string[]>;
  profiles: Map<
    string,
    {
      department_code: string | null;
      department_other_text: string | null;
    }
  >;
  useCasesByTool: Map<string, string[]>;
};

async function getRiskToolEnrichment(rows: RiskResultToolRow[]): Promise<RiskToolEnrichment> {
  const empty: RiskToolEnrichment = {
    accounts: new Map(),
    contextsByTool: new Map(),
    dataTypesByRun: new Map(),
    profiles: new Map(),
    useCasesByTool: new Map(),
  };
  const runIds = uniqueDefined(rows.map((row) => row.survey_run_id));
  const toolIds = uniqueDefined(rows.map((row) => row.survey_tool_id));

  if (runIds.length === 0 && toolIds.length === 0) return empty;

  const supabase = await createClient();
  const [profilesResult, dataTypesResult, accountsResult, useCasesResult] =
    await Promise.all([
      runIds.length > 0
        ? supabase
            .from("survey_profile")
            .select("survey_run_id, department_code, department_other_text")
            .in("survey_run_id", runIds)
        : Promise.resolve({ data: [], error: null }),
      runIds.length > 0
        ? supabase
            .from("survey_data_type")
            .select("survey_run_id, data_type_code")
            .in("survey_run_id", runIds)
        : Promise.resolve({ data: [], error: null }),
      toolIds.length > 0
        ? supabase
            .from("survey_tool_account")
            .select("survey_tool_id, account_type_code")
            .in("survey_tool_id", toolIds)
        : Promise.resolve({ data: [], error: null }),
      toolIds.length > 0
        ? supabase
            .from("survey_tool_use_case")
            .select("id, survey_tool_id, use_case_code")
            .in("survey_tool_id", toolIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  const profiles = new Map<string, { department_code: string | null; department_other_text: string | null }>();
  if (!profilesResult.error && profilesResult.data) {
    for (const row of profilesResult.data as {
      department_code: string | null;
      department_other_text: string | null;
      survey_run_id: string;
    }[]) {
      profiles.set(row.survey_run_id, {
        department_code: row.department_code,
        department_other_text: row.department_other_text,
      });
    }
  }

  const dataTypesByRun = new Map<string, string[]>();
  if (!dataTypesResult.error && dataTypesResult.data) {
    for (const row of dataTypesResult.data as {
      data_type_code: string;
      survey_run_id: string;
    }[]) {
      const values = dataTypesByRun.get(row.survey_run_id) ?? [];
      values.push(row.data_type_code);
      dataTypesByRun.set(row.survey_run_id, values);
    }
  }

  const accounts = new Map<string, string>();
  if (!accountsResult.error && accountsResult.data) {
    for (const row of accountsResult.data as {
      account_type_code: string | null;
      survey_tool_id: string;
    }[]) {
      accounts.set(row.survey_tool_id, row.account_type_code ?? "onbekend");
    }
  }

  const useCasesByTool = new Map<string, string[]>();
  const useCaseIds: string[] = [];
  const useCaseToolMap = new Map<string, string>();
  if (!useCasesResult.error && useCasesResult.data) {
    for (const row of useCasesResult.data as {
      id: string;
      survey_tool_id: string;
      use_case_code: string;
    }[]) {
      const values = useCasesByTool.get(row.survey_tool_id) ?? [];
      values.push(row.use_case_code);
      useCasesByTool.set(row.survey_tool_id, values);
      useCaseIds.push(row.id);
      useCaseToolMap.set(row.id, row.survey_tool_id);
    }
  }

  const contextsByTool = new Map<string, string[]>();
  if (useCaseIds.length > 0) {
    const contextsResult = await supabase
      .from("survey_tool_use_case_context")
      .select("survey_tool_use_case_id, context_code")
      .in("survey_tool_use_case_id", useCaseIds);
    if (!contextsResult.error && contextsResult.data) {
      for (const row of contextsResult.data as {
        context_code: string;
        survey_tool_use_case_id: string;
      }[]) {
        const toolId = useCaseToolMap.get(row.survey_tool_use_case_id);
        if (!toolId) continue;
        const values = contextsByTool.get(toolId) ?? [];
        values.push(row.context_code);
        contextsByTool.set(toolId, values);
      }
    }
  }

  return { accounts, contextsByTool, dataTypesByRun, profiles, useCasesByTool };
}

function uniqueDefined(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function toReviewQueueItem(
  row: RiskResultToolRow,
  enrichment: RiskToolEnrichment,
): ReviewQueueItem {
  const toolName = row.survey_tool?.tool_name ?? "Onbekende tool";
  const profile = enrichment.profiles.get(row.survey_run_id);
  const department =
    profile?.department_other_text || profile?.department_code || "Organisatiebreed";
  const useCase = firstMeaningful(enrichment.useCasesByTool.get(row.survey_tool_id), "Onbekend");
  const context = firstMeaningful(enrichment.contextsByTool.get(row.survey_tool_id), "Niet gespecificeerd");
  const dataType = firstMeaningful(enrichment.dataTypesByRun.get(row.survey_run_id), "Onbekend");

  return {
    accountType: enrichment.accounts.get(row.survey_tool_id) ?? "onbekend",
    clusterId: row.id,
    context,
    dataType,
    department,
    exposureScore: toNumber(row.exposure_score),
    priorityScore: toNumber(row.priority_score),
    respondentCount: 1,
    shadowScore: toNumber(row.shadow_score),
    tier: normalizeBand(row.score_tier_tool ?? "low"),
    toolName,
    triggers: row.trigger_codes ?? [],
    useCase,
  };
}

function firstMeaningful(values: string[] | undefined, fallback: string) {
  return values?.find(Boolean) ?? fallback;
}

function getVisibleToolNames(rows: RiskResultToolRow[], minCellSize: number) {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const toolName = row.survey_tool?.tool_name ?? "Onbekende tool";
    acc[toolName] = (acc[toolName] ?? 0) + 1;
    return acc;
  }, {});

  return new Set(
    Object.entries(counts)
      .filter(([, count]) => count >= minCellSize)
      .map(([toolName]) => toolName),
  );
}

function scoreToBand(score: number): ScoreBand {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "elevated";
  return "low";
}

function countValues(values: (string | null | undefined)[]) {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    const key = value ?? "onbekend";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function toRecord(entries: [string, number][]) {
  return entries.reduce<Record<string, number>>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
}
