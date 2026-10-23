export type AiFotoAttentionLevel = "basis" | "middel" | "hoog";

export type AiFotoCardType = "aandacht" | "vaardigheid" | "waarde";

export type AiFotoEvidenceLevel = "aangetoond" | "aannemelijk" | "gesteld";

export type AiFotoSourceKind =
  | "application_cluster"
  | "derived_signal"
  | "run_aggregate";

export type AiFotoCardItemStatus =
  | "ai_suggested"
  | "approved"
  | "consultant_reviewed"
  | "draft";

export type AiFotoApplicationSignalInput = {
  accountEnvironmentCode?: string | null;
  aiVisibilityCode?: string | null;
  conditionNeedCodes?: string[];
  controlReworkCode?: string | null;
  dataTypeCodes?: string[];
  escalationRouteAwarenessCode?: string | null;
  nearMissSignalCodes?: string[];
  outputControlCode?: string | null;
  peopleImpactCode?: string | null;
  surveyApplicationId?: string;
  surveyRunId?: string;
  toolName?: string | null;
  transparencyCode?: string | null;
  useCaseCode?: string | null;
  valueEvidenceCode?: string | null;
};

export type AiFotoCardItemDraft = {
  analysisVersion: "ai-foto-analysis-v1";
  cardType: AiFotoCardType;
  clusterKey: string;
  evidenceLevel: AiFotoEvidenceLevel;
  evidenceRefs: Array<{
    field: string;
    sourceId?: string;
    value: string;
  }>;
  observation: string;
  respondentCount: number;
  sourceKind: AiFotoSourceKind;
  status: AiFotoCardItemStatus;
  title: string;
};

export type AiFotoCardItemApprovalInput = {
  analysisVersion?: string | null;
  evidenceRefs?: unknown;
  interpretation?: string | null;
  observation?: string | null;
  respondentCount?: number | null;
  title?: string | null;
  additionalText?: Array<string | null | undefined>;
};

export type AiFotoCardItemApprovalValidation = {
  blockedTerms: string[];
  missingFields: string[];
  ok: boolean;
};

export type AiFotoGeneratedCardDraftInput = {
  applications: AiFotoApplicationSignalInput[];
  cardType: AiFotoCardType;
  clusterKey: string;
  respondentCount: number;
  valueEvidenceCodes?: Array<string | null | undefined>;
};

const AI_FOTO_LEGAL_BLOCKLIST = [
  "avg-proof",
  "compliancegarantie",
  "compliant",
  "dpia verplicht",
  "gegarandeerd veilig",
  "hoog-risico systeem",
  "hoog risico systeem",
  "juridisch toegestaan",
  "verboden volgens eu ai act",
];

const HIGH_ATTENTION_NEAR_MISS_EXCLUSIONS = new Set([
  "none",
  "prefer_not_to_answer",
]);

const MEDIUM_OUTPUT_CONTROL_CODES = new Set([
  "important_parts_check",
  "usually_no_check",
]);

const HIGH_OUTPUT_CONTROL_CODES = new Set(["automatic_processing"]);

const HIGH_PEOPLE_IMPACT_CODES = new Set(["important_decision"]);

const HIGH_ACCOUNT_ENVIRONMENT_CODES = new Set(["personal_free"]);

const MEDIUM_VISIBILITY_CODES = new Set(["not_visible", "unknown"]);

const MEDIUM_TRANSPARENCY_CODES = new Set(["no", "sometimes", "unknown_relevance"]);

const MEDIUM_ESCALATION_CODES = new Set([
  "no_owner_visible",
  "not_clear",
  "unknown",
]);

const MEDIUM_REWORK_CODES = new Set(["often_rework", "substantial"]);

export function getAiFotoAttentionLevel(
  input: AiFotoApplicationSignalInput,
): AiFotoAttentionLevel {
  const nearMissCodes = input.nearMissSignalCodes ?? [];

  if (
    nearMissCodes.some((code) => !HIGH_ATTENTION_NEAR_MISS_EXCLUSIONS.has(code)) ||
    HIGH_OUTPUT_CONTROL_CODES.has(input.outputControlCode ?? "") ||
    HIGH_PEOPLE_IMPACT_CODES.has(input.peopleImpactCode ?? "") ||
    HIGH_ACCOUNT_ENVIRONMENT_CODES.has(input.accountEnvironmentCode ?? "")
  ) {
    return "hoog";
  }

  if (
    MEDIUM_OUTPUT_CONTROL_CODES.has(input.outputControlCode ?? "") ||
    MEDIUM_VISIBILITY_CODES.has(input.aiVisibilityCode ?? "") ||
    MEDIUM_TRANSPARENCY_CODES.has(input.transparencyCode ?? "") ||
    MEDIUM_ESCALATION_CODES.has(input.escalationRouteAwarenessCode ?? "") ||
    MEDIUM_REWORK_CODES.has(input.controlReworkCode ?? "")
  ) {
    return "middel";
  }

  return "basis";
}

