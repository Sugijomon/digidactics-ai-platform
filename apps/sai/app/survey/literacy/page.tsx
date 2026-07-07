"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Award, GraduationCap, Info, Rocket, Wrench } from "lucide-react";
import { SurveyRadioGroup } from "@/components/survey-choice-groups";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  SurveyFooterActions,
  SurveyStepLayout,
  ValidationMessage,
} from "@/components/survey-ui";
import { saveProfile, saveToolPreferenceReasons } from "@/lib/sai-rpc/client";
import {
  markSurveyStepCompleted,
  readSurveySession,
  storeSurveyGuardNotice,
  updateSurveyCurrentStep,
} from "@/lib/sai-rpc/session";
import type { RpcError, SurveySession } from "@/lib/sai-rpc/types";
import {
  canAccessSurveyStep,
  getResumeStep,
  type SurveyStepId,
} from "@/lib/sai-survey/flow";
import {
  aiPolicyAwarenessOptions,
  aiSkillLevelOptions,
  preferenceReasonOptions,
  processingOutputOptions,
} from "@/lib/sai-survey/options";

export default function SurveyLiteracyPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [policyCode, setPolicyCode] = useState("");
  const [preferenceReasonCode, setPreferenceReasonCode] = useState("");
  const [skillCode, setSkillCode] = useState("");
  const [outputCode, setOutputCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      if (!canAccessSurveyStep(storedSession, "literacy")) {
        storeSurveyGuardNotice(
          "We hebben je teruggezet naar de eerstvolgende open stap.",
        );
        router.replace(getResumeStep(storedSession).href);
        return;
      }

      updateSurveyCurrentStep("literacy");
      setSurveySession({
        runId: storedSession.runId,
        submissionToken: storedSession.submissionToken,
      });
      setRunId(storedSession.runId);
      setCompletedSteps(storedSession.completedSteps ?? []);
    });
  }, [router]);

  async function handleSaveLiteracy() {
    if (!surveySession) {
      setError("Geen actieve scan gevonden. Start de scan opnieuw.");
      return;
    }

    if (!policyCode || !preferenceReasonCode || !skillCode || !outputCode) {
      setError("Beantwoord alle vragen voordat je doorgaat.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const profileResult = await saveProfile(surveySession, {
      ai_policy_awareness_code: policyCode,
      ai_skill_level_code: skillCode,
      processing_output_code: outputCode,
    });

    if (!profileResult.ok) {
      finishWithError(profileResult.error);
      return;
    }

    const preferenceResult = await saveToolPreferenceReasons(surveySession, [
      preferenceReasonCode,
    ]);

    if (!preferenceResult.ok) {
      finishWithError(preferenceResult.error);
      return;
    }

    markSurveyStepCompleted("literacy");
    updateSurveyCurrentStep("future");
    setIsSaving(false);
    router.push("/survey/future");
  }

  function finishWithError(rpcError: RpcError) {
    setError(formatRpcError(rpcError));
    setIsSaving(false);
  }

  if (!runId) {
    return (
      <EmptySurveyState>
        Registreer eerst minimaal een tool voordat je deze stap invult.
      </EmptySurveyState>
    );
  }

  return (
    <SurveyStepLayout
      completedSteps={completedSteps}
      currentStep="literacy"
      eyebrow="Vaardigheid & spelregels"
      intro=""
      title="Spelregels voor AI-gebruik"
    >
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSaveLiteracy();
        }}
      >
        <SurveyRadioGroup
          helpText=""
          isDisabled={isSaving}
          label="Ben je bekend met de afspraken en het AI-beleid binnen onze organisatie?"
          name="policy_awareness"
          onChange={setPolicyCode}
          options={aiPolicyAwarenessOptions}
          selectedCode={policyCode}
          validationError={!policyCode ? "Kies een antwoord." : undefined}
        />

        <SurveyRadioGroup
          helpText="Soms werkt een tool buiten onze standaardpakketten simpelweg het best voor jouw taken. Wat is voor jou de belangrijkste reden om zelf voor een specifieke AI-tool te kiezen?"
          isDisabled={isSaving}
          label="Jouw voorkeur voor specifieke tools"
          name="preference_reason"
          onChange={setPreferenceReasonCode}
          options={preferenceReasonOptions}
          selectedCode={preferenceReasonCode}
          validationError={
            !preferenceReasonCode ? "Kies een antwoord." : undefined
          }
        />

        <SkillLevelGrid
          isDisabled={isSaving}
          onChange={setSkillCode}
          options={aiSkillLevelOptions}
          selectedCode={skillCode}
        />

        <SurveyRadioGroup
          helpText=""
          isDisabled={isSaving}
          label="Hoe verwerk je de resultaten (output) van de AI-tool meestal in je werk?"
          name="processing_output"
          onChange={setOutputCode}
          options={processingOutputOptions}
          selectedCode={outputCode}
          validationError={!outputCode ? "Kies een antwoord." : undefined}
        />

        <SelfDirectionDetails />

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        <SurveyFooterActions backHref="/survey/accounts">
          <PrimarySurveyButton disabled={isSaving} isBusy={isSaving} type="submit">
            {isSaving ? "Opslaan..." : "Volgende stap"}
          </PrimarySurveyButton>
        </SurveyFooterActions>
      </form>
    </SurveyStepLayout>
  );
}

