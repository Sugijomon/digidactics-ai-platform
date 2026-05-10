import type { SurveyStepId } from "@/lib/sai-survey/flow";
import { surveySteps } from "@/lib/sai-survey/flow";

export function SurveyProgress({
  completedSteps,
  currentStep,
}: {
  completedSteps: SurveyStepId[];
  currentStep: SurveyStepId;
}) {
  return (
    <nav
      aria-label="Survey voortgang"
      className="rounded-2xl border border-[#bfc7cf]/50 bg-white/80 p-3 shadow-sm"
    >
      <ol className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {surveySteps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);

          return (
            <li
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                isCurrent
                  ? "border-[#00658b] bg-[#c4e7ff]/40 text-[#00658b]"
                  : "border-[#bfc7cf]/60 bg-white text-[#40484e]"
              }`}
              key={step.id}
            >
              <span className="block text-[10px] uppercase tracking-wide opacity-70">
                {isCompleted ? "Klaar" : `Stap ${index + 1}`}
              </span>
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
