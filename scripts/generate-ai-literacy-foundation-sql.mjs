import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(repoRoot, "apps", "rai", "lib", "ai-literacy-foundation-content.ts");
const outputPath = process.argv[2]
  ? path.resolve(repoRoot, process.argv[2])
  : path.join(
      repoRoot,
      "supabase",
      "drafts",
      "20260528_ai_literacy_foundation_15_page_content.sql",
    );

const moduleCache = new Map();
const sourceModule = loadTypeScriptModule(sourcePath);
const topics = sourceModule.aiLiteracyFoundationTopicSeeds;

if (!Array.isArray(topics)) {
  throw new Error("Could not load aiLiteracyFoundationTopicSeeds from TS source.");
}

const topicRows = topics.map((topic, index) => ({
  topic_code: topic.code,
  title: topic.title,
  summary: topic.summary,
  sequence_order: index + 1,
}));

const pageRows = topics.flatMap((topic) =>
  topic.pages.map((page, pageIndex) => ({
    topic_code: topic.code,
    page_code: page.code,
    title: page.title,
    summary: page.summary,
    page_type: page.type,
    estimated_duration_minutes: page.minutes,
    sequence_order: pageIndex + 1,
    is_required: page.is_required ?? true,
    content: {
      version: 1,
      blocks: page.blocks,
    },
  })),
);

const sql = `-- =============================================================================
-- Generated sync: AI Literacy Foundation 15-page content
-- =============================================================================
-- Generated from apps/rai/lib/ai-literacy-foundation-content.ts.
-- Purpose:
--   Align Supabase learning_topics and learning_pages with the current
--   Course -> Topic -> Page -> JSONB blocks AI Literacy design.
-- =============================================================================

WITH course AS (
  UPDATE public.learning_courses
     SET title = 'AI Literacy (foundation)',
         subtitle = 'AI-rijbewijs voor verantwoord gebruik',
         description = 'Praktische AI-geletterdheid voor Nederlandse MKB-medewerkers, gekoppeld aan EU AI Act Article 4, privacy, outputcontrole, human oversight en escalatie.',
         difficulty_level = 'foundation',
         required_for_onboarding = true,
         passing_threshold = 80,
         version = version + 1,
         updated_at = now()
   WHERE course_code = 'ai-literacy-foundation'
     AND org_id IS NULL
   RETURNING id
),
topic_seed AS (
  SELECT *
    FROM jsonb_to_recordset($topic_seed$
${json(topicRows)}
$topic_seed$::jsonb)
    AS seed(
      topic_code text,
      title text,
      summary text,
      sequence_order int
    )
),
retired_topics AS (
  UPDATE public.learning_topics t
     SET status = 'archived',
         sequence_order = t.sequence_order + 1000,
         updated_at = now()
    FROM course c
   WHERE t.course_id = c.id
     AND t.status <> 'archived'
     AND NOT EXISTS (
       SELECT 1
         FROM topic_seed s
        WHERE s.topic_code = t.topic_code
     )
   RETURNING t.id
)
INSERT INTO public.learning_topics (
  course_id,
  topic_code,
  title,
  summary,
  status,
  sequence_order,
  is_required,
  version
)
SELECT c.id, s.topic_code, s.title, s.summary, 'published', s.sequence_order, true, 1
  FROM course c
  JOIN topic_seed s ON true
ON CONFLICT (course_id, topic_code) DO UPDATE
  SET title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      status = EXCLUDED.status,
      sequence_order = EXCLUDED.sequence_order,
      is_required = EXCLUDED.is_required,
      updated_at = now();

WITH course AS (
  SELECT id
    FROM public.learning_courses
   WHERE course_code = 'ai-literacy-foundation'
     AND org_id IS NULL
   LIMIT 1
),
topics AS (
  SELECT t.id, t.topic_code, t.course_id
    FROM public.learning_topics t
    JOIN course c ON c.id = t.course_id
),
page_seed AS (
  SELECT *
    FROM jsonb_to_recordset($page_seed$
${json(pageRows)}
$page_seed$::jsonb)
    AS seed(
      topic_code text,
      page_code text,
      title text,
      summary text,
      page_type text,
      estimated_duration_minutes int,
      sequence_order int,
      is_required boolean,
      content jsonb
    )
)
INSERT INTO public.learning_pages (
  course_id,
  topic_id,
  page_code,
  title,
  summary,
  page_type,
  status,
  estimated_duration_minutes,
  sequence_order,
  is_required,
  content_schema_version,
  content,
  version
)
SELECT
  t.course_id,
  t.id,
  p.page_code,
  p.title,
  p.summary,
  p.page_type,
  'published',
  p.estimated_duration_minutes,
  p.sequence_order,
  p.is_required,
  1,
  p.content,
  1
FROM page_seed p
JOIN topics t ON t.topic_code = p.topic_code
ON CONFLICT (course_id, page_code) DO UPDATE
  SET topic_id = EXCLUDED.topic_id,
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      page_type = EXCLUDED.page_type,
      status = EXCLUDED.status,
      estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
      sequence_order = EXCLUDED.sequence_order,
      is_required = EXCLUDED.is_required,
      content_schema_version = EXCLUDED.content_schema_version,
      content = jsonb_set(
        EXCLUDED.content,
        '{version}',
        to_jsonb(public.learning_pages.version + 1),
        true
      ),
      version = public.learning_pages.version + 1,
      updated_at = now();
`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, sql, "utf8");

console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
console.log(`Topics: ${topicRows.length}`);
console.log(`Pages: ${pageRows.length}`);

function json(value) {
  return JSON.stringify(value, null, 2).replaceAll("$topic_seed$", "$ topic_seed $").replaceAll("$page_seed$", "$ page_seed $");
}

function loadTypeScriptModule(filePath) {
  const resolvedPath = path.resolve(filePath);
  if (moduleCache.has(resolvedPath)) {
    return moduleCache.get(resolvedPath).exports;
  }

  const source = readFileSync(resolvedPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  moduleCache.set(resolvedPath, loadedModule);

  const localRequire = (specifier) => {
    if (!specifier.startsWith(".")) {
      return require(specifier);
    }

    const basePath = path.resolve(path.dirname(resolvedPath), specifier);
    const candidate = [basePath, `${basePath}.ts`, `${basePath}.js`].find(existsSync);
    if (!candidate) {
      throw new Error(`Cannot resolve ${specifier} from ${resolvedPath}`);
    }

    return candidate.endsWith(".ts") ? loadTypeScriptModule(candidate) : require(candidate);
  };

  const sandbox = {
    exports: loadedModule.exports,
    module: loadedModule,
    require: localRequire,
  };

  vm.runInNewContext(transpiled, sandbox, { filename: resolvedPath });
  return loadedModule.exports;
}
