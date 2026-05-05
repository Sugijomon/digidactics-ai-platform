"use client";

import type { SurveySession } from "@/lib/sai-rpc/types";

const SURVEY_SESSION_STORAGE_KEY = "sai.respondent.session";

export type StoredSurveySession = SurveySession & {
  startedAt: string;
  currentStep: string;
  surveyToolId?: string;
  surveyToolUseCaseId?: string;
};

function isStoredSurveySession(value: unknown): value is StoredSurveySession {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.runId === "string" &&
    typeof candidate.submissionToken === "string" &&
    typeof candidate.startedAt === "string" &&
    typeof candidate.currentStep === "string"
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
      "currentStep" | "surveyToolId" | "surveyToolUseCaseId"
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