function SkillLevelGrid({
  isDisabled,
  onChange,
  options,
  selectedCode,
}: {
  isDisabled: boolean;
  onChange: (code: string) => void;
  options: typeof aiSkillLevelOptions;
  selectedCode: string;
}) {
  return (
    <fieldset className="grid gap-3 border-t border-[#e5e9eb] pt-7">
      <legend className="sr-only">Hoe schat je je eigen AI-vaardigheid in?</legend>
      <div>
        <h3 className="font-headline text-[1.35rem] font-extrabold leading-[1.25] text-[#00658b]">
          Hoe schat je je eigen AI-vaardigheid in?
        </h3>
        <p className="mt-1 text-[14.5px] leading-[1.5] text-[#40484e]">
          Van nieuwsgierige beginner tot pro: help ons het kennisniveau binnen
          de organisatie in kaart te brengen
        </p>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {options.map((option) => {
          const isSelected = selectedCode === option.code;
          const details = getSkillDetails(option.code);

          return (
            <label
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-[1.5px] px-3 py-3.5 text-center transition hover:-translate-y-0.5 hover:border-[#00658b] hover:bg-[#c4e7ff]/20 ${
                isSelected
                  ? "border-[#00658b] bg-[#c4e7ff]/40"
                  : "border-[#bfc7cf] bg-white/70"
              } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
              key={option.code}
            >
              <input
                checked={isSelected}
                className="sr-only"
                disabled={isDisabled}
                name="skill_level"
                onChange={() => onChange(option.code)}
                type="radio"
                value={option.code}
              />
              <span className="grid h-8 w-8 place-items-center rounded-full border border-[#bfc7cf]/80 bg-white text-[#00658b]">
                <details.icon
                  aria-hidden="true"
                  className="h-5 w-5"
                  strokeWidth={2.1}
                />
              </span>
              <span className="text-base font-medium leading-tight text-[#181c1e]">
                {option.label}
              </span>
              <span className="text-sm leading-snug text-[#40484e]">
                {details.description}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function getSkillDetails(code: string) {
  switch (code) {
    case "beginner":
      return {
        description: "Ik probeer het af en toe, vind het nog lastig",
        icon: GraduationCap,
      };
    case "gemiddeld":
      return {
        description: "Ik gebruik het regelmatig voor standaard-taken",
        icon: Wrench,
      };
    case "gevorderd":
      return {
        description: "Ik schrijf goede prompts en ken de mogelijkheden goed",
        icon: Rocket,
      };
    case "expert":
    default:
      return {
        description: "Ik experimenteer actief en help collega's ermee",
        icon: Award,
      };
  }
}

function SelfDirectionDetails() {
  return (
    <details className="group rounded-[1.25rem] border border-[#bfc7cf]/30 bg-[#f1f4f6] p-1 shadow-sm">
      <summary className="flex cursor-pointer items-center gap-2 rounded-xl p-3 transition hover:bg-[#ebeef0]">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#00658b] shadow-sm">
          <Info aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        <span className="flex-1 text-[13px] font-semibold text-[#00658b]">
          Hou zelf de regie: vertrouwen is goed, controleren is beter
        </span>
        <InlineChevron className="mr-1 text-[#40484e] transition group-open:rotate-180" />
      </summary>
      <div className="space-y-3 px-4 pb-4 pt-2 text-[13.5px] leading-relaxed text-[#40484e]">
        <p>
          AI kan overtuigend klinken, maar ook feiten verzinnen (hallucineren)
          of onbewuste vooroordelen (bias) bevatten. Controle op juistheid is
          essentieel om de kwaliteit te waarborgen en te voorkomen dat onjuiste
          informatie je werk beinvloedt.
        </p>
      </div>
    </details>
  );
}

function InlineChevron({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 ${className ?? ""}`}
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
