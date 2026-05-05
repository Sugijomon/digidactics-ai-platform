"use client";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { createClient, hasSupabaseBrowserEnv } from "@/lib/supabase/client";
import type {
  JsonValue,
  RpcError,
  RpcErrorCode,
  RpcResult,
  SaveProfilePayload,
  SaveToolPayload,
  SurveySession,
} from "@/lib/sai-rpc/types";

const DEFAULT_UNEXPECTED_ERROR: RpcError = {
  code: "unexpected_response",
  message: "Supabase returned an unexpected response shape.",
};

type StartSurveyRunRow = {
  run_id: string;
  submission_token: string;
};

type MultiChoiceRpcName =
  | "save_data_types"
  | "save_concerns"
  | "save_support_needs"
  | "save_tool_preference_reasons";

function createRpcClient(): RpcResult<SupabaseClient> {
  if (!hasSupabaseBrowserEnv()) {
    return {
      ok: false,
      error: {
        code: "missing_supabase_env",
        message: "Missing public Supabase environment variables.",
      },
    };
  }

  return {
    ok: true,
    data: createClient(),
  };
}

function mapSupabaseError(error: PostgrestError): RpcError {
  const knownCode = getKnownRpcCode(error.message);

  return {
    code: knownCode ?? "supabase_error",
    message: error.message,
    details: error.details,
    hint: error.hint,
  };
}

function getKnownRpcCode(message: string): RpcErrorCode | null {
  if (message.includes("invalid_token_or_run_closed")) {
    return "invalid_token_or_run_closed";
  }

  if (message.includes("invalid_or_closed_wave")) {
    return "invalid_or_closed_wave";
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStartSurveyRunRow(value: unknown): value is StartSurveyRunRow {
  return (
    isRecord(value) &&
    typeof value.run_id === "string" &&
    typeof value.submission_token === "string"
  );
}

function toJsonValue<T extends JsonValue>(value: T): JsonValue {
  return value;
}

export async function startSurveyRun(
  waveToken: string,
): Promise<RpcResult<SurveySession>> {
  const client = createRpcClient();

  if (!client.ok) {
    return client;
  }

  const { data, error } = await client.data.rpc("start_survey_run", {
    p_wave_token: waveToken,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  const firstRow: unknown = Array.isArray(data) ? data[0] : data;

  if (!isStartSurveyRunRow(firstRow)) {
    return { ok: false, error: DEFAULT_UNEXPECTED_ERROR };
  }

  return {
    ok: true,
    data: {
      runId: firstRow.run_id,
      submissionToken: firstRow.submission_token,
    },
  };
}

export async function saveProfile(
  session: SurveySession,
  payload: SaveProfilePayload,
): Promise<RpcResult<null>> {
  const client = createRpcClient();

  if (!client.ok) {
    return client;
  }

  const { error } = await client.data.rpc("save_profile", {
    p_run_id: session.runId,
    p_token: session.submissionToken,
    p_payload: toJsonValue(payload),
  });

  return error ? { ok: false, error: mapSupabaseError(error) } : successNull();
}

export async function saveDataTypes(
  session: SurveySession,
  codes: string[],
): Promise<RpcResult<null>> {
  return saveMultiChoiceCodes("save_data_types", session, codes);
}

export async function saveConcerns(
  session: SurveySession,
  codes: string[],
): Promise<RpcResult<null>> {
  return saveMultiChoiceCodes("save_concerns", session, codes);
}

export async function saveSupportNeeds(
  session: SurveySession,
  codes: string[],
): Promise<RpcResult<null>> {
  return saveMultiChoiceCodes("save_support_needs", session, codes);
}

export async function saveToolPreferenceReasons(
  session: SurveySession,
  codes: string[],
): Promise<RpcResult<null>> {
  return saveMultiChoiceCodes("save_tool_preference_reasons", session, codes);
}

export async function saveTool(
  session: SurveySession,
  payload: SaveToolPayload,
): Promise<RpcResult<string>> {
  const client = createRpcClient();

  if (!client.ok) {
    return client;
  }

  const { data, error } = await client.data.rpc("save_tool", {
    p_run_id: session.runId,
    p_token: session.submissionToken,
    p_payload: toJsonValue(payload),
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return typeof data === "string"
    ? { ok: true, data }
    : { ok: false, error: DEFAULT_UNEXPECTED_ERROR };
}

export async function saveToolUseCase(
  session: SurveySession,
  surveyToolId: string,
  useCaseCode: string,
): Promise<RpcResult<string>> {
  const client = createRpcClient();

  if (!client.ok) {
    return client;
  }

  const { data, error } = await client.data.rpc("save_tool_use_case", {
    p_run_id: session.runId,
    p_token: session.submissionToken,
    p_survey_tool_id: surveyToolId,
    p_use_case_code: useCaseCode,
  });

  if (error) {
    return { ok: false, error: mapSupabaseError(error) };
  }

  return typeof data === "string"
    ? { ok: true, data }
    : { ok: false, error: DEFAULT_UNEXPECTED_ERROR };
}

export async function saveToolUseCaseContext(
  session: SurveySession,
  surveyToolUseCaseId: string,
  contextCodes: string[],
): Promise<RpcResult<null>> {
  const client = createRpcClient();

  if (!client.ok) {
    return client;
  }

  const { error } = await client.data.rpc("save_tool_use_case_context", {
    p_run_id: session.runId,
    p_token: session.submissionToken,
    p_survey_tool_use_case_id: surveyToolUseCaseId,
    p_context_codes: toJsonValue(contextCodes),
  });

  return error ? { ok: false, error: mapSupabaseError(error) } : successNull();
}

export async function saveToolAccount(
  session: SurveySession,
  surveyToolId: string,
  accountTypeCode: string,
): Promise<RpcResult<null>> {
  const client = createRpcClient();

  if (!client.ok) {
    return client;
  }

  const { error } = await client.data.rpc("save_tool_account", {
    p_run_id: session.runId,
    p_token: session.submissionToken,
    p_survey_tool_id: surveyToolId,
    p_account_type_code: accountTypeCode,
  });

  return error ? { ok: false, error: mapSupabaseError(error) } : successNull();
}

export async function completeSurveyRun(
  session: SurveySession,
): Promise<RpcResult<null>> {
  const client = createRpcClient();

  if (!client.ok) {
    return client;
  }

  const { error } = await client.data.rpc("complete_survey_run", {
    p_run_id: session.runId,
    p_token: session.submissionToken,
  });

  return error ? { ok: false, error: mapSupabaseError(error) } : successNull();
}

async function saveMultiChoiceCodes(
  rpcName: MultiChoiceRpcName,
  session: SurveySession,
  codes: string[],
): Promise<RpcResult<null>> {
  const client = createRpcClient();

  if (!client.ok) {
    return client;
  }

  const { error } = await client.data.rpc(rpcName, {
    p_run_id: session.runId,
    p_token: session.submissionToken,
    p_codes: toJsonValue(codes),
  });

  return error ? { ok: false, error: mapSupabaseError(error) } : successNull();
}

function successNull(): RpcResult<null> {
  return { ok: true, data: null };
}
