import { aggregateSupportedPatterns, getAiFotoAttentionLevel as deriveAiFotoAttentionLevel, getSupportedAiFotoPatterns } from "@digidactics/domain";
import { createClient } from "@/lib/supabase/server";
import {
  aiVisibilityOptions,
  conditionNeedOptions,
  dataTypeOptions,
  escalationRouteAwarenessOptions,
  nearMissSignalOptions,
  netEffectOptions,
  outputControlOptions,
  outputDestinationOptions,
  peopleImpactOptions,
  skillDomainOptions,
  useCaseOptions,
  valueBeneficiaryOptions,
  valueTypeOptions,
} from "@/lib/sai-survey/options";

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

export type AiFotoCardSignal = {
  code: string;
  count: number;
  label: string;
};

export type AiFotoApplicationPreview = {
  attentionLevel: "basis" | "hoog" | "middel";
  conditionLabels: string[];
  dataLabels: string[];
  id: string;
  netEffectLabel: string;
  outputDestinationLabel: string;
  peopleImpactLabel: string;
  taskDescription: string;
  toolName: string;
  useCaseLabel: string;
  valueLabels: string[];
};

export type AiFotoPreviewSummary = {
  applicationCount: number;
  attentionSignals: AiFotoCardSignal[];
  cardItemCounts: {
    approved: number;
    aiSuggested: number;
    consultantReviewed: number;
    draft: number;
    total: number;
  };
  completedRuns: number;
  decisionPoints: string[];
  outputDestinations: AiFotoCardSignal[];
  routeItems: Array<{
    horizon: "30" | "60" | "90";
    items: string[];
    title: string;
  }>;
  skillSignals: AiFotoCardSignal[];
  topApplications: AiFotoApplicationPreview[];
  valueBeneficiaries: AiFotoCardSignal[];
  valueSignals: AiFotoCardSignal[];
};

export type AiFotoCardItemStatus =
  | "ai_suggested"
  | "approved"
  | "consultant_reviewed"
  | "draft";

export type AiFotoCardItemRow = {
  analysis_version: string;
  approved_at: string | null;
  card_type: "aandacht" | "vaardigheid" | "waarde";
  cluster_key: string;
  created_at: string | null;
  evidence_level: "aangetoond" | "aannemelijk" | "gesteld";
  evidence_refs: unknown;
  follow_up_direction: string | null;
  id: string;
  interpretation: string | null;
  observation: string;
  open_questions: string[] | null;
  precaution: string | null;
  proposed_owner_role: string | null;
  respondent_count: number | null;
  review_date: string | null;
  scan_wave_id: string | null;
  source_kind: string;
  status: AiFotoCardItemStatus;
  title: string;
  updated_at: string | null;
};

export type AiFotoExportPreview = {
  approvedItems: AiFotoCardItemRow[];
  latestExport: {
    created_at: string | null;
    export_status: string;
    id: string;
  } | null;
  methodVersion: string;
  organizationName: string;
  readiness: "incomplete_metadata" | "no_approved_items" | "ready";
  scanWaveId: string | null;
  scanWaveName: string;
  selectedItemIds: string[];
};

