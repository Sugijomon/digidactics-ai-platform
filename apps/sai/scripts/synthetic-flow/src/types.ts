// Local/staging synthetic-flow script types.
//
// Deliberately duplicated (not imported) from apps/sai/lib/sai-rpc/types.ts:
// this script is compiled standalone with `tsc` + plain `node` (see
// ../tsconfig.json), outside the Next.js module resolution/bundler setup,
// so it does not share a TS project with the app source.

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type SurveySession = {
  runId: string;
  submissionToken: string;
};

export type SaveProfilePayload = {
  department_code?: string;
  ai_frequency_code?: string;
  no_ai_reason_code?: string;
  automation_usage_code?: string;
  browser_extension_usage_code?: string;
};

export type SaveToolPayload = {
  tool_code?: string;
  tool_name: string;
  is_custom: boolean;
  catalog_beheerstatus_code: string;
};

export type ScenarioToolDefinition = {
  tool_code?: string;
  tool_name: string;
  is_custom: boolean;
  catalog_beheerstatus_code: string;
  use_case_code: string;
  context_codes: string[];
  account_type_code: string;
  registerDiscovery?: boolean;
};

export type ScenarioDefinition = {
  id: string;
  label: string;
  departments: string[];
  defaultRepeat: number;
  profile: SaveProfilePayload;
  dataTypeCodes: string[];
  tool?: ScenarioToolDefinition;
};

export type RunResult = {
  scenarioId: string;
  departmentCode: string;
  runId: string;
};
