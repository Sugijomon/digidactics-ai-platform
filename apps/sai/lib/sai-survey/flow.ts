import type { StoredSurveySession } from "@/lib/sai-rpc/session";

export type SurveyStepId =
  | "profile"
  | "motivations"
  | "tools"
  | "useCases"
  | "data"
  | "accounts"
  | "literacy"
  | "future"
  | "complete";

export type SurveyStep = {
  id: SurveyStepId;
  label: string;
  href: string;
};

export const surveySteps = [
  { id: "profile", label: "Werkplek", href: "/survey/profile" },
  { id: "motivations", label: "Frequentie", href: "/survey/motivations" },
  { id: "tools", label: "Tools", href: "/survey/tools" },
  { id: "data", label: "Data", href: "/survey/data" },
  { id: "accounts", label: "Account", href: "/survey/accounts" },
  { id: "literacy", label: "Spelregels", href: "/survey/literacy" },
  { id: "future", label: "Toekomst", href: "/survey/future" },
  { id: "complete", label: "Afronden", href: "/survey/complete" },
] satisfies SurveyStep[];

export function getSurveyStep(stepId: SurveyStepId) {
  return surveySteps.find((step) => step.id === stepId) ?? surveySteps[0];
}

export function canAccessSurveyStep(
  session: StoredSurveySession,
  stepId: SurveyStepId,
) {
  if (stepId === "profile") {
    return true;
  }

  if (
    (stepId === "literacy" ||
      stepId === "future" ||
      stepId === "complete") &&
    (session.savedTools?.length ?? 0) === 0
  ) {
    return false;
  }

  if (
    (stepId === "useCases" || stepId === "accounts") &&
    !hasPendingTool(session)
  ) {
    return false;
  }

  const requestedIndex = getStepIndex(stepId);
  const priorSteps = surveySteps.slice(0, requestedIndex);

  return priorSteps.every((step) => session.completedSteps?.includes(step.id));
}

export function getResumeStep(session: StoredSurveySession) {
  const firstIncompleteStep = surveySteps.find(
    (step) => !session.completedSteps?.includes(step.id),
  );

  if (!firstIncompleteStep) {
    return getSurveyStep("complete");
  }

  if (
    firstIncompleteStep.id === "complete" &&
    (session.savedTools?.length ?? 0) === 0
  ) {
    return getSurveyStep("tools");
  }

  if (firstIncompleteStep.id === "accounts" && !hasPendingTool(session)) {
    return getSurveyStep("tools");
  }

  return firstIncompleteStep;
}

function hasPendingTool(session: StoredSurveySession) {
  return Boolean(session.pendingTool || (session.pendingTools?.length ?? 0) > 0);
}

function getStepIndex(stepId: SurveyStepId) {
  return surveySteps.findIndex((step) => step.id === stepId);
}
