"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SurveyRadioGroup } from "@/components/survey-choice-groups";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  RunIdCard,
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
      intro="Deze vragen gaan niet over controle, maar over wat de organisatie moet uitleggen, ondersteunen en faciliteren."
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
          helpText="Ben je bekend met de afspraken en het AI-beleid binnen onze organisatie?"
          isDisabled={isSaving}
          label="Spelregels voor AI-gebruik"
          name="policy_awareness"
          onChange={setPolicyCode}
          options={aiPolicyAwarenessOptions}
          selectedCode={policyCode}
          validationError={!policyCode ? "Kies een antwoord." : undefined}
        />

        <SurveyRadioGroup
          helpText="Waarom kies je soms voor een bepaalde AI-tool?"
          isDisabled={isSaving}
          label="Waarom gebruik je deze tool graag?"
          name="preference_reason"
          onChange={setPreferenceReasonCode}
          options={preferenceReasonOptions}
          selectedCode={preferenceReasonCode}
          validationError={
            !preferenceReasonCode ? "Kies een antwoord." : undefined
          }
        />

        <SurveyRadioGroup
          helpText="Van nieuwsgierige beginner tot pro: help ons het kennisniveau in kaart te brengen."
          isDisabled={isSaving}
          label="Hoe schat je je eigen AI-vaardigheid in?"
          name="skill_level"
          onChange={setSkillCode}
          options={aiSkillLevelOptions}
          selectedCode={skillCode}
          validationError={!skillCode ? "Kies een antwoord." : undefined}
        />

        <SurveyRadioGroup
          helpText="Hoe verwerk je resultaten van AI-tools meestal in je werk?"
          isDisabled={isSaving}
          label="Hoe verwerk je de output van AI meestal?"
          name="processing_output"
          onChange={setOutputCode}
          options={processingOutputOptions}
          selectedCode={outputCode}
          validationError={!outputCode ? "Kies een antwoord." : undefined}
        />

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        <RunIdCard runId={runId} />

        <SurveyFooterActions backHref="/survey/accounts">
          <PrimarySurveyButton disabled={isSaving} isBusy={isSaving} type="submit">
            {isSaving ? "Opslaan..." : "Volgende stap"}
          </PrimarySurveyButton>
        </SurveyFooterActions>
      </form>
    </SurveyStepLayout>
  );
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
