import type { StoredSurveySession } from "@/lib/sai-rpc/session";

export type SurveyStepId =
  | "profile"
  | "motivations"
  | "tools"
  | "useCases"
  | "application"
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

export const aiFotoSurveySteps = [
  { id: "profile", label: "Werkplek", href: "/survey/profile" },
  { id: "motivations", label: "Frequentie", href: "/survey/motivations" },
  { id: "tools", label: "Tools", href: "/survey/tools" },
  {
    id: "application",
    label: "Toepassing",
    href: "/survey/application",
  },
  { id: "data", label: "Data", href: "/survey/data" },
  { id: "accounts", label: "Account", href: "/survey/accounts" },
  { id: "literacy", label: "Spelregels", href: "/survey/literacy" },
  { id: "future", label: "Toekomst", href: "/survey/future" },
  { id: "complete", label: "Afronden", href: "/survey/complete" },
] satisfies SurveyStep[];

export function getSurveySteps(session?: Pick<StoredSurveySession, "productCode"> | null) {
  return isAiFotoSession(session) ? aiFotoSurveySteps : surveySteps;
}

export function getSurveyStep(stepId: SurveyStepId) {
  return (
    [...surveySteps, ...aiFotoSurveySteps].find((step) => step.id === stepId) ??
    surveySteps[0]
  );
}

export function canAccessSurveyStep(
  session: StoredSurveySession,
  stepId: SurveyStepId,
) {
  const steps = getSurveySteps(session);

  if (stepId === "profile") {
    return true;
  }

  if (stepId === "application" && !isAiFotoSession(session)) {
    return false;
  }

  if (
    (stepId === "literacy" ||
      stepId === "future" ||
      stepId === "complete") &&
    (session.savedTools?.length ?? 0) === 0 &&
    !session.noToolsExitPath
  ) {
    return false;
  }

  if (
    (stepId === "useCases" || stepId === "application" || stepId === "accounts") &&
    !hasPendingTool(session)
  ) {
    return false;
  }

  const requestedIndex = getStepIndex(steps, stepId);
  const priorSteps = session.noToolsExitPath
    ? steps
        .slice(0, requestedIndex)
        .filter(
          (step) =>
            ![
              "tools",
              "useCases",
              "application",
              "data",
              "accounts",
              "literacy",
            ].includes(step.id),
        )
    : steps.slice(0, requestedIndex);

  return priorSteps.every((step) => session.completedSteps?.includes(step.id));
}

export function getResumeStep(session: StoredSurveySession) {
  const steps = getSurveySteps(session);
  const firstIncompleteStep = steps.find(
    (step) => !session.completedSteps?.includes(step.id),
  );

  if (!firstIncompleteStep) {
    return getSurveyStep("complete");
  }

  if (
    firstIncompleteStep.id === "complete" &&
    (session.savedTools?.length ?? 0) === 0 &&
    !session.noToolsExitPath
  ) {
    return getSurveyStep("tools");
  }

  if (
    session.noToolsExitPath &&
    ["tools", "useCases", "application", "data", "accounts", "literacy"].includes(
      firstIncompleteStep.id,
    )
  ) {
    return getSurveyStep("future");
  }

  if (firstIncompleteStep.id === "accounts" && !hasPendingTool(session)) {
    return getSurveyStep("tools");
  }

  return firstIncompleteStep;
}

function hasPendingTool(session: StoredSurveySession) {
  return Boolean(session.pendingTool || (session.pendingTools?.length ?? 0) > 0);
}

function getStepIndex(steps: SurveyStep[], stepId: SurveyStepId) {
  return steps.findIndex((step) => step.id === stepId);
}

function isAiFotoSession(
  session?: Pick<StoredSurveySession, "productCode"> | null,
) {
  return session?.productCode === "ai_foto";
}
