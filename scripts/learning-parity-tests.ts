import assert from "node:assert/strict";
import fs from "node:fs";
import {
  evaluateLearningCapabilityAccess,
  evaluateLearningCertificationEligibility,
  type LearningCertificationPageState,
  type LessonContent,
} from "../packages/domain/learning";

const now = "2026-05-29T12:00:00.000Z";
const requirement = {
  capability_code: "routeai_usecase_check",
  required_certification_code: "ai_literacy_foundation",
  required_course_id: "course-ai-literacy",
  required_course_code: "ai-literacy-foundation",
};

assert.deepEqual(
  evaluateLearningCapabilityAccess({ org_id: null, requirement, now }),
  {
    can_access: false,
    capability_code: "routeai_usecase_check",
    required_certification_code: null,
    certification_status: "missing_profile_org",
    required_course_id: null,
    required_course_code: null,
    certification_id: null,
    expires_at: null,
  },
  "App access gate moet SQL-status missing_profile_org spiegelen.",
);

assert.equal(
  evaluateLearningCapabilityAccess({ org_id: "org-1", requirement: null, now }).certification_status,
  "not_configured",
  "App access gate moet SQL-status not_configured spiegelen.",
);

assert.equal(
  evaluateLearningCapabilityAccess({ org_id: "org-1", requirement, certification: null, now }).certification_status,
  "missing",
  "App access gate moet SQL-status missing spiegelen.",
);

assert.equal(
  evaluateLearningCapabilityAccess({
    org_id: "org-1",
    requirement,
    now,
    certification: {
      id: "cert-1",
      certification_code: "ai_literacy_foundation",
      status: "active",
      expires_at: "2026-12-31T00:00:00.000Z",
    },
  }).can_access,
  true,
  "Actieve niet-verlopen certificering moet toegang geven.",
);

const expired = evaluateLearningCapabilityAccess({
  org_id: "org-1",
  requirement,
  now,
  certification: {
    id: "cert-2",
    certification_code: "ai_literacy_foundation",
    status: "active",
    expires_at: "2026-01-01T00:00:00.000Z",
  },
});
assert.equal(expired.can_access, false);
assert.equal(expired.certification_status, "expired");

const revoked = evaluateLearningCapabilityAccess({
  org_id: "org-1",
  requirement,
  now,
  certification: {
    id: "cert-3",
    certification_code: "ai_literacy_foundation",
    status: "revoked",
    expires_at: null,
  },
});
assert.equal(revoked.can_access, false);
assert.equal(revoked.certification_status, "revoked");

const content: LessonContent = {
  version: 1,
  blocks: [
    {
      id: "privacy",
      type: "quiz_multiple_choice",
      competency_codes: ["C4_DATA_PRIVACY"],
      evidence_kind: "quiz",
      required_for_certificate: true,
      question: "Privacy?",
      options: [
        { id: "safe", label: "Minimaliseer data" },
        { id: "unsafe", label: "Alles plakken" },
      ],
      correct_option_id: "safe",
    },
    {
      id: "oversight",
      type: "scenario",
      competency_codes: ["C6_HUMAN_OVERSIGHT"],
      evidence_kind: "scenario",
      required_for_certificate: true,
      situation: "AI adviseert een HR-besluit.",
      question: "Wat doe je?",
      choices: [
        { id: "auto", label: "Automatisch volgen", consequence: "Onveilig", is_recommended: false },
        { id: "review", label: "Menselijke review", consequence: "Veilig", is_recommended: true },
      ],
    },
    {
      id: "escalation",
      type: "short_answer",
      competency_codes: ["C8_ESCALATIE_BEWIJS"],
      evidence_kind: "assessment",
      required_for_certificate: true,
      question: "Wanneer escaleer je?",
      min_words: 15,
    },
  ],
};

const readyPages: LearningCertificationPageState[] = [
  {
    page_id: "assessment",
    is_required: true,
    content,
    is_completed: true,
    latest_attempt: {
      percentage: 100,
      passed: true,
      manual_review_required: false,
      answers: {
        privacy: { block_type: "quiz_multiple_choice", value: "safe" },
        oversight: { block_type: "scenario", value: "review" },
        escalation: { block_type: "short_answer", value: "Ik escaleer bij privacy, HR-impact of twijfel." },
      },
    },
  },
];

const ready = evaluateLearningCertificationEligibility(readyPages, 80);
assert.equal(ready.eligible, true, "Volledige evidence moet eligible zijn.");
assert.deepEqual(ready.missing_competency_codes, []);

const pending = evaluateLearningCertificationEligibility(
  [{ ...readyPages[0], latest_attempt: { ...readyPages[0].latest_attempt!, manual_review_required: true } }],
  80,
);
assert.equal(pending.eligible, false);
assert.deepEqual(pending.pending_review_page_ids, ["assessment"]);

const wrongPrivacy = evaluateLearningCertificationEligibility(
  [
    {
      ...readyPages[0],
      latest_attempt: {
        ...readyPages[0].latest_attempt!,
        answers: {
          ...readyPages[0].latest_attempt!.answers,
          privacy: { block_type: "quiz_multiple_choice", value: "unsafe" },
        },
      },
    },
  ],
  80,
);
assert.equal(wrongPrivacy.eligible, false);
assert(wrongPrivacy.missing_competency_codes.includes("C4_DATA_PRIVACY"));

const accessSql = fs.readFileSync("supabase/migrations/20260508100000_learning_certification_access_gate.sql", "utf8");
const issueSql = fs.readFileSync("supabase/migrations/20260508102000_learning_certification_issue_function_fix.sql", "utf8");

for (const snippet of [
  "missing_profile_org",
  "not_configured",
  "'missing'::text",
  "v_cert.status = 'active'",
  "v_cert.expires_at <= now()",
]) {
  assert(accessSql.includes(snippet), `SQL access gate mist verwacht fragment: ${snippet}`);
}

for (const snippet of [
  "learning_issue_certification_for_enrollment",
  "v_enrollment.status <> 'completed'",
  "v_enrollment.completed_at IS NULL",
]) {
  assert(issueSql.includes(snippet), `SQL certification issue flow mist verwacht fragment: ${snippet}`);
}

console.log(
  JSON.stringify(
    {
      accessCases: ["missing_profile_org", "not_configured", "missing", "active", "expired", "revoked"],
      certificationCases: ["eligible", "pending_review", "wrong_privacy_evidence"],
      sqlFragmentsChecked: 8,
    },
    null,
    2,
  ),
);
