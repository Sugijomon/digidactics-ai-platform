#!/usr/bin/env node

const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");
const { createClient } = require("@supabase/supabase-js");

const STAGING_REF = "gpptjkwxqxxdsjgwzhzl";
const STAGING_URL = `https://${STAGING_REF}.supabase.co`;
const LIVE_REF = "cfloqagsqwtrtkxdikec";
const CONFIRMATION = "git-canonical-overwrite-core-courses";

const rootDir = path.resolve(__dirname, "..");
const raiDir = path.join(rootDir, "apps", "rai");

installTypeScriptRequireHook();

const {
  LEARNING_CORE_CONTENT_SYNC_CONFIRMATION,
  syncAllLearningCourseContentFromSource,
} = require(path.join(raiDir, "lib", "learning-content-sync.ts"));
const {
  aiLiteracyPreviewCourse,
  aiMasteryPreviewCourse,
  aiProficiencyPreviewCourse,
} = require(path.join(raiDir, "lib", "learning-preview-data.ts"));

async function main() {
  const args = new Set(process.argv.slice(2));
  const execute = args.has("--execute");
  const confirm = readArgValue("--confirm");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sourceCounts = expectedSourceCounts();

  printCounts("Git-canonical source content", sourceCounts);

  if (!execute) {
    console.log("\nDry run only. No Supabase writes were attempted.");
    console.log(`To execute against staging, set NEXT_PUBLIC_SUPABASE_URL=${STAGING_URL}`);
    console.log("Set SUPABASE_SERVICE_ROLE_KEY server-side only, then run:");
    console.log(`node scripts/sync-learning-content-staging.cjs --execute --confirm ${CONFIRMATION}`);
    return;
  }

  assertEqual(
    confirm,
    CONFIRMATION,
    `Missing --confirm ${CONFIRMATION}. Refusing to overwrite staging content.`,
  );
  assertEqual(
    LEARNING_CORE_CONTENT_SYNC_CONFIRMATION,
    CONFIRMATION,
    "App confirmation constant no longer matches the staging helper.",
  );
  assertEqual(url, STAGING_URL, `NEXT_PUBLIC_SUPABASE_URL must be exactly ${STAGING_URL}.`);
  assertNoProductionUrl(url);
  assertServiceRoleKey(serviceRoleKey);

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const beforeCounts = await readLiveCounts(supabase);
  printCounts("Staging before sync", beforeCounts);

  await syncAllLearningCourseContentFromSource(supabase, {
    confirmOverwrite: CONFIRMATION,
  });

  const afterCounts = await readLiveCounts(supabase);
  printCounts("Staging after sync", afterCounts);
  assertCountsMatch(sourceCounts, afterCounts);

  console.log("\nStaging content sync completed and verified.");
}

function installTypeScriptRequireHook() {
  const originalResolveFilename = Module._resolveFilename;
  const originalLoad = Module._load;

  Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
    if (request.startsWith("@/")) {
      return originalResolveFilename.call(
        this,
        path.join(raiDir, request.slice(2)),
        parent,
        isMain,
        options,
      );
    }

    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Module._load = function load(request, parent, isMain) {
    if (request === "server-only") {
      return {};
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  require.extensions[".ts"] = function compileTypeScript(mod, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        jsx: ts.JsxEmit.Preserve,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: filename,
    }).outputText;

    mod._compile(output, filename);
  };
}

function readArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function expectedSourceCounts() {
  return [
    summarizeCourse(aiLiteracyPreviewCourse),
    summarizeCourse(aiProficiencyPreviewCourse),
    summarizeCourse(aiMasteryPreviewCourse),
  ];
}

function summarizeCourse(course) {
  return {
    course_code: course.course_code,
    topics: course.topics.length,
    pages: course.topics.reduce((sum, topic) => sum + topic.pages.length, 0),
    blocks: course.topics.reduce(
      (sum, topic) =>
        sum +
        topic.pages.reduce(
          (pageSum, page) => pageSum + (Array.isArray(page.content?.blocks) ? page.content.blocks.length : 0),
          0,
        ),
      0,
    ),
  };
}

async function readLiveCounts(supabase) {
  const { data, error } = await supabase
    .from("learning_courses")
    .select(
      `
        course_code,
        learning_topics (
          id,
          learning_pages (
            id,
            content
          )
        )
      `,
    )
    .in("course_code", [
      "ai-literacy-foundation",
      "ai-proficiency",
      "ai-mastery",
    ])
    .order("course_code", { ascending: true });

  if (error) {
    throw new Error(`Could not read staging Learning content counts: ${error.message}`);
  }

  return (data ?? [])
    .map((course) => {
      const topics = course.learning_topics ?? [];
      const pages = topics.flatMap((topic) => topic.learning_pages ?? []);

      return {
        course_code: course.course_code,
        topics: topics.length,
        pages: pages.length,
        blocks: pages.reduce(
          (sum, page) => sum + (Array.isArray(page.content?.blocks) ? page.content.blocks.length : 0),
          0,
        ),
      };
    })
    .sort((left, right) => left.course_code.localeCompare(right.course_code));
}

function assertCountsMatch(expected, actual) {
  const actualByCode = new Map(actual.map((item) => [item.course_code, item]));

  for (const expectedCourse of expected) {
    const actualCourse = actualByCode.get(expectedCourse.course_code);

    if (!actualCourse) {
      throw new Error(`Missing synced course ${expectedCourse.course_code}.`);
    }

    for (const key of ["topics", "pages", "blocks"]) {
      assertEqual(
        actualCourse[key],
        expectedCourse[key],
        `${expectedCourse.course_code} ${key} mismatch after sync.`,
      );
    }
  }
}

function assertNoProductionUrl(url) {
  if (typeof url === "string" && url.includes(LIVE_REF)) {
    throw new Error("Production Supabase ref detected. Refusing to run content sync.");
  }
}

function assertServiceRoleKey(key) {
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for staging content sync.");
  }

  if (key.startsWith("sb_publishable_") || key.startsWith("sb_anon_")) {
    throw new Error("A publishable/anon key was provided. Use the staging service role key server-side only.");
  }

  const parts = key.split(".");
  if (parts.length === 3) {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (payload.ref && payload.ref !== STAGING_REF) {
      throw new Error(`Service role key belongs to ${payload.ref}, expected ${STAGING_REF}.`);
    }
    if (payload.role && payload.role !== "service_role") {
      throw new Error(`JWT role is ${payload.role}, expected service_role.`);
    }
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} Received ${JSON.stringify(actual)}.`);
  }
}

function printCounts(label, counts) {
  console.log(`\n${label}`);
  for (const course of counts) {
    console.log(
      `- ${course.course_code}: ${course.topics} topics / ${course.pages} pages / ${course.blocks} blocks`,
    );
  }
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
