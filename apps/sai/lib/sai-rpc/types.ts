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
  productCode?: "sai" | "ai_foto";
  methodVersion?: string;
};

export type SaveProfilePayload = {
  department_code?: string;
  department_other_text?: string;
  ai_frequency_code?: string;
  no_ai_reason_code?: string;
  data_awareness_code?: string;
  anonymization_behavior_code?: string;
  browser_extension_usage_code?: string;
  automation_usage_code?: string;
  ai_policy_awareness_code?: string;
  ai_skill_level_code?: string;
  processing_output_code?: string;
  ai_foto_doubt_scenario_code?: string;
  top_concern_other_text?: string;
  future_usecases_text?: string;
};

export type SaveMotivationItem = {
  code: string;
  other_text?: string;
};

export type SaveToolPayload = {
  tool_code?: string;
  tool_name: string;
  is_custom: boolean;
  catalog_beheerstatus_code: string;
};

export type SaveSurveyApplicationSkillResponse = {
  skill_domain_code: string;
  skill_response_code: string;
};

export type SaveSurveyApplicationPayload = {
  survey_tool_id: string;
  survey_tool_use_case_id?: string;
  depth_rank?: "primary" | "secondary";
  task_description_limited?: string;
  application_frequency_code?: string;
  account_environment_code?: string;
  output_destination_code?: string;
  output_control_code?: string;
  deviation_authority_code?: string;
  people_impact_code?: string;
  ai_visibility_code?: string;
  transparency_code?: string;
  beneficiary_code?: string;
  net_effect_code?: string;
  control_rework_code?: string;
  shareability_code?: string;
  value_evidence_code?: string;
  escalation_route_awareness_code?: string;
  data_type_codes?: string[];
  value_type_codes?: string[];
  condition_need_codes?: string[];
  near_miss_signal_codes?: string[];
  support_need_codes?: string[];
  skill_responses?: SaveSurveyApplicationSkillResponse[];
};

export type SmokeFlowIds = {
  runId: string | null;
  surveyToolId: string | null;
  surveyToolUseCaseId: string | null;
};
