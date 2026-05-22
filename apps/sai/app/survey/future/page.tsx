"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SurveyCheckboxGroup, SurveyRadioGroup } from "@/components/survey-choice-groups";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  RunIdCard,
  SurveyFooterActions,
  SurveyQuestionBlock,
  SurveyStepLayout,
  ValidationMessage,
} from "@/components/survey-ui";
import { saveConcerns, saveProfile, saveSupportNeeds } from "@/lib/sai-rpc/client";
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
import { supportNeedOptions, topConcernOptions } from "@/lib/sai-survey/options";

export default function SurveyFuturePage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [concernCode, setConcernCode] = useState("");
  const [concernOtherText, setConcernOtherText] = useState("");
  const [futureUsecasesText, setFutureUsecasesText] = useState("");
  const [supportNeedCodes, setSupportNeedCodes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      if (!canAccessSurveyStep(storedSession, "future")) {
        storeSurveyGuardNotice(
          "We hebben je teruggezet naar de eerstvolgende open stap.",
        );
        router.replace(getResumeStep(storedSession).href);
        return;
      }

      updateSurveyCurrentStep("future");
      setSurveySession({
        runId: storedSession.runId,
        submissionToken: storedSession.submissionToken,
      });
      setRunId(storedSession.runId);
      setCompletedSteps(storedSession.completedSteps ?? []);
    });
  }, [router]);

  async function handleSaveFuture() {
    if (!surveySession) {
      setError("Geen actieve scan gevonden. Start de scan opnieuw.");
      return;
    }

    if (!concernCode || supportNeedCodes.length === 0) {
      setError("Beantwoord de zorgen- en ondersteuningsvragen voordat je doorgaat.");
      return;
    }

    if (concernCode === "other" && !concernOtherText.trim()) {
      setError("Vul kort toe wat je andere zorg is.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const concernResult = await saveConcerns(surveySession, [concernCode]);

    if (!concernResult.ok) {
      finishWithError(concernResult.error);
      return;
    }

    const supportResult = await saveSupportNeeds(surveySession, supportNeedCodes);

    if (!supportResult.ok) {
      finishWithError(supportResult.error);
      return;
    }

    const profileResult = await saveProfile(surveySession, {
      future_usecases_text: futureUsecasesText,
      top_concern_other_text:
        concernCode === "other" ? concernOtherText.trim() : undefined,
    });

    if (!profileResult.ok) {
      finishWithError(profileResult.error);
      return;
    }

    markSurveyStepCompleted("future");
    updateSurveyCurrentStep("complete");
    setIsSaving(false);
    router.push("/survey/complete");
  }

  function finishWithError(rpcError: RpcError) {
    setError(formatRpcError(rpcError));
    setIsSaving(false);
  }

  if (!runId) {
    return (
      <EmptySurveyState>
        Registreer eerst minimaal een tool voordat je de toekomststap invult.
      </EmptySurveyState>
    );
  }

  return (
    <SurveyStepLayout
      completedSteps={completedSteps}
      currentStep="future"
      eyebrow="Toekomst & ambities"
      intro="We verzamelen ideeen om te onderzoeken waar AI waarde kan toevoegen en welke ondersteuning medewerkers nodig hebben."
      title="Wat heb je nodig om veilig met AI te werken?"
    >
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSaveFuture();
        }}
      >
        <SurveyRadioGroup
          helpText="Wat is je belangrijkste zorg bij AI-gebruik in je werk?"
          isDisabled={isSaving}
          label="Wat is je grootste zorg bij AI-gebruik?"
          name="top_concern"
          onChange={setConcernCode}
          options={topConcernOptions}
          selectedCode={concernCode}
          validationError={!concernCode ? "Kies een antwoord." : undefined}
        />

        {concernCode === "other" ? (
          <label className="grid gap-2 text-sm font-semibold text-[#181c1e]">
            Toelichting
            <input
              className="h-11 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
              onChange={(event) => setConcernOtherText(event.target.value)}
              placeholder="Toelichting..."
              value={concernOtherText}
            />
          </label>
        ) : null}

        <SurveyQuestionBlock
          helpText="Vul geen namen of gevoelige persoonsgegevens in."
          title="Welke werkzaamheden lenen zich volgens jou goed voor AI-ondersteuning?"
        >
          <textarea
            className="min-h-32 w-full rounded-xl border border-[#bfc7cf] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
            maxLength={500}
            onChange={(event) => setFutureUsecasesText(event.target.value)}
            placeholder="Bijvoorbeeld: vergaderverslagen opstellen, standaard klantvragen beantwoorden, lange rapporten samenvatten..."
            value={futureUsecasesText}
          />
          <p className="text-right text-xs font-medium text-[#6993aa]">
            {futureUsecasesText.length} / 500
          </p>
        </SurveyQuestionBlock>

        <SurveyCheckboxGroup
          helpText="Meerdere antwoorden zijn mogelijk."
          isDisabled={isSaving}
          label="Welke ondersteuning zou jou helpen?"
          onChange={setSupportNeedCodes}
          options={supportNeedOptions}
          selectedCodes={supportNeedCodes}
          validationError={
            supportNeedCodes.length === 0
              ? "Kies minimaal een vorm van ondersteuning."
              : undefined
          }
        />

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        <RunIdCard runId={runId} />

        <SurveyFooterActions backHref="/survey/literacy">
          <PrimarySurveyButton disabled={isSaving} isBusy={isSaving} type="submit">
            {isSaving ? "Opslaan..." : "Naar afronding"}
          </PrimarySurveyButton>
        </SurveyFooterActions>
      </form>
    </SurveyStepLayout>
  );
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