export type AiFotoWorkbenchData = {
  cardItems: AiFotoCardItemRow[];
  exportPreview: AiFotoExportPreview;
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

type AiFotoApplicationRow = {
  account_environment_code: string | null;
  ai_visibility_code: string | null;
  beneficiary_code: string | null;
  control_rework_code: string | null;
  deviation_authority_code: string | null;
  escalation_route_awareness_code: string | null;
  id: string;
  net_effect_code: string | null;
  output_control_code: string | null;
  output_destination_code: string | null;
  people_impact_code: string | null;
  shareability_code: string | null;
  survey_application_condition_need:
    | { condition_need_code: string | null }[]
    | null;
  survey_application_data_type: { data_type_code: string | null }[] | null;
  survey_application_near_miss_signal:
    | { near_miss_signal_code: string | null }[]
    | null;
  survey_application_skill_response:
    | {
        skill_domain_code: string | null;
        skill_response_code: string | null;
      }[]
    | null;
  survey_application_support_need:
    | { support_need_code: string | null }[]
    | null;
  survey_application_value_type: { value_type_code: string | null }[] | null;
  survey_run: { completed_at: string | null; org_id: string } | null;
  survey_tool: { tool_name: string | null } | null;
  survey_tool_use_case: { use_case_code: string | null } | null;
  task_description_limited: string | null;
  transparency_code: string | null;
  value_evidence_code: string | null;
};

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
    dpoEmail: userEmail ?? "",
    dpoName: userEmail ? userEmail.split("@")[0] ?? "" : "",
    dpoPhone: "",
    employeeCount: 0,
    organizationName:
      result.error || !result.data ? "Onbekende organisatie" : result.data.name,
    sector: "",
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

  for (const result of [runsResult, toolsResult, minCellResult]) {
    if (result.error) throw new Error(result.error.message);
  }
  const runs = runsResult.data ?? [];
  const toolRows = toolsResult.error || !toolsResult.data ? [] : toolsResult.data;
  const minCellSize = Math.max(5, getMinCellSize(minCellResult));
  const enrichment = await getRiskToolEnrichment(toolRows);
  const visibleToolNames = getVisibleToolNames(toolRows, minCellSize);
  const tierCounts = countTiers(runs);
  const topTriggers = countTriggers([
    ...runs.flatMap((row) => row.review_trigger_codes ?? []),
    ...toolRows.flatMap((row) => row.trigger_codes ?? []),
  ]);
  const clusterItems = aggregateSupportedPatterns(toolRows.map((row) => {
    const item = toReviewQueueItem(row, enrichment);
    const { clusterId, respondentCount, ...pattern } = item;
    void clusterId; void respondentCount;
    return { respondentId: row.survey_run_id, pattern: { ...pattern, triggers: [...pattern.triggers].sort() } };
  }), minCellSize)
    .map(({ pattern, respondentCount }, index) => ({ ...pattern, respondentCount, clusterId: `report-pattern-${index + 1}` }))
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

export async function getAiFotoPreviewSummary(
  orgId: string,
): Promise<AiFotoPreviewSummary> {
  const supabase = await createClient();
  const minCellResult = await getMinCellSizeQuery(orgId);
  if (minCellResult.error) throw new Error(minCellResult.error.message);
  const minCellSize = Math.max(5, getMinCellSize(minCellResult));
  const latestWave = await supabase.from("scan_wave").select("id").eq("org_id", orgId)
    .eq("product_code", "ai_foto").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (latestWave.error) throw new Error(latestWave.error.message);
  const currentWaveId = latestWave.data?.id ?? "00000000-0000-0000-0000-000000000000";
  const [applicationsResult, completedRunsResult, cardItemsResult] = await Promise.all([
    supabase
      .from("survey_application")
      .select(
        `
          id,
          account_environment_code,
          output_destination_code,
          output_control_code,
          deviation_authority_code,
          people_impact_code,
          ai_visibility_code,
          transparency_code,
          beneficiary_code,
          net_effect_code,
          control_rework_code,
          shareability_code,
          value_evidence_code,
          escalation_route_awareness_code,
          survey_run!inner(org_id, product_code_snapshot, completed_at, wave_id),
          survey_tool(tool_name),
          survey_tool_use_case(use_case_code),
          survey_application_data_type(data_type_code),
          survey_application_value_type(value_type_code),
          survey_application_condition_need(condition_need_code),
          survey_application_near_miss_signal(near_miss_signal_code),
          survey_application_support_need(support_need_code),
          survey_application_skill_response(skill_domain_code, skill_response_code)
        `,
      )
      .eq("survey_run.org_id", orgId)
      .eq("survey_run.product_code_snapshot", "ai_foto")
      .eq("survey_run.wave_id", currentWaveId)
      .not("survey_run.completed_at", "is", null)
      .eq("depth_rank", "primary")
      .returns<AiFotoApplicationRow[]>(),
    supabase
      .from("survey_run")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("product_code_snapshot", "ai_foto")
      .eq("wave_id", currentWaveId)
      .not("completed_at", "is", null),
    supabase
      .from("card_item")
      .select("status")
      .eq("org_id", orgId)
      .eq("scan_wave_id", currentWaveId)
      .eq("analysis_version", "ai-foto-analysis-v1"),
  ]);

  const applications =
    applicationsResult.error || !applicationsResult.data
      ? []
      : applicationsResult.data;
  if (applicationsResult.error) throw new Error(applicationsResult.error.message);
  const cardItemCounts = countAiFotoCardItemStatuses(
    cardItemsResult.error || !cardItemsResult.data
      ? []
      : (cardItemsResult.data as { status: string | null }[]),
  );
  const visibleSignals = (signals: AiFotoCardSignal[]) => signals.filter((signal) => signal.count >= minCellSize);
  const valueSignals = visibleSignals(toSignals(
    countValues(
      applications.flatMap((row) =>
        extractCodes(row.survey_application_value_type, "value_type_code"),
      ),
    ),
    valueTypeOptions,
  ));
  const valueBeneficiaries = visibleSignals(toSignals(
    countValues(applications.map((row) => row.beneficiary_code)),
    valueBeneficiaryOptions,
  ));
  const conditionSignals = visibleSignals(toSignals(
    countValues(
      applications.flatMap((row) =>
        extractCodes(row.survey_application_condition_need, "condition_need_code"),
      ),
    ),
    conditionNeedOptions,
  ));
  const nearMissSignals = visibleSignals(toSignals(
    countValues(
      applications.flatMap((row) =>
        extractCodes(row.survey_application_near_miss_signal, "near_miss_signal_code"),
      ),
    ).filter(([code]) => code !== "none" && code !== "prefer_not_to_answer"),
    nearMissSignalOptions,
  ));
  const outputDestinations = visibleSignals(toSignals(
    countValues(applications.map((row) => row.output_destination_code)),
    outputDestinationOptions,
  ));
  const skillSignals = visibleSignals(buildSkillSignals(applications));
  const topApplications = getSupportedAiFotoPatterns(applications.map(toAiFotoApplicationPreview), minCellSize)
    .map((pattern) => ({ ...pattern, id: JSON.stringify(pattern) }))
    .sort((a, b) => attentionRank(b.attentionLevel) - attentionRank(a.attentionLevel))
    .slice(0, 6);
  const attentionSignals = [
    ...conditionSignals,
    ...nearMissSignals,
    ...toSignals(
      countValues(
        applications
          .filter((row) =>
            [
              "automatic_processing",
              "usually_no_check",
              "important_parts_check",
            ].includes(row.output_control_code ?? ""),
          )
          .map((row) => row.output_control_code),
      ),
      outputControlOptions,
    ),
    ...toSignals(
      countValues(
        applications
          .filter((row) =>
            ["important_decision", "employees_or_candidates"].includes(
              row.people_impact_code ?? "",
            ),
          )
          .map((row) => row.people_impact_code),
      ),
      peopleImpactOptions,
    ),
    ...toSignals(
      countValues(
        applications
          .filter((row) =>
            ["not_visible", "unknown"].includes(row.ai_visibility_code ?? ""),
          )
          .map((row) => row.ai_visibility_code),
      ),
      aiVisibilityOptions,
    ),
    ...toSignals(
      countValues(
        applications
          .filter((row) =>
            ["no_owner_visible", "not_clear", "unknown"].includes(
              row.escalation_route_awareness_code ?? "",
            ),
          )
          .map((row) => row.escalation_route_awareness_code),
      ),
      escalationRouteAwarenessOptions,
    ),
  ]
    .filter((signal) => signal.count >= minCellSize)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    applicationCount: applications.length,
    attentionSignals,
    cardItemCounts,
    completedRuns: completedRunsResult.error
      ? 0
      : (completedRunsResult.count ?? 0),
    decisionPoints: buildAiFotoDecisionPoints(
      valueSignals,
      attentionSignals,
      skillSignals,
      topApplications,
    ),
    outputDestinations,
    routeItems: buildAiFotoRouteItems(
      valueSignals,
      attentionSignals,
      skillSignals,
      topApplications,
    ),
    skillSignals,
    topApplications,
    valueBeneficiaries,
    valueSignals,
  };
}

