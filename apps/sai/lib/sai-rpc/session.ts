"use client";

import type { SurveySession } from "@/lib/sai-rpc/types";

const SURVEY_SESSION_STORAGE_KEY = "sai.respondent.session";

export type StoredSurveyTool = {
  surveyToolId: string;
  toolName: string;
  useCaseCodes: string[];
  contextCodes: string[];
  accountTypeCode: string;
  savedAt: string;
};

export type StoredSurveySession = SurveySession & {
  startedAt: string;
  currentStep: string;
  surveyToolId?: string;
  surveyToolUseCaseId?: string;
  savedTools?: StoredSurveyTool[];
};

function isStoredSurveySession(value: unknown): value is StoredSurveySession {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  const savedTools = candidate.savedTools;

  return (
    typeof candidate.runId === "string" &&
    typeof candidate.submissionToken === "string" &&
    typeof candidate.startedAt === "string" &&
    typeof candidate.currentStep === "string" &&
    (savedTools === undefined || isStoredSurveyTools(savedTools))
  );
}

function isStoredSurveyTools(value: unknown): value is StoredSurveyTool[] {
  return (
    Array.isArray(value) &&
    value.every((tool) => {
      if (typeof tool !== "object" || tool === null || Array.isArray(tool)) {
        return false;
      }

      const candidate = tool as Record<string, unknown>;

      return (
        typeof candidate.surveyToolId === "string" &&
        typeof candidate.toolName === "string" &&
        Array.isArray(candidate.useCaseCodes) &&
        candidate.useCaseCodes.every((code) => typeof code === "string") &&
        Array.isArray(candidate.contextCodes) &&
        candidate.contextCodes.every((code) => typeof code === "string") &&
        typeof candidate.accountTypeCode === "string" &&
        typeof candidate.savedAt === "string"
      );
    })
  );
}

export function storeSurveySession(
  session: SurveySession,
  currentStep: string,
) {
  const storedSession: StoredSurveySession = {
    ...session,
    startedAt: new Date().toISOString(),
    currentStep,
  };

  window.sessionStorage.setItem(
    SURVEY_SESSION_STORAGE_KEY,
    JSON.stringify(storedSession),
  );
}

export function readSurveySession(): StoredSurveySession | null {
  const rawSession = window.sessionStorage.getItem(SURVEY_SESSION_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession: unknown = JSON.parse(rawSession);

    return isStoredSurveySession(parsedSession) ? parsedSession : null;
  } catch {
    return null;
  }
}

export function updateSurveyCurrentStep(currentStep: string) {
  updateSurveySession({ currentStep });
}

export function updateSurveySession(
  updates: Partial<
    Pick<
      StoredSurveySession,
      "currentStep" | "surveyToolId" | "surveyToolUseCaseId" | "savedTools"
    >
  >,
) {
  const existingSession = readSurveySession();

  if (!existingSession) {
    return;
  }

  window.sessionStorage.setItem(
    SURVEY_SESSION_STORAGE_KEY,
    JSON.stringify({ ...existingSession, ...updates }),
  );
}

export function clearSurveySession() {
  window.sessionStorage.removeItem(SURVEY_SESSION_STORAGE_KEY);
}
