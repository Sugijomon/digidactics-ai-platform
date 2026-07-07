import type { SurveyStepId } from "@/lib/sai-survey/flow";

const visualStepBySurveyStep: Record<SurveyStepId, number> = {
  profile: 1,
  motivations: 2,
  tools: 3,
  useCases: 3,
  data: 3,
  accounts: 4,
  literacy: 4,
  future: 5,
  complete: 5,
};

const VISUAL_STEP_COUNT = 5;

export function SurveyProgress({
  currentStep,
}: {
  completedSteps: SurveyStepId[];
  currentStep: SurveyStepId;
}) {
  const currentVisualStep = visualStepBySurveyStep[currentStep];

  return (
    <nav
      aria-label="Survey voortgang"
      className="min-w-0 max-w-full"
    >
      <div className="flex items-center gap-3">
        <ol className="flex min-w-0 flex-1 gap-1.5">
          {Array.from({ length: VISUAL_STEP_COUNT }, (_, index) => {
            const stepNumber = index + 1;
            const isReached = stepNumber <= currentVisualStep;

            return (
              <li
                aria-current={stepNumber === currentVisualStep ? "step" : undefined}
                aria-label={`Stap ${stepNumber} van ${VISUAL_STEP_COUNT}`}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  isReached ? "bg-[#00658b]" : "bg-[#e5e9eb]"
                }`}
                key={stepNumber}
              />
            );
          })}
        </ol>
        <span className="shrink-0 text-xs font-medium text-[#40484e]">
          Stap {currentVisualStep} van {VISUAL_STEP_COUNT}
        </span>
      </div>
    </nav>
  );
}