export function getAiFotoEvidenceCeiling(
  valueEvidenceCode?: string | null,
): Exclude<AiFotoEvidenceLevel, "aangetoond"> {
  if (valueEvidenceCode === "concrete_example" || valueEvidenceCode === "measurable") {
    return "aannemelijk";
  }

  return "gesteld";
}

export function clampAiFotoEvidenceLevel(
  requestedLevel: AiFotoEvidenceLevel,
  valueEvidenceCode?: string | null,
  allowTriangulatedEvidence = false,
): AiFotoEvidenceLevel {
  if (requestedLevel === "aangetoond") {
    return allowTriangulatedEvidence ? "aangetoond" : getAiFotoEvidenceCeiling(valueEvidenceCode);
  }

  const ceiling = getAiFotoEvidenceCeiling(valueEvidenceCode);

  if (requestedLevel === "aannemelijk" && ceiling === "gesteld") {
    return "gesteld";
  }

  return requestedLevel;
}

export function getAiFotoClusterKey(input: {
  segmentCode?: string | null;
  segmentCount?: number;
  minCellSize?: number;
  toolName?: string | null;
  useCaseCode?: string | null;
}) {
  const tool = normalizeClusterPart(input.toolName ?? "onbekende_tool");
  const useCase = normalizeClusterPart(input.useCaseCode ?? "onbekende_toepassing");
  const minCellSize = input.minCellSize ?? 5;
  const segment =
    input.segmentCode && (input.segmentCount ?? 0) >= minCellSize
      ? normalizeClusterPart(input.segmentCode)
      : null;

  return [tool, useCase, segment].filter(Boolean).join("|");
}

export function buildAiFotoAttentionCardDraft(
  input: AiFotoApplicationSignalInput,
): AiFotoCardItemDraft {
  const attentionLevel = getAiFotoAttentionLevel(input);
  const evidenceRefs = collectEvidenceRefs(input, [
    "accountEnvironmentCode",
    "aiVisibilityCode",
    "controlReworkCode",
    "escalationRouteAwarenessCode",
    "outputControlCode",
    "peopleImpactCode",
    "transparencyCode",
  ]);

  return {
    analysisVersion: "ai-foto-analysis-v1",
    cardType: "aandacht",
    clusterKey: getAiFotoClusterKey(input),
    evidenceLevel: "gesteld",
    evidenceRefs,
    observation: `Aandachtsniveau ${attentionLevel} op basis van gestructureerde AI-Foto signalen.`,
    respondentCount: 1,
    sourceKind: "application_cluster",
    status: "draft",
    title: `Aandacht ${attentionLevel}`,
  };
}

export function buildAiFotoGeneratedCardDraft(
  input: AiFotoGeneratedCardDraftInput,
): AiFotoCardItemDraft {
  const evidenceRefs = input.applications.flatMap((application) =>
    collectEvidenceRefs(application, getEvidenceFieldsForCardType(input.cardType)),
  );
  const evidenceLevel = input.valueEvidenceCodes?.some((code) =>
    ["concrete_example", "measurable"].includes(code ?? ""),
  )
    ? "aannemelijk"
    : "gesteld";

  return {
    analysisVersion: "ai-foto-analysis-v1",
    cardType: input.cardType,
    clusterKey: input.clusterKey,
    evidenceLevel,
    evidenceRefs,
    observation: getDefaultObservation(input.cardType, input.respondentCount),
    respondentCount: input.respondentCount,
    sourceKind: "application_cluster",
    status: "draft",
    title: getDefaultTitle(input.cardType),
  };
}

