import assert from "node:assert/strict";
import { aiLiteracyFoundationTopicSeeds } from "../apps/rai/lib/ai-literacy-foundation-content";
import { aiMasteryCourseTopicSeeds } from "../apps/rai/lib/ai-mastery-content";
import { aiProficiencyCourseTopicSeeds } from "../apps/rai/lib/ai-proficiency-content";
import {
  AI_PROFICIENCY_ROLE_PATHS,
  COURSE_LANGUAGE_TARGETS,
  DPO_REVIEW_CHECKLIST,
  EVIDENCE_DOSSIER_FIELDS,
  LEARNING_SOURCE_REFERENCES,
} from "../apps/rai/lib/learning-governance-config";

type TopicSeed = {
  code: string;
  title: string;
  pages: Array<{
    code: string;
    title: string;
    blocks: Array<Record<string, unknown>>;
  }>;
};

const courses = [
  { code: "ai-literacy-foundation", topics: aiLiteracyFoundationTopicSeeds },
  { code: "ai-proficiency", topics: aiProficiencyCourseTopicSeeds },
  { code: "ai-mastery", topics: aiMasteryCourseTopicSeeds },
] satisfies Array<{ code: string; topics: TopicSeed[] }>;

const sourceIds = new Set(LEARNING_SOURCE_REFERENCES.map((source) => source.id));
const evidenceFieldIds = EVIDENCE_DOSSIER_FIELDS.map((field) => field.id);
const rolePathIds = new Set(AI_PROFICIENCY_ROLE_PATHS.map((path) => path.id));

assert.deepEqual(
  Object.keys(COURSE_LANGUAGE_TARGETS).sort(),
  courses.map((course) => course.code).sort(),
  "Elke cursus moet een CEFR-taaldoel hebben.",
);
assert(DPO_REVIEW_CHECKLIST.length >= 4, "DPO-reviewchecklist mist privacy/HR/toolscope/evidence punten.");

const blocksById = new Map<string, Record<string, unknown>>();
const organizationContextBlocks: Array<Record<string, unknown>> = [];

for (const course of courses) {
  for (const topic of course.topics) {
    for (const page of topic.pages) {
      for (const block of page.blocks) {
        blocksById.set(String(block.id), block);
        if (block.type === "organization_context") {
          organizationContextBlocks.push(block);
        }
        validateSourceMetadata(block);
        validateReviewMetadata(block);
        validateRolePathMetadata(block);
      }
    }
  }
}

expectBlock("p4-paragraph", (block) => {
  assert.equal(block.source_status, "current_law");
  assert.equal(block.last_verified_at, "2026-05-29");
});
expectBlock("p4-ai-act-timeline", expectProvisionalLegalBlock);
expectBlock("p5-cards", expectProvisionalLegalBlock);
expectBlock("p5-risk-columns", expectProvisionalLegalBlock);
expectBlock("p15-ms-1", expectProvisionalLegalBlock);
expectBlock("m01-ai-act-provisional-timeline", expectProvisionalLegalBlock);
expectBlock("m02-triage-matrix", (block) => {
  assert.equal(block.type, "decision_matrix");
  assert.equal(block.review_required, true);
  assert(Array.isArray(block.quadrants) && block.quadrants.length === 4, "Triage matrix moet 4 kwadranten hebben.");
});
expectDownloadBlock("m02-download", "/downloads/learning/mastery-triagecanvas.csv");
expectBlock("m02-hrais-building-blocks", expectProvisionalLegalBlock);
expectBlock("m03-chain-flow", (block) => {
  assert.equal(block.type, "timeline");
  assert.equal(block.review_required, true);
});
expectBlock("m06-control-interventions-timeline", (block) => {
  assert.equal(block.type, "timeline");
  assert(Array.isArray(block.items) && block.items.length === 4, "Controle-interventies moeten 4 stappen hebben.");
});
expectBlock("m07-bias-checklist", (block) => {
  assert.equal(block.type, "checklist");
});
expectBlock("m09-disclosure-slides", (block) => {
  assert.equal(block.type, "slide_deck");
  assert.equal(block.review_required, true);
  assert(Array.isArray(block.slides) && block.slides.length === 3, "Disclosure deck moet 3 slides hebben.");
});
expectDownloadBlock("m04-download", "/downloads/learning/mastery-raci-template.csv");
expectDownloadBlock("m08-download", "/downloads/learning/mastery-incident-reviewregister.csv");

for (const id of [
  "m02-triage-matrix",
  "m03-chain-flow",
  "p6-data-matrix",
  "p7-slides",
  "p14-cases",
  "p03-prompting-slides",
  "p05-data-classification-matrix",
  "p06-toolkeuze-promptsanering-slides",
  "p07-role-pathways",
  "p08-case",
  "m07-cards",
  "m09-disclosure-slides",
  "m09-scenario",
  "m08-fria-qms-sandbox",
]) {
  expectBlock(id, (block) => {
    assert.equal(block.review_required, true, `${id} moet review_required zijn.`);
    assert(Array.isArray(block.review_tags) && block.review_tags.length > 0, `${id} mist review_tags.`);
  });
}

expectBlock("p02-error-asymmetry", (block) => {
  assert(Array.isArray(block.review_rubric) && block.review_rubric.length >= 2, "Fout-asymmetrie mist rubric.");
});
expectBlock("p04-swac", (block) => {
  assert(Array.isArray(block.review_rubric) && block.review_rubric.length >= 4, "SWAC mist rubric.");
});
expectBlock("m08-fria-qms-sandbox", (block) => {
  assert(Array.isArray(block.review_rubric) && block.review_rubric.length >= 3, "FRIA/QMS mist rubric.");
});
expectBlock("m11-case", (block) => {
  assert(Array.isArray(block.review_rubric) && block.review_rubric.length >= 4, "Mastery governance-case mist rubric.");
});

