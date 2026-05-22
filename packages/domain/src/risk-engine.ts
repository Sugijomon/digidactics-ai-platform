export type OrgPolicyStatusCode =
  | "approved"
  | "newly_discovered"
  | "under_review"
  | "restricted"
  | "prohibited";

export type UseCaseCode =
  | "teksten_schrijven"
  | "drafting"
  | "samenvatten_redigeren"
  | "brainstormen"
  | "informatie_opzoeken"
  | "vertalen"
  | "klantenservice"
  | "data_analyseren"
  | "code_schrijven"
  | "afbeeldingen_genereren"
  | "presentaties_design"
  | "automatisering"
  | "workflow_uitvoeren"
  | "systemen_aansturen"
  | string;

export type AccountTypeCode =
  | "business_license"
  | "zakelijke_licentie"
  | "personal_free"
  | "prive_gratis"
  | "personal_paid"
  | "prive_betaald"
  | "both"
  | "beide"
  | string;

export type DataTypeCode =
  | "publiek"
  | "public_information"
  | "namen"
  | "names"
  | "interne_email"
  | "internal_emails"
  | "interne_documenten"
  | "internal_documents"
  | "klantdata"
  | "customer_data"
  | "financiele_data"
  | "financial_data"
  | "gevoelig_persoonsgegeven"
  | "special_personal_data"
  | "onzeker"
  | "unsure"
  | string;

export type FrequencyCode = "daily" | "weekly" | "monthly" | "never" | string;

export type ReviewTriggerCode =
  | "prohibited_tool"
  | "agentic_usage"
  | "automation_unmanaged"
  | "extension_unmanaged"
  | "special_category_data"
  | "hr_evaluation_context"
  | "priority_threshold";

export type RiskBand = "low" | "elevated" | "high" | "critical";

export type RiskScoreInput = {
  orgPolicyStatusCode?: OrgPolicyStatusCode | null;
  useCaseCode?: UseCaseCode | null;
  accountTypeCode?: AccountTypeCode | null;
  dataTypeCodes?: DataTypeCode[];
  frequencyCode?: FrequencyCode | null;
  automationUsageCode?: string | null;
  browserExtensionUsageCode?: string | null;
  agenticUsage?: boolean;
  contextCodes?: string[];
  priorityReviewThreshold?: number;
  toxicShadowThreshold?: number;
  toxicExposureThreshold?: number;
};

export type RiskScoreResult = {
  shadowScore: number;
  exposureScore: number;
  priorityScore: number;
  riskBand: RiskBand;
  reviewTriggerCodes: ReviewTriggerCode[];
};

export type RunRiskAggregate = {
  dpoReviewRequired: boolean;
  highestPriorityScore: number;
  personScore: number;
  reviewClass: "standard" | "priority_review" | "toxic_shadow";
  reviewTriggerCodes: ReviewTriggerCode[];
  riskBand: RiskBand;
  toolCount: number;
};

const DEFAULT_PRIORITY_REVIEW_THRESHOLD = 40;
const DEFAULT_TOXIC_SHADOW_THRESHOLD = 50;
const DEFAULT_TOXIC_EXPOSURE_THRESHOLD = 50;
const TOXIC_BOOST = 20;

const SHADOW_BASE_BY_POLICY_STATUS: Record<OrgPolicyStatusCode, number> = {
  approved: 0,
  newly_discovered: 20,
  under_review: 20,
  restricted: 40,
  prohibited: 80,
};

const USE_CASE_BASE_BY_CODE: Record<string, number> = {
  teksten_schrijven: 10,
  drafting: 10,
  samenvatten_redigeren: 12,
  brainstormen: 8,
  informatie_opzoeken: 10,
  vertalen: 10,
  klantenservice: 25,
  data_analyseren: 30,
  code_schrijven: 25,
  afbeeldingen_genereren: 18,
  presentaties_design: 14,
  automatisering: 35,
  workflow_uitvoeren: 40,
  systemen_aansturen: 45,
  taken_automatisch_afhandelen: 40,
};