export function validateAiFotoCardItemApproval(
  input: AiFotoCardItemApprovalInput,
): AiFotoCardItemApprovalValidation {
  const missingFields: string[] = [];

  if (!input.title?.trim()) missingFields.push("title");
  if (!input.observation?.trim()) missingFields.push("observation");
  if (!input.interpretation?.trim()) missingFields.push("interpretation");
  if (!input.analysisVersion?.trim()) missingFields.push("analysis_version");
  if (!input.respondentCount || input.respondentCount < 1) {
    missingFields.push("respondent_count");
  }
  if (!hasEvidenceRefs(input.evidenceRefs)) {
    missingFields.push("evidence_refs");
  }

  const blockedTerms = findAiFotoLegalBlockedTerms([
    input.title,
    input.observation,
    input.interpretation,
    ...(input.additionalText ?? []),
  ]);

  return {
    blockedTerms,
    missingFields,
    ok: missingFields.length === 0 && blockedTerms.length === 0,
  };
}

export function findAiFotoLegalBlockedTerms(values: Array<string | null | undefined>) {
  const normalized = values
    .filter((value): value is string => Boolean(value))
    .join("\n")
    .toLowerCase();

  return AI_FOTO_LEGAL_BLOCKLIST.filter((term) => normalized.includes(term));
}

function collectEvidenceRefs(
  input: AiFotoApplicationSignalInput,
  fields: Array<keyof AiFotoApplicationSignalInput>,
) {
  return fields.flatMap((field) => {
    const value = input[field];

    if (Array.isArray(value)) {
      return value.map((item) => ({
        field,
        sourceId: input.surveyApplicationId,
        value: item,
      }));
    }

    if (typeof value === "string" && value.length > 0) {
      return [
        {
          field,
          sourceId: input.surveyApplicationId,
          value,
        },
      ];
    }

    return [];
  });
}

function getEvidenceFieldsForCardType(
  cardType: AiFotoCardType,
): Array<keyof AiFotoApplicationSignalInput> {
  if (cardType === "waarde") {
    return ["controlReworkCode", "valueEvidenceCode"];
  }

  if (cardType === "vaardigheid") {
    return [
      "aiVisibilityCode",
      "dataTypeCodes",
      "escalationRouteAwarenessCode",
      "nearMissSignalCodes",
      "outputControlCode",
      "transparencyCode",
    ];
  }

  return [
    "accountEnvironmentCode",
    "aiVisibilityCode",
    "conditionNeedCodes",
    "controlReworkCode",
    "dataTypeCodes",
    "escalationRouteAwarenessCode",
    "nearMissSignalCodes",
    "outputControlCode",
    "peopleImpactCode",
    "transparencyCode",
  ];
}

function getDefaultTitle(cardType: AiFotoCardType) {
  return {
    aandacht: "Aandachtspunt uit AI-Foto signalen",
    vaardigheid: "Vaardigheidssignaal uit AI-Foto signalen",
    waarde: "Waardesignaal uit AI-Foto signalen",
  }[cardType];
}

function getDefaultObservation(cardType: AiFotoCardType, respondentCount: number) {
  const noun = {
    aandacht: "aandachtspatronen",
    vaardigheid: "vaardigheidssignalen",
    waarde: "waardesignalen",
  }[cardType];

  return `${respondentCount} respondenten tonen ${noun} in gestructureerde AI-Foto antwoorden.`;
}

function hasEvidenceRefs(value: unknown) {
  return Array.isArray(value) && value.length > 0 && value.every((ref) =>
    typeof ref === "object" && ref !== null &&
    typeof ref.field === "string" && ref.field.trim().length > 0 &&
    typeof ref.value === "string" && ref.value.trim().length > 0,
  );
}

/** Multiple applications from one run must never satisfy a privacy threshold. */
export function countAiFotoRespondents(
  applications: Array<Pick<AiFotoApplicationSignalInput, "surveyRunId">>,
) {
  return new Set(applications.map((row) => row.surveyRunId).filter(Boolean)).size;
}

/** Only repeated, identical structured patterns are suitable for a preview.
 * Callers must omit respondent identifiers and free text before grouping.
 */
export function getSupportedAiFotoPatterns<T>(patterns: T[], minCellSize: number): T[] {
  const groups = new Map<string, { count: number; pattern: T }>();
  for (const pattern of patterns) {
    const key = JSON.stringify(pattern);
    const group = groups.get(key) ?? { count: 0, pattern };
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((group) => group.count >= Math.max(5, minCellSize))
    .map((group) => group.pattern);
}

function normalizeClusterPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
