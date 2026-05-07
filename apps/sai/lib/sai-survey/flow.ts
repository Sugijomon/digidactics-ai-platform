import type { StoredSurveySession } from "@/lib/sai-rpc/session";

export type SurveyStepId =
  | "profile"
  | "motivations"
  | "data"
  | "tools"
  | "complete";

export type SurveyStep = {
  id: SurveyStepId;
  label: string;
  href: string;
};

export const surveySteps = [
  { id: "profile", label: "Profiel", href: "/survey/profile" },
  { id: "motivations", label: "Motivatie", href: "/survey/motivations" },
  { id: "data", label: "Data", href: "/survey/data" },
  { id: "tools", label: "Tools", href: "/survey/tools" },
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

  if (stepId === "complete" && (session.savedTools?.length ?? 0) === 0) {
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

  return firstIncompleteStep;
}

function getStepIndex(stepId: SurveyStepId) {
  return surveySteps.findIndex((step) => step.id === stepId);
}
