#!/usr/bin/env node
// SAI Synthetic Pilot Organisatie — synthetic flow runner.
//
// LOCAL/STAGING ONLY. Plays the scenarios from docs/sai-synthetic-flow-
// testplan.md through the real respondent RPC flow (start_survey_run ->
// save_* -> complete_survey_run) so survey_run, survey_profile,
// survey_tool, survey_tool_use_case, survey_tool_use_case_context,
// survey_tool_account, survey_data_type, risk_result, risk_result_tool,
// dpo_review_items, and audit_events are all filled by
// public.calculate_v8_score(...), not by hand-written inserts.
//
// DEFAULT BEHAVIOR IS DRY RUN. Without --target, this script only prints the
// plan (which scenarios, how many runs, which departments) and makes no
// Supabase calls at all. To actually write data you must pass both
// --target local|staging and --confirm; --target staging additionally
// requires --i-know-this-is-staging. See ./authorization.ts.
//
// Usage:
//   node dist/run.js --wave-token <token>                      (dry run — default)
//   node dist/run.js --wave-token <token> --target local --confirm
//   node dist/run.js --wave-token <token> --target staging --confirm --i-know-this-is-staging
//
// See docs/sai-synthetic-flow-testplan.md and
// apps/sai/scripts/synthetic-flow/README.md for full usage and prerequisites.

import { resolveAuthorization } from "./authorization";
import { resolveEnv } from "./env";
import { createAnonClient } from "./supabase-client";
import { SCENARIOS, findScenario } from "./scenarios";
import type { RunResult, ScenarioDefinition } from "./types";
import {
  completeSurveyRun,
  registerToolDiscovery,
  saveDataTypes,
  saveProfile,
  saveTool,
  saveToolAccount,
  saveToolUseCase,
  saveToolUseCaseContext,
  startSurveyRun,
} from "./rpc";
import type { SupabaseClient } from "@supabase/supabase-js";

