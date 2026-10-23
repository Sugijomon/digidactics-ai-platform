import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateSupportedPatterns,
  countAiFotoRespondents,
  getSupportedAiFotoPatterns,
  buildAiFotoAttentionCardDraft,
  buildAiFotoGeneratedCardDraft,
  clampAiFotoEvidenceLevel,
  findAiFotoLegalBlockedTerms,
  getAiFotoAttentionLevel,
  getAiFotoClusterKey,
  getAiFotoEvidenceCeiling,
  validateAiFotoCardItemApproval,
} from "../src/ai-foto-analysis.js";

test("reporting suppresses small exact patterns and duplicate respondent contributions", () => {
  const common = { department: "A", tool: "ChatGPT", score: 39 };
  const rows = Array.from({ length: 5 }, (_, index) => ({ respondentId: String(index), pattern: common }));
  const rare = { ...common, department: "B" };
  assert.deepEqual(aggregateSupportedPatterns([...rows, ...rows, { respondentId: "0", pattern: rare }], 5), [{ pattern: common, respondentCount: 5 }]);
  assert.deepEqual(aggregateSupportedPatterns(Array(10).fill(rows[0]), 5), []);
  assert.deepEqual(aggregateSupportedPatterns(rows, 6), []);
});

test("AI-Foto privacy counts unique respondents, not primary and secondary applications", () => {
  assert.equal(countAiFotoRespondents([
    { surveyRunId: "one" }, { surveyRunId: "one" }, { surveyRunId: "two" }, {},
  ]), 2);
});

test("AI-Foto preview suppresses rare combinations even when individual fields are common", () => {
  const common = { tool: "A", data: "public", output: "internal" };
  const rare = { tool: "A", data: "sensitive", output: "internal" };
  assert.deepEqual(getSupportedAiFotoPatterns([...Array(5).fill(common), ...Array(4).fill(rare)], 5), [common]);
  assert.deepEqual(getSupportedAiFotoPatterns(Array(5).fill(common), 6), []);
});

test("AI-Foto approval rejects malformed evidence and legal claims in follow-up text", () => {
  const input = { title: "Titel", observation: "Observatie", interpretation: "Duiding", analysisVersion: "v1", respondentCount: 5 };
  assert.equal(validateAiFotoCardItemApproval({ ...input, evidenceRefs: [null] }).ok, false);
  assert.equal(validateAiFotoCardItemApproval({ ...input, evidenceRefs: [{ field: "x", value: "y" }], additionalText: ["Dit is compliant"] }).ok, false);
});

test("AI-Foto attention stays basis for controlled business use", () => {
  const level = getAiFotoAttentionLevel({
    accountEnvironmentCode: "business_license",
    aiVisibilityCode: "visible_to_recipient",
    controlReworkCode: "little",
    escalationRouteAwarenessCode: "clear",
    outputControlCode: "full_manual_check",
    peopleImpactCode: "none_visible",
    transparencyCode: "yes",
  });

  assert.equal(level, "basis");
});

test("AI-Foto attention becomes medium for limited visibility or rework", () => {
  assert.equal(
    getAiFotoAttentionLevel({
      aiVisibilityCode: "not_visible",
      outputControlCode: "full_manual_check",
      peopleImpactCode: "none_visible",
    }),
    "middel",
  );

  assert.equal(
    getAiFotoAttentionLevel({
      controlReworkCode: "substantial",
      outputControlCode: "full_manual_check",
      peopleImpactCode: "none_visible",
    }),
    "middel",
  );
});

test("AI-Foto attention becomes high for near misses, automatic processing, or important decisions", () => {
  assert.equal(
    getAiFotoAttentionLevel({
      nearMissSignalCodes: ["incorrect_or_invented"],
    }),
    "hoog",
  );

  assert.equal(
    getAiFotoAttentionLevel({
      outputControlCode: "automatic_processing",
    }),
    "hoog",
  );

  assert.equal(
    getAiFotoAttentionLevel({
      peopleImpactCode: "important_decision",
    }),
    "hoog",
  );
});

test("AI-Foto survey evidence cannot become proven automatically", () => {
  assert.equal(getAiFotoEvidenceCeiling("feeling_estimate"), "gesteld");
  assert.equal(getAiFotoEvidenceCeiling("concrete_example"), "aannemelijk");
  assert.equal(getAiFotoEvidenceCeiling("measurable"), "aannemelijk");

  assert.equal(
    clampAiFotoEvidenceLevel("aangetoond", "measurable"),
    "aannemelijk",
  );
  assert.equal(
    clampAiFotoEvidenceLevel("aangetoond", "measurable", true),
    "aangetoond",
  );
  assert.equal(
    clampAiFotoEvidenceLevel("aannemelijk", "feeling_estimate"),
    "gesteld",
  );
});