expectBlock("p15-evidence-dossier", (block) => {
  assert.equal(block.review_required, true);
  assert.deepEqual(block.evidence_dossier_fields, evidenceFieldIds);
});

expectBlock("p07-role-pathways", (block) => {
  assert.deepEqual(block.role_path_ids, ["hr", "finance", "marketing", "support", "operations"]);
  assert.equal(block.role_path_requirement, "role_optional");
});
expectBlock("p08-case", (block) => {
  assert.deepEqual(block.role_path_ids, ["hr", "finance", "operations"]);
  assert.equal(block.role_path_requirement, "role_required");
});

const expectedOrganizationContextSlots = new Map([
  ["p3-org-tools", "approved_tools"],
  ["p6-org-data-rules", "data_rules"],
  ["p6-org-approved-tools", "approved_tools"],
  ["p8-org-sector-case", "sector_case"],
  ["p12-org-oversight", "oversight_roles"],
  ["p12-org-escalation", "escalation_route"],
  ["p14-org-role-cases", "role_cases"],
  ["p15-org-policy-acknowledgement", "policy_link"],
]);

assert.equal(
  organizationContextBlocks.length,
  expectedOrganizationContextSlots.size,
  "AI Literacy moet alleen de afgesproken organisatiecontextblokken bevatten.",
);

for (const [blockId, slot] of expectedOrganizationContextSlots) {
  expectBlock(blockId, (block) => {
    assert.equal(block.type, "organization_context");
    assert.equal(block.slot, slot, `${blockId} gebruikt niet het afgesproken Context Pack-slot.`);
    assert.equal(typeof block.fallback, "string", `${blockId} mist een neutrale fallback.`);
    assert(String(block.fallback).length > 0, `${blockId} heeft een lege fallback.`);
  });
}

expectBlock("p15-org-policy-acknowledgement", (block) => {
  assert.equal(block.acknowledgement_required, true);
});

assert.equal(
  organizationContextBlocks.filter((block) => block.acknowledgement_required === true).length,
  1,
  "Alleen de beleidscontext op pagina 15 mag acknowledgement vereisen.",
);

console.log(
  JSON.stringify(
    {
      courses: courses.length,
      blocks: blocksById.size,
      sources: LEARNING_SOURCE_REFERENCES.length,
      reviewBlocks: [...blocksById.values()].filter((block) => block.review_required === true).length,
      provisionalBlocks: [...blocksById.values()].filter((block) => block.provisional === true).length,
      organizationContextBlocks: organizationContextBlocks.length,
      masteryArtefactsChecked: [
        "m02-triage-matrix",
        "m03-chain-flow",
        "m06-control-interventions-timeline",
        "m07-cards",
        "m08-timeline",
        "m09-disclosure-slides",
      ],
      rubricsChecked: ["p02-error-asymmetry", "p04-swac", "m08-fria-qms-sandbox", "m11-case"],
    },
    null,
    2,
  ),
);

function expectBlock(id: string, assertion: (block: Record<string, unknown>) => void) {
  const block = blocksById.get(id);
  assert(block, `Block ${id} ontbreekt.`);
  assertion(block);
}

function expectDownloadBlock(id: string, fileUrl: string) {
  expectBlock(id, (block) => {
    assert.equal(block.type, "download");
    assert.equal(block.file_url, fileUrl, `${id} mist download-url.`);
    assert.equal(block.mime_type, "text/csv", `${id} moet als CSV-template herkenbaar zijn.`);
  });
}

function expectProvisionalLegalBlock(block: Record<string, unknown>) {
  assert.equal(block.source_status, "provisional_agreement");
  assert.equal(block.provisional, true);
  assert.equal(block.legal_review_required, true);
  assert.equal(block.last_verified_at, "2026-05-29");
}

function validateSourceMetadata(block: Record<string, unknown>) {
  const ids = block.source_ids;
  if (!Array.isArray(ids)) return;

  for (const id of ids) {
    assert.equal(typeof id, "string", `${block.id} heeft een niet-string source id.`);
    assert(sourceIds.has(id), `${block.id} verwijst naar onbekende source ${id}.`);
  }

  assert.equal(typeof block.source_status, "string", `${block.id} heeft source_ids maar mist source_status.`);
  assert.equal(typeof block.last_verified_at, "string", `${block.id} heeft source_ids maar mist last_verified_at.`);
}

function validateReviewMetadata(block: Record<string, unknown>) {
  if (block.review_required !== true) return;

  assert(Array.isArray(block.review_tags), `${block.id} is review_required maar mist review_tags.`);
  assert((block.review_tags as unknown[]).every((tag) => typeof tag === "string"), `${block.id} heeft ongeldige review_tags.`);
}

function validateRolePathMetadata(block: Record<string, unknown>) {
  const paths = block.role_path_ids;
  if (!Array.isArray(paths)) return;

  for (const id of paths) {
    assert.equal(typeof id, "string", `${block.id} heeft een niet-string role_path id.`);
    assert(rolePathIds.has(id), `${block.id} verwijst naar onbekend role_path ${id}.`);
  }

  assert.equal(typeof block.role_path_requirement, "string", `${block.id} heeft role_path_ids maar mist requirement.`);
}
