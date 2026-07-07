import assert from "node:assert/strict";
import test from "node:test";
import { aggregateRiskResults, calculateRiskScore } from "../src/risk-engine.js";

test("approved tools keep shadow at zero while sensitive data still triggers review", () => {
  const result = calculateRiskScore({
    accountTypeCode: "business_license",
    dataTypeCodes: ["special_personal_data"],
    frequencyCode: "weekly",
    orgPolicyStatusCode: "approved",
    useCaseCode: "drafting",
  });

  assert.equal(result.shadowScore, 0);
  assert.equal(result.exposureScore, 46);
  assert.equal(result.priorityScore, 21);
  assert.deepEqual(result.reviewTriggerCodes, ["special_category_data"]);
});

test("prohibited high-exposure use receives toxic boost and critical review", () => {
  const result = calculateRiskScore({
    accountTypeCode: "personal_free",
    automationUsageCode: "agents_reeks_taken",
    browserExtensionUsageCode: "ja_onzeker",
    contextCodes: ["hr_evaluatie"],
    dataTypeCodes: ["special_personal_data"],
    frequencyCode: "daily",
    orgPolicyStatusCode: "prohibited",
    useCaseCode: "systemen_aansturen",
  });

  assert.equal(result.shadowScore, 80);
  assert.equal(result.exposureScore, 100);
  assert.equal(result.priorityScore, 100);
  assert.equal(result.riskBand, "critical");
  assert.deepEqual(result.reviewTriggerCodes, [
    "prohibited_tool",
    "agentic_usage",
    "automation_unmanaged",
    "extension_unmanaged",
    "special_category_data",
    "hr_evaluation_context",
    "priority_threshold",
  ]);
});

test("unknown or missing policy status is scoreable as newly discovered", () => {
  const result = calculateRiskScore({
    accountTypeCode: "personal_paid",
    dataTypeCodes: ["customer_data"],
    frequencyCode: "weekly",
    orgPolicyStatusCode: null,
    useCaseCode: "drafting",
  });

  assert.equal(result.shadowScore, 20);
  assert.equal(result.exposureScore, 40);
  assert.equal(result.priorityScore, 27);
  assert.equal(result.riskBand, "elevated");
  assert.deepEqual(result.reviewTriggerCodes, []);
});

test("context multiplier and agentic boost contribute to exposure", () => {
  const result = calculateRiskScore({
    accountTypeCode: "personal_free",
    automationUsageCode: "agents_reeks_taken",
    browserExtensionUsageCode: "nee",
    contextCodes: ["kritieke_systemen"],
    dataTypeCodes: ["public_information"],
    frequencyCode: "never",
    orgPolicyStatusCode: "newly_discovered",
    useCaseCode: "code_schrijven",
  });

  assert.equal(result.shadowScore, 20);
  assert.equal(result.exposureScore, 91);
  assert.equal(result.priorityScore, 50);
  assert.equal(result.riskBand, "high");
  assert.deepEqual(result.reviewTriggerCodes, [
    "agentic_usage",
    "automation_unmanaged",
    "priority_threshold",
  ]);
});

test("highest context multiplier is used when multiple contexts are selected", () => {
  const result = calculateRiskScore({
    accountTypeCode: "business_license",
    contextCodes: ["intern_gebruik", "besluiten_over_personen"],
    dataTypeCodes: ["public_information"],
    frequencyCode: "never",
    orgPolicyStatusCode: "approved",
    useCaseCode: "data_analyseren",
  });

  assert.equal(result.exposureScore, 38);
  assert.equal(result.priorityScore, 17);
  assert.deepEqual(result.reviewTriggerCodes, []);
});

test("hr evaluation context keeps its hard review trigger separate from scoring weight", () => {
  const result = calculateRiskScore({
    accountTypeCode: "business_license",
    contextCodes: ["hr_evaluatie"],
    dataTypeCodes: ["public_information"],
    frequencyCode: "never",
    orgPolicyStatusCode: "approved",
    priorityReviewThreshold: 99,
    useCaseCode: "drafting",
  });

  assert.equal(result.exposureScore, 14);
  assert.deepEqual(result.reviewTriggerCodes, ["hr_evaluation_context"]);
});

test("no-tool exit path aggregates to standard zero-risk output", () => {
  const aggregate = aggregateRiskResults([]);

  assert.deepEqual(aggregate, {
    dpoReviewRequired: false,
    highestPriorityScore: 0,
    personScore: 0,
    reviewClass: "standard",
    reviewTriggerCodes: [],
    riskBand: "low",
    toolCount: 0,
  });
});

test("run aggregation uses highest priority plus dampened additional tools", () => {
  const low = calculateRiskScore({
    accountTypeCode: "business_license",
    dataTypeCodes: ["public_information"],
    frequencyCode: "monthly",
    orgPolicyStatusCode: "approved",
    useCaseCode: "brainstormen",
  });
  const priority = calculateRiskScore({
    accountTypeCode: "personal_free",
    automationUsageCode: "gekoppeld_apps",
    dataTypeCodes: ["customer_data"],
    frequencyCode: "daily",
    orgPolicyStatusCode: "restricted",
    useCaseCode: "automatisering",
  });
  const aggregate = aggregateRiskResults([low, priority]);

  assert.equal(low.priorityScore, 5);
  assert.equal(priority.priorityScore, 60);
  assert.equal(aggregate.highestPriorityScore, 60);
  assert.equal(aggregate.personScore, 61);
  assert.equal(aggregate.reviewClass, "priority_review");
  assert.equal(aggregate.riskBand, "high");
  assert.deepEqual(aggregate.reviewTriggerCodes, [
    "automation_unmanaged",
    "priority_threshold",
  ]);
});