const ACCOUNT_MULTIPLIER_BY_CODE: Record<string, number> = {
  business_license: 0.8,
  zakelijke_licentie: 0.8,
  personal_free: 1.35,
  prive_gratis: 1.35,
  personal_paid: 1.2,
  prive_betaald: 1.2,
  both: 1.1,
  beide: 1.1,
};

const DATA_BOOST_BY_CODE: Record<string, number> = {
  publiek: 0,
  public_information: 0,
  namen: 8,
  names: 8,
  interne_email: 12,
  internal_emails: 12,
  interne_documenten: 12,
  internal_documents: 12,
  notulen: 12,
  meeting_notes: 12,
  broncode_logica: 16,
  source_code_logic: 16,
  klantdata: 20,
  customer_data: 20,
  financiele_data: 22,
  financial_data: 22,
  juridische_documenten: 22,
  legal_documents: 22,
  gevoelig_persoonsgegeven: 30,
  special_personal_data: 30,
  onzeker: 10,
  unsure: 10,
  niets: 0,
  none: 0,
};

const FREQUENCY_BOOST_BY_CODE: Record<string, number> = {
  never: 0,
  monthly: 4,
  weekly: 8,
  daily: 14,
};

export function calculateShadowScore(
  orgPolicyStatusCode?: OrgPolicyStatusCode | null,
) {
  return orgPolicyStatusCode
    ? (SHADOW_BASE_BY_POLICY_STATUS[orgPolicyStatusCode] ?? 20)
    : 20;
}

export function calculateExposureScore(input: RiskScoreInput) {
  const useCaseBase = input.useCaseCode
    ? (USE_CASE_BASE_BY_CODE[input.useCaseCode] ?? 15)
    : 10;
  const accountMultiplier = input.accountTypeCode
    ? (ACCOUNT_MULTIPLIER_BY_CODE[input.accountTypeCode] ?? 1.2)
    : 1.2;
  const dataBoost = Math.max(
    0,
    ...(input.dataTypeCodes ?? []).map((code) => DATA_BOOST_BY_CODE[code] ?? 8),
  );
  const frequencyBoost = input.frequencyCode
    ? (FREQUENCY_BOOST_BY_CODE[input.frequencyCode] ?? 6)
    : 0;
  const automationBoost = getAutomationBoost(input.automationUsageCode);
  const extensionBoost = getExtensionBoost(input.browserExtensionUsageCode);
  const agenticBoost = input.agenticUsage ? 15 : 0;

  return clampScore(
    useCaseBase * accountMultiplier +
      dataBoost +
      frequencyBoost +
      automationBoost +
      extensionBoost +
      agenticBoost,
  );
}

export function calculatePriorityScore({
  exposureScore,
  shadowScore,
  toxicBoost = 0,
  reviewBoost = 0,
}: {
  exposureScore: number;
  shadowScore: number;
  toxicBoost?: number;
  reviewBoost?: number;
}) {
  return clampScore(0.45 * shadowScore + 0.45 * exposureScore + toxicBoost + reviewBoost);
}

export function calculateRiskScore(input: RiskScoreInput): RiskScoreResult {
  const shadowScore = calculateShadowScore(input.orgPolicyStatusCode);
  const exposureScore = calculateExposureScore(input);
  const toxicBoost =
    shadowScore > (input.toxicShadowThreshold ?? DEFAULT_TOXIC_SHADOW_THRESHOLD) &&
    exposureScore > (input.toxicExposureThreshold ?? DEFAULT_TOXIC_EXPOSURE_THRESHOLD)
      ? TOXIC_BOOST
      : 0;
  const priorityScore = calculatePriorityScore({
    exposureScore,
    shadowScore,
    toxicBoost,
  });
  const reviewTriggerCodes = deriveReviewTriggers({
    ...input,
    exposureScore,
    priorityScore,
    shadowScore,
  });

  return {
    shadowScore,
    exposureScore,
    priorityScore,
    riskBand: getRiskBand(priorityScore),
    reviewTriggerCodes,
  };
}

