export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type RpcErrorCode =
  | "invalid_token_or_run_closed"
  | "invalid_or_closed_wave"
  | "missing_supabase_env"
  | "unexpected_response"
  | "supabase_error";

export type RpcError = {
  code: RpcErrorCode;
  message: string;
  details?: string;
  hint?: string;
};

export type RpcResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: RpcError;
    };

export type SurveySession = {
  runId: string;
  submissionToken: string;
};

export type SaveProfilePayload = {
  department_code: string;
  ai_frequency_code: string;
  future_usecases_text: string;
};

export type SaveToolPayload = {
  tool_code: string;
  tool_name: string;
  is_custom: boolean;
  catalog_beheerstatus_code: string;
};

export type SmokeFlowIds = {
  runId: string | null;
  surveyToolId: string | null;
  surveyToolUseCaseId: string | null;
};
