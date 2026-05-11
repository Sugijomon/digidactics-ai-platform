"use client";

import type { SurveySession } from "@/lib/sai-rpc/types";
import type { SurveyStepId } from "@/lib/sai-survey/flow";

const SURVEY_SESSION_STORAGE_KEY = "sai.respondent.session";
const SURVEY_GUARD_NOTICE_STORAGE_KEY = "sai.respondent.guard_notice";

export type SurveyGuardNotice = {
  message: string;
  createdAt: string;
};

export type StoredSurveyTool = {
  surveyToolId: string;
  toolName: string;
  useCaseCodes: string[];
  contextCodes: string[];
  accountTypeCode: string;
  savedAt: string;
};

export type PendingSurveyTool = {
  surveyToolId: string;
  toolName: string;
  registeredAt: string;
  useCaseCodes?: string[];
  contextCodes?: string[];
  surveyToolUseCaseIds?: string[];
};

export type StoredSurveySession = SurveySession & {
  startedAt: string;
  currentStep: SurveyStepId;
  completedSteps?: SurveyStepId[];
  surveyToolId?: string;
  surveyToolUseCaseId?: string;
  pendingTool?: PendingSurveyTool;
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
    isSurveyStepId(candidate.currentStep) &&
    (candidate.completedSteps === undefined ||
      isSurveyStepIds(candidate.completedSteps)) &&
    (candidate.pendingTool === undefined ||
      isPendingSurveyTool(candidate.pendingTool)) &&
    (savedTools === undefined || isStoredSurveyTools(savedTools))
  );
}

function isSurveyStepId(value: unknown): value is SurveyStepId {
  return (
    value === "profile" ||
    value === "motivations" ||
    value === "data" ||
    value === "tools" ||
    value === "useCases" ||
    value === "accounts" ||
    value === "complete"
  );
}

function isSurveyStepIds(value: unknown): value is SurveyStepId[] {
  return Array.isArray(value) && value.every(isSurveyStepId);
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

function isPendingSurveyTool(value: unknown): value is PendingSurveyTool {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.surveyToolId === "string" &&
    typeof candidate.toolName === "string" &&
    typeof candidate.registeredAt === "string" &&
    (candidate.useCaseCodes === undefined ||
      isStringArray(candidate.useCaseCodes)) &&
    (candidate.contextCodes === undefined ||
      isStringArray(candidate.contextCodes)) &&
    (candidate.surveyToolUseCaseIds === undefined ||
      isStringArray(candidate.surveyToolUseCaseIds))
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function storeSurveySession(
  session: SurveySession,
  currentStep: SurveyStepId,
) {
  const storedSession: StoredSurveySession = {
    ...session,
    startedAt: new Date().toISOString(),
    currentStep,
    completedSteps: [],
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

    if (isStoredSurveySession(parsedSession)) {
      return parsedSession;
    }

    clearSurveySession();
    return null;
  } catch {
    clearSurveySession();
    return null;
  }
}

export function updateSurveyCurrentStep(currentStep: SurveyStepId) {
  updateSurveySession({ currentStep });
}

export function markSurveyStepCompleted(step: SurveyStepId) {
  const existingSession = readSurveySession();

  if (!existingSession) {
    return;
  }

  const completedSteps = new Set(existingSession.completedSteps ?? []);
  completedSteps.add(step);

  updateSurveySession({ completedSteps: Array.from(completedSteps) });
}

export function updateSurveySession(
  updates: Partial<
    Pick<
      StoredSurveySession,
      | "completedSteps"
      | "currentStep"
      | "pendingTool"
      | "surveyToolId"
      | "surveyToolUseCaseId"
      | "savedTools"
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

export function storeSurveyGuardNotice(message: string) {
  const notice: SurveyGuardNotice = {
    message,
    createdAt: new Date().toISOString(),
  };

  window.sessionStorage.setItem(
    SURVEY_GUARD_NOTICE_STORAGE_KEY,
    JSON.stringify(notice),
  );
}

export function consumeSurveyGuardNotice(): SurveyGuardNotice | null {
  const rawNotice = window.sessionStorage.getItem(
    SURVEY_GUARD_NOTICE_STORAGE_KEY,
  );

  if (!rawNotice) {
    return null;
  }

  window.sessionStorage.removeItem(SURVEY_GUARD_NOTICE_STORAGE_KEY);

  try {
    const parsedNotice: unknown = JSON.parse(rawNotice);

    return isSurveyGuardNotice(parsedNotice) ? parsedNotice : null;
  } catch {
    return null;
  }
}

function isSurveyGuardNotice(value: unknown): value is SurveyGuardNotice {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.message === "string" &&
    typeof candidate.createdAt === "string"
  );
}
