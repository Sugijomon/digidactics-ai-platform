// Thin RPC wrappers for the synthetic-flow script.
//
// Same RPC names and p_-prefixed parameter shapes as
// apps/sai/lib/sai-rpc/client.ts (the app's browser-only RPC client). This
// version is simplified for a sequential Node script: it throws on error
// instead of returning a Result type, since a scenario run should abort
// loudly rather than continue with partial data.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  JsonValue,
  SaveProfilePayload,
  SaveToolPayload,
  SurveySession,
} from "./types";

type StartSurveyRunRow = {
  run_id: string;
  submission_token: string;
};

function assertNoError(rpcName: string, error: { message: string } | null) {
  if (error) {
    throw new Error(`RPC ${rpcName} failed: ${error.message}`);
  }
}

export async function startSurveyRun(
  client: SupabaseClient,
  waveToken: string,
): Promise<SurveySession> {
  const { data, error } = await client.rpc("start_survey_run", {
    p_wave_token: waveToken,
  });
  assertNoError("start_survey_run", error);

  const row = (Array.isArray(data) ? data[0] : data) as
    | StartSurveyRunRow
    | undefined;
  if (!row || typeof row.run_id !== "string" || typeof row.submission_token !== "string") {
    throw new Error("start_survey_run returned an unexpected response shape.");
  }

  return { runId: row.run_id, submissionToken: row.submission_token };
}

export async function saveProfile(
  client: SupabaseClient,
  session: SurveySession,
  payload: SaveProfilePayload,
): Promise<void> {
  const { error } = await client.rpc("save_profile", {
    p_run_id: session.runId,
    p_token: session.submissionToken,
    p_payload: payload as JsonValue,
  });
  assertNoError("save_profile", error);
}

export async function saveDataTypes(
  client: SupabaseClient,
  session: SurveySession,
  codes: string[],
): Promise<void> {
  const { error } = await client.rpc("save_data_types", {
    p_run_id: session.runId,
    p_token: session.submissionToken,
    p_codes: codes,
  });
  assertNoError("save_data_types", error);
}

export async function saveTool(
  client: SupabaseClient,
  session: SurveySession,
  payload: SaveToolPayload,
): Promise<string> {
  const { data, error } = await client.rpc("save_tool", {
    p_run_id: session.runId,
    p_token: session.submissionToken,
    p_payload: payload as JsonValue,
  });
  assertNoError("save_tool", error);
  if (typeof data !== "string") {
    throw new Error("save_tool returned an unexpected response shape.");
  }
  return data;
}

export async function saveToolUseCase(
  client: SupabaseClient,
  session: SurveySession,
  surveyToolId: string,
  useCaseCode: string,
): Promise<string> {
  const { data, error } = await client.rpc("save_tool_use_case", {
    p_run_id: session.runId,
    p_token: session.submissionToken,
    p_survey_tool_id: surveyToolId,
    p_use_case_code: useCaseCode,
  });
  assertNoError("save_tool_use_case", error);
  if (typeof data !== "string") {
    throw new Error("save_tool_use_case returned an unexpected response shape.");
  }
  return data;
}

export async function saveToolUseCaseContext(
  client: SupabaseClient,
  session: SurveySession,
  surveyToolUseCaseId: string,
  contextCodes: string[],
): Promise<void> {
  const { error } = await client.rpc("save_tool_use_case_context", {
    p_run_id: session.runId,
    p_token: session.submissionToken,
    p_survey_tool_use_case_id: surveyToolUseCaseId,
    p_context_codes: contextCodes,
  });
  assertNoError("save_tool_use_case_context", error);
}

export async function saveToolAccount(
  client: SupabaseClient,
  session: SurveySession,
  surveyToolId: string,
  accountTypeCode: string,
): Promise<void> {
  const { error } = await client.rpc("save_tool_account", {
    p_run_id: session.runId,
    p_token: session.submissionToken,
    p_survey_tool_id: surveyToolId,
    p_account_type_code: accountTypeCode,
  });
  assertNoError("save_tool_account", error);
}

export async function registerToolDiscovery(
  client: SupabaseClient,
  session: SurveySession,
  surveyToolId: string,
  rawToolName: string,
): Promise<string> {
  const { data, error } = await client.rpc("register_tool_discovery", {
    p_run_id: session.runId,
    p_token: session.submissionToken,
    p_survey_tool_id: surveyToolId,
    p_raw_tool_name: rawToolName,
  });
  assertNoError("register_tool_discovery", error);
  if (typeof data !== "string") {
    throw new Error(
      "register_tool_discovery returned an unexpected response shape.",
    );
  }
  return data;
}

export async function completeSurveyRun(
  client: SupabaseClient,
  session: SurveySession,
): Promise<void> {
  const { error } = await client.rpc("complete_survey_run", {
    p_run_id: session.runId,
    p_token: session.submissionToken,
  });
  assertNoError("complete_survey_run", error);
}