type CliOptions = {
  waveToken?: string;
  scenarioId: string;
  repeatOverride?: number;
  departmentOverride?: string;
  targetArg?: string;
  confirmWrite: boolean;
  confirmedStaging: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function parseArgs(argv: string[]): CliOptions {
  // --confirm and --i-know-this-is-staging are intentionally CLI-flag-only.
  // There is no env var fallback for either: a write run must be an explicit,
  // per-invocation human action, never something a stray env var can enable.
  const opts: Partial<CliOptions> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--wave-token":
        opts.waveToken = argv[++i];
        break;
      case "--scenario":
        opts.scenarioId = argv[++i];
        break;
      case "--repeat":
        opts.repeatOverride = Number(argv[++i]);
        break;
      case "--department":
        opts.departmentOverride = argv[++i];
        break;
      case "--target":
        opts.targetArg = argv[++i];
        break;
      case "--confirm":
        opts.confirmWrite = true;
        break;
      case "--i-know-this-is-staging":
        opts.confirmedStaging = true;
        break;
      case "--supabase-url":
        opts.supabaseUrl = argv[++i];
        break;
      case "--supabase-anon-key":
        opts.supabaseAnonKey = argv[++i];
        break;
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}. Run with --help.`);
    }
  }

  return {
    waveToken: opts.waveToken ?? process.env.NEXT_PUBLIC_SAI_DEFAULT_WAVE_TOKEN,
    scenarioId: opts.scenarioId ?? "all",
    repeatOverride: opts.repeatOverride,
    departmentOverride: opts.departmentOverride,
    targetArg: opts.targetArg,
    confirmWrite: opts.confirmWrite ?? false,
    confirmedStaging: opts.confirmedStaging ?? false,
    supabaseUrl: opts.supabaseUrl,
    supabaseAnonKey: opts.supabaseAnonKey,
  };
}

function printHelp() {
  console.log(`
SAI synthetic-flow runner (LOCAL/STAGING ONLY).

DEFAULT BEHAVIOR IS DRY RUN: without --target, this only prints the planned
scenario runs and makes no Supabase calls.

To actually write data:
  --target local|staging        Declares the intended environment. Required to write.
  --confirm                     Explicit "yes, write real rows" flag. Required to write.
  --i-know-this-is-staging      Extra confirmation, required in addition to the above
                                 when --target staging is used.

Other options:
  --wave-token <token>           Active scan_wave token. Required to write; optional
                                  for a dry run preview (falls back to
                                  NEXT_PUBLIC_SAI_DEFAULT_WAVE_TOKEN).
  --scenario <id|all>            Scenario id to run (default: all). See below.
  --repeat <n>                   Override the scenario's default respondent count.
  --department <code>            Override the scenario's default department_code
                                  (only valid when running a single --scenario).
  --supabase-url <url>            Overrides NEXT_PUBLIC_SUPABASE_URL.
  --supabase-anon-key <key>       Overrides NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.

Scenarios:
${SCENARIOS.map((s) => `  ${s.id.padEnd(28)} ${s.label}`).join("\n")}

Examples:
  node dist/run.js --wave-token sai-synthetic-pilot-wave-token
  node dist/run.js --wave-token sai-synthetic-pilot-wave-token --target local --confirm
  node dist/run.js --wave-token sai-synthetic-pilot-wave-token \\
    --target staging --confirm --i-know-this-is-staging

NEVER run this against a production Supabase project.
`);
}

function resolveScenarios(options: CliOptions): ScenarioDefinition[] {
  const scenariosToRun: ScenarioDefinition[] =
    options.scenarioId === "all"
      ? SCENARIOS
      : [requireScenario(options.scenarioId)];

  if (options.departmentOverride && scenariosToRun.length > 1) {
    throw new Error(
      "--department can only be used together with a single --scenario, not --scenario all.",
    );
  }

  return scenariosToRun;
}

function departmentForIteration(
  scenario: ScenarioDefinition,
  options: CliOptions,
  iterationIndex: number,
): string {
  return (
    options.departmentOverride ??
    scenario.departments[iterationIndex % scenario.departments.length]
  );
}

function printDryRunPlan(options: CliOptions, scenarios: ScenarioDefinition[]) {
  console.log("DRY RUN — no Supabase calls will be made.");
  console.log(
    "Pass --target local|staging and --confirm to actually write data",
    "(see --help).\n",
  );
  console.log(
    `Wave token: ${options.waveToken ?? "<not set — required for a write run>"}`,
  );

  let totalRuns = 0;
  for (const scenario of scenarios) {
    const repeat = options.repeatOverride ?? scenario.defaultRepeat;
    totalRuns += repeat;
    console.log(`\n${scenario.label} (${repeat}x)`);
    for (let i = 0; i < repeat; i += 1) {
      const departmentCode = departmentForIteration(scenario, options, i);
      const toolLabel = scenario.tool
        ? `tool="${scenario.tool.tool_name}"`
        : "no tool (exit path)";
      console.log(
        `  [${scenario.id}] plan ${i + 1}/${repeat} department=${departmentCode} ${toolLabel}`,
      );
    }
  }

  console.log(`\nDry run complete. Would create ${totalRuns} survey_run row(s).`);
}

async function runScenarioOnce(
  client: SupabaseClient,
  waveToken: string,
  scenario: ScenarioDefinition,
  departmentCode: string,
): Promise<RunResult> {
  const session = await startSurveyRun(client, waveToken);

  await saveProfile(client, session, {
    ...scenario.profile,
    department_code: departmentCode,
  });

  if (scenario.dataTypeCodes.length > 0) {
    await saveDataTypes(client, session, scenario.dataTypeCodes);
  }

  if (scenario.tool) {
    const toolId = await saveTool(client, session, {
      tool_code: scenario.tool.tool_code,
      tool_name: scenario.tool.tool_name,
      is_custom: scenario.tool.is_custom,
      catalog_beheerstatus_code: scenario.tool.catalog_beheerstatus_code,
    });

    const useCaseId = await saveToolUseCase(
      client,
      session,
      toolId,
      scenario.tool.use_case_code,
    );

    await saveToolUseCaseContext(
      client,
      session,
      useCaseId,
      scenario.tool.context_codes,
    );

    await saveToolAccount(
      client,
      session,
      toolId,
      scenario.tool.account_type_code,
    );

    if (scenario.tool.registerDiscovery) {
      await registerToolDiscovery(
        client,
        session,
        toolId,
        scenario.tool.tool_name,
      );
    }
  }

  await completeSurveyRun(client, session);

  return {
    scenarioId: scenario.id,
    departmentCode,
    runId: session.runId,
  };
}

async function runScenario(
  client: SupabaseClient,
  waveToken: string,
  scenario: ScenarioDefinition,
  options: CliOptions,
): Promise<RunResult[]> {
  const repeat = options.repeatOverride ?? scenario.defaultRepeat;
  const results: RunResult[] = [];

  for (let i = 0; i < repeat; i += 1) {
    const departmentCode = departmentForIteration(scenario, options, i);

    const result = await runScenarioOnce(
      client,
      waveToken,
      scenario,
      departmentCode,
    );
    results.push(result);
    console.log(
      `  [${scenario.id}] run ${i + 1}/${repeat} department=${departmentCode} run_id=${result.runId}`,
    );
  }

  return results;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const scenariosToRun = resolveScenarios(options);

  const authorization = resolveAuthorization({
    targetArg: options.targetArg,
    confirmWrite: options.confirmWrite,
    confirmedStaging: options.confirmedStaging,
    supabaseUrl:
      options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

  if (authorization.mode === "dry-run") {
    printDryRunPlan(options, scenariosToRun);
    return;
  }

  if (!options.waveToken) {
    throw new Error(
      "Missing --wave-token (or NEXT_PUBLIC_SAI_DEFAULT_WAVE_TOKEN) for a write run.",
    );
  }

  const env = resolveEnv({
    supabaseUrl: options.supabaseUrl,
    supabaseAnonKey: options.supabaseAnonKey,
  });

  const client = createAnonClient(env.supabaseUrl, env.supabaseAnonKey);

  console.log(
    `Running ${scenariosToRun.length} scenario(s) against wave token "${options.waveToken}"...`,
  );

  const allResults: RunResult[] = [];
  for (const scenario of scenariosToRun) {
    console.log(`\n${scenario.label}`);
    const results = await runScenario(client, options.waveToken, scenario, options);
    allResults.push(...results);
  }

  console.log(`\nDone. Created ${allResults.length} survey_run row(s):`);
  const perScenario = new Map<string, number>();
  for (const result of allResults) {
    perScenario.set(
      result.scenarioId,
      (perScenario.get(result.scenarioId) ?? 0) + 1,
    );
  }
  for (const [scenarioId, count] of perScenario) {
    console.log(`  ${scenarioId}: ${count}`);
  }
}

function requireScenario(id: string): ScenarioDefinition {
  const scenario = findScenario(id);
  if (!scenario) {
    throw new Error(
      `Unknown scenario id "${id}". Run with --help to see valid ids.`,
    );
  }
  return scenario;
}

main().catch((error: unknown) => {
  console.error("\nsynthetic-flow failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