export function aggregateRiskResults(
  toolResults: Pick<RiskScoreResult, "priorityScore" | "reviewTriggerCodes">[],
): RunRiskAggregate {
  if (toolResults.length === 0) {
    return {
      dpoReviewRequired: false,
      highestPriorityScore: 0,
      personScore: 0,
      reviewClass: "standard",
      reviewTriggerCodes: [],
      riskBand: "low",
      toolCount: 0,
    };
  }

  const sortedPriorities = toolResults
    .map((result) => result.priorityScore)
    .sort((a, b) => b - a);
  const highestPriorityScore = sortedPriorities[0] ?? 0;
  const otherPrioritySum = sortedPriorities
    .slice(1)
    .reduce((sum, score) => sum + score, 0);
  const personScore = clampScore(highestPriorityScore + 0.15 * otherPrioritySum);
  const reviewTriggerCodes = Array.from(
    new Set(toolResults.flatMap((result) => result.reviewTriggerCodes)),
  );
  const reviewClass = reviewTriggerCodes.includes("prohibited_tool") || personScore >= 75
    ? "toxic_shadow"
    : reviewTriggerCodes.length > 0
      ? "priority_review"
      : "standard";

  return {
    dpoReviewRequired: reviewClass !== "standard",
    highestPriorityScore,
    personScore,
    reviewClass,
    reviewTriggerCodes,
    riskBand: getRiskBand(personScore),
    toolCount: toolResults.length,
  };
}

export function deriveReviewTriggers(
  input: RiskScoreInput & {
    exposureScore?: number;
    priorityScore?: number;
    shadowScore?: number;
  },
): ReviewTriggerCode[] {
  const triggers = new Set<ReviewTriggerCode>();
  const shadowScore = input.shadowScore ?? calculateShadowScore(input.orgPolicyStatusCode);
  const exposureScore = input.exposureScore ?? calculateExposureScore(input);
  const priorityScore =
    input.priorityScore ?? calculatePriorityScore({ exposureScore, shadowScore });

  if (input.orgPolicyStatusCode === "prohibited") {
    triggers.add("prohibited_tool");
  }

  if (input.agenticUsage || isAgenticAutomation(input.automationUsageCode)) {
    triggers.add("agentic_usage");
  }

  if (isUnmanagedAutomation(input.automationUsageCode)) {
    triggers.add("automation_unmanaged");
  }

  if (isUnmanagedExtension(input.browserExtensionUsageCode)) {
    triggers.add("extension_unmanaged");
  }

  if ((input.dataTypeCodes ?? []).some(isSpecialCategoryData)) {
    triggers.add("special_category_data");
  }

  if ((input.contextCodes ?? []).includes("hr_evaluatie")) {
    triggers.add("hr_evaluation_context");
  }

  if (priorityScore >= (input.priorityReviewThreshold ?? DEFAULT_PRIORITY_REVIEW_THRESHOLD)) {
    triggers.add("priority_threshold");
  }

  return Array.from(triggers);
}

export function getRiskBand(priorityScore: number): RiskBand {
  if (priorityScore >= 75) return "critical";
  if (priorityScore >= 50) return "high";
  if (priorityScore >= 25) return "elevated";
  return "low";
}

function getAutomationBoost(code: string | null | undefined) {
  if (!code || code === "alleen_chatbot") return 0;
  if (code === "agents_reeks_taken") return 15;
  if (code === "gekoppeld_apps") return 12;
  return 8;
}

function getExtensionBoost(code: string | null | undefined) {
  if (!code || code === "nee") return 0;
  if (code === "ja_bewust") return 8;
  if (code === "ja_onzeker") return 10;
  return 5;
}

function isAgenticAutomation(code: string | null | undefined) {
  return code === "agents_reeks_taken";
}

function isUnmanagedAutomation(code: string | null | undefined) {
  return code === "agents_reeks_taken" || code === "gekoppeld_apps";
}

function isUnmanagedExtension(code: string | null | undefined) {
  return code === "ja_bewust" || code === "ja_onzeker";
}

function isSpecialCategoryData(code: string) {
  return code === "gevoelig_persoonsgegeven" || code === "special_personal_data";
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
