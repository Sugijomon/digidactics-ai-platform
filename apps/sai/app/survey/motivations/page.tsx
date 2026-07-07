"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SurveyCheckboxGroup, SurveyRadioGroup } from "@/components/survey-choice-groups";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  SurveyFooterActions,
  SurveyQuestionBlock,
  SurveyStepLayout,
  ValidationMessage,
} from "@/components/survey-ui";
import { saveMotivations, saveProfile } from "@/lib/sai-rpc/client";
import {
  markSurveyStepCompleted,
  readSurveySession,
  storeSurveyGuardNotice,
  updateSurveyCurrentStep,
  updateSurveySession,
} from "@/lib/sai-rpc/session";
import type { RpcError, SurveySession } from "@/lib/sai-rpc/types";
import {
  canAccessSurveyStep,
  getResumeStep,
  type SurveyStepId,
} from "@/lib/sai-survey/flow";
import {
  aiFrequencyOptions,
  motivationOptions,
  noAiReasonOptions,
} from "@/lib/sai-survey/options";

export default function SurveyMotivationsPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [aiFrequencyCode, setAiFrequencyCode] = useState("");
  const [noAiReasonCode, setNoAiReasonCode] = useState("");
  const [selectedMotivations, setSelectedMotivations] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      if (!canAccessSurveyStep(storedSession, "motivations")) {
        storeSurveyGuardNotice(
          "We hebben je teruggezet naar de eerstvolgende open stap.",
        );
        router.replace(getResumeStep(storedSession).href);
        return;
      }

      updateSurveyCurrentStep("motivations");
      setSurveySession({
        runId: storedSession.runId,
        submissionToken: storedSession.submissionToken,
      });
      setRunId(storedSession.runId);
      setCompletedSteps(storedSession.completedSteps ?? []);
    });
  }, [router]);

  async function handleSaveMotivations() {
    if (!surveySession) {
      setError("Geen actieve scan gevonden. Start de scan opnieuw.");
      return;
    }

    if (!aiFrequencyCode) {
      setError("Kies hoe vaak je AI-tools gebruikt.");
      return;
    }

    if (aiFrequencyCode === "never" && !noAiReasonCode) {
      setError("Kies wat de belangrijkste reden is dat je nu geen AI gebruikt.");
      return;
    }

    if (aiFrequencyCode !== "never" && selectedMotivations.length === 0) {
      setError("Kies minimaal een motivatie voordat je doorgaat.");
      return;
    }

    if (selectedMotivations.includes("anders") && !otherText.trim()) {
      setError("Vul kort in wat je andere motivatie is.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const profileResult = await saveProfile(surveySession, {
      ai_frequency_code: aiFrequencyCode,
      no_ai_reason_code: aiFrequencyCode === "never" ? noAiReasonCode : undefined,
    });

    if (!profileResult.ok) {
      finishWithError(profileResult.error);
      return;
    }

    if (aiFrequencyCode !== "never") {
      const motivationResult = await saveMotivations(
        surveySession,
        selectedMotivations.map((code) => ({
          code,
          other_text: code === "anders" ? otherText : undefined,
        })),
      );

      if (!motivationResult.ok) {
        finishWithError(motivationResult.error);
        return;
      }
    }

    markSurveyStepCompleted("motivations");

    if (aiFrequencyCode === "never") {
      updateSurveySession({
        currentStep: "future",
        noToolsExitPath: true,
        pendingTool: undefined,
        pendingTools: [],
        savedTools: [],
      });
      setIsSaving(false);
      router.push("/survey/future");
      return;
    }

    updateSurveySession({ noToolsExitPath: false });
    updateSurveyCurrentStep("tools");
    setIsSaving(false);
    router.push("/survey/tools");
  }

  function finishWithError(rpcError: RpcError) {
    setError(formatRpcError(rpcError));
    setIsSaving(false);
  }

  if (!runId) {
    return (
      <EmptySurveyState>
        Start eerst een scan en kies je werkplek voordat je deze stap invult.
      </EmptySurveyState>
    );
  }

  return (
    <SurveyStepLayout
      completedSteps={completedSteps}
      currentStep="motivations"
      eyebrow="Gebruik en frequentie"
      intro="Onder AI-tools verstaan we slimme software die tekst, afbeeldingen, code of berekeningen voor je kan genereren of verbeteren. Ook het af en toe herschrijven van een e-mail, het samenvatten van een vergadering of het vertalen van een kort tekstblok telt als AI-gebruik."
      title="Hoe vaak gebruik je AI-tools voor je werk?"
    >
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSaveMotivations();
        }}
      >
        <SurveyRadioGroup
          helpText=""
          isDisabled={isSaving}
          label="Hoe vaak gebruik je AI-tools voor je werk?"
          name="ai_frequency"
          onChange={setAiFrequencyCode}
          options={aiFrequencyOptions}
          selectedCode={aiFrequencyCode}
          validationError={!aiFrequencyCode ? "Kies een antwoord." : undefined}
        />

        {aiFrequencyCode === "never" ? (
          <SurveyRadioGroup
            helpText="Wat is de belangrijkste reden?"
            isDisabled={isSaving}
            label="Wat is de belangrijkste reden?"
            name="no_ai_reason"
            onChange={setNoAiReasonCode}
            options={noAiReasonOptions}
            selectedCode={noAiReasonCode}
            validationError={!noAiReasonCode ? "Kies een antwoord." : undefined}
          />
        ) : null}

        {aiFrequencyCode && aiFrequencyCode !== "never" ? (
          <>
            <SurveyCheckboxGroup
              helpText="Meerdere antwoorden mogelijk."
              isDisabled={isSaving}
              label="Waarom gebruik je AI-tools in je werk?"
              onChange={setSelectedMotivations}
              options={motivationOptions}
              selectedCodes={selectedMotivations}
              validationError={
                selectedMotivations.length === 0
                  ? "Kies minimaal een motivatie."
                  : undefined
              }
            />
            {selectedMotivations.includes("anders") ? (
              <SurveyQuestionBlock
                helpText="Houd het kort en deel geen persoonsgegevens."
                title="Andere motivatie"
              >
                <input
                  className="h-11 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
                  onChange={(event) => setOtherText(event.target.value)}
                  placeholder="Bijvoorbeeld: klantvraag of projectdruk"
                  value={otherText}
                />
              </SurveyQuestionBlock>
            ) : null}
          </>
        ) : null}

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        <SurveyFooterActions backHref="/survey/profile">
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