test("AI-Foto cluster key suppresses small segments", () => {
  assert.equal(
    getAiFotoClusterKey({
      minCellSize: 5,
      segmentCode: "hr_recruitment",
      segmentCount: 4,
      toolName: "Microsoft Copilot",
      useCaseCode: "samenvatten_redigeren",
    }),
    "microsoft_copilot|samenvatten_redigeren",
  );

  assert.equal(
    getAiFotoClusterKey({
      minCellSize: 5,
      segmentCode: "hr_recruitment",
      segmentCount: 5,
      toolName: "Microsoft Copilot",
      useCaseCode: "samenvatten_redigeren",
    }),
    "microsoft_copilot|samenvatten_redigeren|hr_recruitment",
  );
});

test("AI-Foto attention card draft keeps evidence refs structured", () => {
  const draft = buildAiFotoAttentionCardDraft({
    aiVisibilityCode: "unknown",
    outputControlCode: "usually_no_check",
    surveyApplicationId: "application-1",
    toolName: "ChatGPT",
    useCaseCode: "drafting",
  });

  assert.equal(draft.analysisVersion, "ai-foto-analysis-v1");
  assert.equal(draft.cardType, "aandacht");
  assert.equal(draft.clusterKey, "chatgpt|drafting");
  assert.equal(draft.evidenceLevel, "gesteld");
  assert.equal(draft.status, "draft");
  assert.deepEqual(
    draft.evidenceRefs.map((ref) => [ref.field, ref.value, ref.sourceId]),
    [
      ["aiVisibilityCode", "unknown", "application-1"],
      ["outputControlCode", "usually_no_check", "application-1"],
    ],
  );
});

test("AI-Foto generated card draft is deterministic and evidence-capped", () => {
  const draft = buildAiFotoGeneratedCardDraft({
    applications: [
      {
        outputControlCode: "usually_no_check",
        surveyApplicationId: "application-1",
        valueEvidenceCode: "measurable",
      },
      {
        outputControlCode: "full_manual_check",
        surveyApplicationId: "application-2",
        valueEvidenceCode: "feeling_estimate",
      },
    ],
    cardType: "waarde",
    clusterKey: "chatgpt|drafting",
    respondentCount: 2,
    valueEvidenceCodes: ["measurable", "feeling_estimate"],
  });

  assert.equal(draft.analysisVersion, "ai-foto-analysis-v1");
  assert.equal(draft.cardType, "waarde");
  assert.equal(draft.clusterKey, "chatgpt|drafting");
  assert.equal(draft.evidenceLevel, "aannemelijk");
  assert.equal(draft.respondentCount, 2);
  assert.equal(draft.status, "draft");
  assert.deepEqual(
    draft.evidenceRefs.map((ref) => [ref.field, ref.sourceId, ref.value]),
    [
      ["valueEvidenceCode", "application-1", "measurable"],
      ["valueEvidenceCode", "application-2", "feeling_estimate"],
    ],
  );
});

test("AI-Foto approval validation requires content, evidence refs, and neutral wording", () => {
  const valid = validateAiFotoCardItemApproval({
    analysisVersion: "ai-foto-analysis-v1",
    evidenceRefs: [{ field: "outputControlCode", value: "usually_no_check" }],
    interpretation: "Er is extra uitleg nodig over controle en brongebruik.",
    observation: "5 respondenten tonen aandachtspatronen in gestructureerde antwoorden.",
    respondentCount: 5,
    title: "Aandachtspunt rond outputcontrole",
  });

  assert.equal(valid.ok, true);
  assert.deepEqual(valid.missingFields, []);
  assert.deepEqual(valid.blockedTerms, []);

  const invalid = validateAiFotoCardItemApproval({
    analysisVersion: "",
    evidenceRefs: [],
    interpretation: "Dit is AVG-proof en juridisch toegestaan.",
    observation: "",
    respondentCount: 0,
    title: "DPIA verplicht",
  });

  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.missingFields, [
    "observation",
    "analysis_version",
    "respondent_count",
    "evidence_refs",
  ]);
  assert.deepEqual(invalid.blockedTerms, [
    "avg-proof",
    "dpia verplicht",
    "juridisch toegestaan",
  ]);
});

test("AI-Foto legal blocklist catches compliance guarantees", () => {
  assert.deepEqual(
    findAiFotoLegalBlockedTerms([
      "Deze toepassing is compliant en gegarandeerd veilig.",
      "Geen probleem.",
    ]),
    ["compliant", "gegarandeerd veilig"],
  );
});
