import assert from "node:assert/strict";
import test from "node:test";
import {
  applyOrganizationContextToContent,
  getOrganizationContextSlots,
  isLessonContent,
  isOrganizationContextPackContent,
  type LessonContent,
} from "../learning.js";

const content: LessonContent = {
  version: 3,
  blocks: [
    { id: "intro", type: "paragraph", markdown: "Vaste kerninhoud." },
    {
      id: "tools",
      type: "organization_context",
      slot: "approved_tools",
      fallback: "Vraag welke tools zijn toegestaan.",
    },
    {
      id: "policy",
      type: "organization_context",
      slot: "policy_link",
      fallback: "Vraag waar het beleid staat.",
      acknowledgement_required: true,
    },
  ],
};

test("organization context slots are strictly validated", () => {
  assert.equal(isLessonContent(content), true);
  assert.equal(
    isLessonContent({
      version: 1,
      blocks: [
        {
          id: "invalid",
          type: "organization_context",
          slot: "arbitrary_template_value",
          fallback: "Fallback",
        },
      ],
    }),
    false,
  );
  assert.deepEqual(getOrganizationContextSlots(content), ["approved_tools", "policy_link"]);
});

test("a Context Pack resolves known slots without changing core blocks", () => {
  const result = applyOrganizationContextToContent(content, {
    id: "context-pack-v2",
    version: 2,
    content_hash: "a".repeat(64),
    context_json: {
      approved_tools: [{ name: "Enterprise Copilot", guidance: "Gebruik je werkaccount." }],
      policy_link: { label: "AI-beleid", url: "https://example.test/ai-policy" },
    },
  });

  assert.deepEqual(result.blocks[0], content.blocks[0]);
  assert.deepEqual(result.blocks[1], {
    ...content.blocks[1],
    resolved_context: [
      { name: "Enterprise Copilot", guidance: "Gebruik je werkaccount." },
    ],
    context_pack_release: {
      id: "context-pack-v2",
      version: 2,
      content_hash: "a".repeat(64),
    },
  });
});

test("courses without a Context Pack retain explicit fallbacks", () => {
  const result = applyOrganizationContextToContent(content, null);
  const contextBlock = result.blocks[1];

  assert.equal(contextBlock.type, "organization_context");
  if (contextBlock.type === "organization_context") {
    assert.equal(contextBlock.resolved_context, null);
    assert.equal(contextBlock.context_pack_release, undefined);
    assert.equal(contextBlock.fallback, "Vraag welke tools zijn toegestaan.");
  }
});

test("Context Pack top-level keys reject free-form template fields", () => {
  assert.equal(
    isOrganizationContextPackContent({
      organization: { name: "Voorbeeld BV", sector: "Zakelijke dienstverlening" },
      data_rules: ["Gebruik geen klantdata in publieke tools."],
    }),
    true,
  );
  assert.equal(
    isOrganizationContextPackContent({ arbitrary_html: "<script>bad()</script>" }),
    false,
  );
});