export async function getAiFotoWorkbenchData(
  orgId: string,
  statusFilter: AiFotoCardItemStatus | "all" = "all",
): Promise<AiFotoWorkbenchData> {
  const supabase = await createClient();
  const cardItemsQuery = supabase
    .from("card_item")
    .select(
      `
        id,
        scan_wave_id,
        card_type,
        source_kind,
        cluster_key,
        title,
        observation,
        respondent_count,
        evidence_level,
        evidence_refs,
        interpretation,
        open_questions,
        precaution,
        follow_up_direction,
        proposed_owner_role,
        review_date,
        status,
        analysis_version,
        approved_at,
        created_at,
        updated_at
      `,
    )
    .eq("org_id", orgId)
    .eq("analysis_version", "ai-foto-analysis-v1")
    .order("card_type", { ascending: true })
    .order("updated_at", { ascending: false });

  if (statusFilter !== "all") {
    cardItemsQuery.eq("status", statusFilter);
  }

  const [
    cardItemsResult,
    approvedItemsResult,
    organizationResult,
    waveResult,
    exportResult,
  ] = await Promise.all([
    cardItemsQuery.returns<AiFotoCardItemRow[]>(),
    supabase
      .from("card_item")
      .select(
        `
          id,
          scan_wave_id,
          card_type,
          source_kind,
          cluster_key,
          title,
          observation,
          respondent_count,
          evidence_level,
          evidence_refs,
          interpretation,
          open_questions,
          precaution,
          follow_up_direction,
          proposed_owner_role,
          review_date,
          status,
          analysis_version,
          approved_at,
          created_at,
          updated_at
        `,
      )
      .eq("org_id", orgId)
      .eq("analysis_version", "ai-foto-analysis-v1")
      .eq("status", "approved")
      .order("card_type", { ascending: true })
      .order("updated_at", { ascending: false })
      .returns<AiFotoCardItemRow[]>(),
    supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    supabase
      .from("scan_wave")
      .select("id, name, method_version")
      .eq("org_id", orgId)
      .eq("product_code", "ai_foto")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("report_exports")
      .select("id, export_status, created_at")
      .eq("org_id", orgId)
      .eq("export_type", "ai_foto_pdf")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  for (const result of [cardItemsResult, approvedItemsResult, waveResult, organizationResult, exportResult]) {
    if (result.error) throw new Error(result.error.message);
  }
  const scanWaveId = waveResult.error ? null : (waveResult.data?.id ?? null);
  const minCellResult = await getMinCellSizeQuery(orgId);
  if (minCellResult.error) throw new Error(minCellResult.error.message);
  const minCellSize = Math.max(5, getMinCellSize(minCellResult));
  const inCurrentWave = (item: AiFotoCardItemRow) => item.scan_wave_id === scanWaveId && (item.respondent_count ?? 0) >= minCellSize;
  const cardItems = (cardItemsResult.data ?? []).filter(inCurrentWave);
  const approvedItems = (approvedItemsResult.data ?? []).filter(inCurrentWave);
  const methodVersion = waveResult.error
    ? "ai-foto-scan-v1"
    : (waveResult.data?.method_version ?? "ai-foto-scan-v1");
  const organizationName = organizationResult.error
    ? "Onbekende organisatie"
    : (organizationResult.data?.name ?? "Onbekende organisatie");
  const readiness =
    approvedItems.length === 0
      ? "no_approved_items"
      : !scanWaveId || !methodVersion || new Set(approvedItems.map((item) => item.card_type)).size !== 3
        ? "incomplete_metadata"
        : "ready";

  return {
    cardItems,
    exportPreview: {
      approvedItems,
      latestExport:
        exportResult.error || !exportResult.data
          ? null
          : {
              created_at: exportResult.data.created_at ?? null,
              export_status: exportResult.data.export_status ?? "unknown",
              id: exportResult.data.id,
            },
      methodVersion,
      organizationName,
      readiness,
      scanWaveId,
      scanWaveName: waveResult.error
        ? "AI-Foto scanronde"
        : (waveResult.data?.name ?? "AI-Foto scanronde"),
      selectedItemIds: approvedItems.map((item) => item.id),
    },
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
    profile?.department_code || "Organisatiebreed";
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

function toSignals(
  entries: [string, number][],
  options: { code: string; label: string }[],
): AiFotoCardSignal[] {
  return entries
    .filter(([code]) => code !== "onbekend")
    .map(([code, count]) => ({
      code,
      count,
      label: getOptionLabel(options, code),
    }))
    .sort((a, b) => b.count - a.count);
}

function countAiFotoCardItemStatuses(rows: { status: string | null }[]) {
  const counts = rows.reduce(
    (acc, row) => {
      const status = row.status ?? "draft";

      if (status === "approved") acc.approved += 1;
      else if (status === "ai_suggested") acc.aiSuggested += 1;
      else if (status === "consultant_reviewed") acc.consultantReviewed += 1;
      else acc.draft += 1;

      acc.total += 1;
      return acc;
    },
    {
      approved: 0,
      aiSuggested: 0,
      consultantReviewed: 0,
      draft: 0,
      total: 0,
    },
  );

  return counts;
}

function buildSkillSignals(rows: AiFotoApplicationRow[]): AiFotoCardSignal[] {
  const explicitResponses = rows.flatMap((row) =>
    (row.survey_application_skill_response ?? [])
      .filter((item) =>
        ["partial_action", "risky_action", "does_not_know"].includes(
          item.skill_response_code ?? "",
        ),
      )
      .map((item) => item.skill_domain_code),
  );
  const inferredSignals = rows.flatMap((row) => {
    const conditionCodes = extractCodes(
      row.survey_application_condition_need,
      "condition_need_code",
    );
    const nearMissCodes = extractCodes(
      row.survey_application_near_miss_signal,
      "near_miss_signal_code",
    );
    const dataCodes = extractCodes(row.survey_application_data_type, "data_type_code");
    const signals: string[] = [];

    if (
      dataCodes.some(
        (code) => !["none", "unsure", "public_information"].includes(code),
      ) ||
      conditionCodes.includes("clear_data_rules")
    ) {
      signals.push("data_use");
    }

    if (
      ["important_parts_check", "usually_no_check", "automatic_processing"].includes(
        row.output_control_code ?? "",
      ) ||
      conditionCodes.includes("better_output_control")
    ) {
      signals.push("output_check");
    }

    if (
      nearMissCodes.some((code) =>
        ["incorrect_or_invented", "biased_or_unwanted", "output_almost_used_wrongly"].includes(
          code,
        ),
      )
    ) {
      signals.push("hallucination_bias");
    }

    if (
      ["not_visible", "unknown"].includes(row.ai_visibility_code ?? "") ||
      ["no", "sometimes", "unknown_relevance"].includes(row.transparency_code ?? "") ||
      conditionCodes.includes("transparency_agreements")
    ) {
      signals.push("transparency");
    }

    return signals;
  });

  return toSignals(
    countValues([...explicitResponses, ...inferredSignals]),
    skillDomainOptions,
  );
}

function toAiFotoApplicationPreview(
  row: AiFotoApplicationRow,
): AiFotoApplicationPreview {
  const valueLabels = extractCodes(
    row.survey_application_value_type,
    "value_type_code",
  ).map((code) => getOptionLabel(valueTypeOptions, code)).sort();
  const conditionLabels = extractCodes(
    row.survey_application_condition_need,
    "condition_need_code",
  ).map((code) => getOptionLabel(conditionNeedOptions, code)).sort();
  const dataLabels = extractCodes(
    row.survey_application_data_type,
    "data_type_code",
  ).map((code) => getOptionLabel(dataTypeOptions, code)).sort();

  return {
    attentionLevel: deriveAiFotoAttentionLevel({
      accountEnvironmentCode: row.account_environment_code,
      aiVisibilityCode: row.ai_visibility_code,
      controlReworkCode: row.control_rework_code,
      escalationRouteAwarenessCode: row.escalation_route_awareness_code,
      nearMissSignalCodes: extractCodes(
        row.survey_application_near_miss_signal,
        "near_miss_signal_code",
      ),
      outputControlCode: row.output_control_code,
      peopleImpactCode: row.people_impact_code,
      transparencyCode: row.transparency_code,
    }),
    conditionLabels,
    dataLabels,
    id: "aggregate",
    netEffectLabel: getOptionLabel(netEffectOptions, row.net_effect_code),
    outputDestinationLabel: getOptionLabel(
      outputDestinationOptions,
      row.output_destination_code,
    ),
    peopleImpactLabel: getOptionLabel(peopleImpactOptions, row.people_impact_code),
    taskDescription: "Geaggregeerd patroon uit afgeronde primaire praktijkvoorbeelden; individuele beschrijvingen worden niet getoond.",
    toolName: row.survey_tool?.tool_name ?? "Onbekende tool",
    useCaseLabel: getOptionLabel(
      useCaseOptions,
      row.survey_tool_use_case?.use_case_code,
    ),
    valueLabels,
  };
}

function buildAiFotoDecisionPoints(
  valueSignals: AiFotoCardSignal[],
  attentionSignals: AiFotoCardSignal[],
  skillSignals: AiFotoCardSignal[],
  applications: AiFotoApplicationPreview[],
) {
  const points: string[] = [];
  const strongestValue = valueSignals[0];
  const strongestAttention = attentionSignals[0];
  const strongestSkill = skillSignals[0];
  const topApplication = applications[0];

  if (strongestValue) {
    points.push(
      `Waar standaardiseren we toepassingen met duidelijke waarde rond ${strongestValue.label.toLowerCase()}?`,
    );
  }

  if (strongestAttention) {
    points.push(
      `Welke randvoorwaarde pakken we eerst op: ${strongestAttention.label.toLowerCase()}?`,
    );
  }

  if (topApplication) {
    points.push(
      `Is ${topApplication.toolName} geschikt als kandidaat voor een beheerde werkwijze of zakelijke licentie?`,
    );
  }

  if (strongestSkill) {
    points.push(
      `Welke korte vaardigheidsinterventie is nodig rond ${strongestSkill.label.toLowerCase()}?`,
    );
  }

  points.push(
    "Welke signalen vragen specialistische beoordeling voordat ze als beleid worden vastgelegd?",
  );

  return points.slice(0, 5);
}

function buildAiFotoRouteItems(
  valueSignals: AiFotoCardSignal[],
  attentionSignals: AiFotoCardSignal[],
  skillSignals: AiFotoCardSignal[],
  applications: AiFotoApplicationPreview[],
): AiFotoPreviewSummary["routeItems"] {
  const topValue = valueSignals[0]?.label ?? "zichtbare waardesignalen";
  const topAttention =
    attentionSignals[0]?.label ?? "gegevensregels, controle en eigenaarschap";
  const topSkill = skillSignals[0]?.label ?? "veilig gegevensgebruik";
  const topTool = applications[0]?.toolName ?? "de meest genoemde kandidaat-tool";

  return [
    {
      horizon: "30",
      items: [
        `Valideer de top-3 concrete toepassingen en hun eigenaar.`,
        `Leg randvoorwaarde "${topAttention}" vast als eerste besluitpunt.`,
        `Markeer juridische of specialistische signalen als review, niet als conclusie.`,
      ],
      title: "Ordenen en duiden",
    },
    {
      horizon: "60",
      items: [
        `Werk een beheerde werkwijze uit voor ${topTool}.`,
        `Ontwerp korte ondersteuning rond ${topSkill.toLowerCase()}.`,
        `Bundel toepassingen met waarde rond ${topValue.toLowerCase()} tot kandidaat-pilots.`,
      ],
      title: "Pilot en randvoorwaarden",
    },
    {
      horizon: "90",
      items: [
        "Beslis welke toepassingen naar beleid, training of toolbeheer gaan.",
        "Maak meetpunten voor herhaalmeting en effect op de drie kaarten.",
        "Vertaal geaccepteerde toepassingen naar kandidaat-AI-inventaris.",
      ],
      title: "Besluiten en borgen",
    },
  ];
}

function attentionRank(level: AiFotoApplicationPreview["attentionLevel"]) {
  return { basis: 0, middel: 1, hoog: 2 }[level];
}

function extractCodes<K extends string>(
  rows: Array<Record<K, string | null>> | null,
  key: K,
) {
  return (rows ?? [])
    .map((row) => row[key])
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function getOptionLabel(
  options: { code: string; label: string }[],
  code: string | null | undefined,
) {
  if (!code) return "Onbekend";
  return options.find((option) => option.code === code)?.label ?? formatCode(code);
}
