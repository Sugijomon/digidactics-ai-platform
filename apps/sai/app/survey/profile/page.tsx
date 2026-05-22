"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  RunIdCard,
  SurveyFooterActions,
  SurveyQuestionBlock,
  SurveyStepLayout,
} from "@/components/survey-ui";
import { saveProfile } from "@/lib/sai-rpc/client";
import {
  markSurveyStepCompleted,
  readSurveySession,
  updateSurveyCurrentStep,
} from "@/lib/sai-rpc/session";
import type { RpcError, SurveySession } from "@/lib/sai-rpc/types";
import type { SurveyStepId } from "@/lib/sai-survey/flow";
import { departmentOptions } from "@/lib/sai-survey/options";

export default function SurveyProfilePage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [selectedVakgebied, setSelectedVakgebied] = useState("");
  const [departmentOtherText, setDepartmentOtherText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      updateSurveyCurrentStep("profile");
      setSurveySession({
        runId: storedSession.runId,
        submissionToken: storedSession.submissionToken,
      });
      setRunId(storedSession.runId);
      setCompletedSteps(storedSession.completedSteps ?? []);
    });
  }, []);

  async function handleSubmit() {
    if (!surveySession) {
      setError("Geen actieve scan gevonden. Start de scan opnieuw.");
      return;
    }

    if (!selectedVakgebied) {
      setError("Kies je vakgebied voordat je doorgaat.");
      return;
    }

    if (selectedVakgebied === "anders" && !departmentOtherText.trim()) {
      setError("Vul jouw vakgebied in.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await saveProfile(surveySession, {
      department_code: selectedVakgebied,
      department_other_text:
        selectedVakgebied === "anders" ? departmentOtherText.trim() : undefined,
    });

    if (!result.ok) {
      setError(formatRpcError(result.error));
      setIsSaving(false);
      return;
    }

    markSurveyStepCompleted("profile");
    updateSurveyCurrentStep("motivations");
    setIsSaving(false);
    router.push("/survey/motivations");
  }

  if (!runId) {
    return (
      <EmptySurveyState>
        Start eerst een scan zodat je veilig verder kunt.
      </EmptySurveyState>
    );
  }

  return (
    <SurveyStepLayout
      completedSteps={completedSteps}
      currentStep="profile"
      eyebrow="Jouw werkplek"
      intro="We vragen naar je vakgebied om patronen op groepsniveau te kunnen duiden. Dit is geen controle op individuen."
      maxWidthClassName="max-w-2xl"
      title="Binnen welk vakgebied ben je voornamelijk actief?"
    >
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <SurveyQuestionBlock
          error={error ?? undefined}
          helpText="Kies het domein dat het beste aansluit bij jouw rol of expertise."
          required
          title="Jouw werkplek"
        >
          <div className="grid gap-2 md:grid-cols-2">
            {departmentOptions.map((option) => (
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:shadow-[0_4px_12px_rgba(0,101,139,0.06)] ${
                  selectedVakgebied === option.code
                    ? "border-[#00658b] bg-[#f1f4f6]"
                    : "border-[#bfc7cf] bg-white"
                }`}
                key={option.code}
              >
                <input
                  checked={selectedVakgebied === option.code}
                  className="h-5 w-5 accent-[#00658b]"
                  name="department_code"
                  onChange={() => setSelectedVakgebied(option.code)}
                  type="radio"
                  value={option.code}
                />
                <span className="text-sm font-semibold text-[#181c1e]">
                  {option.label}
                </span>
              </label>
            ))}
          </div>

          {selectedVakgebied === "anders" ? (
            <label className="mt-3 grid gap-2 text-sm font-semibold text-[#181c1e]">
              Vul jouw vakgebied in
              <input
                className="h-11 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
                onChange={(event) => setDepartmentOtherText(event.target.value)}
                placeholder="Vul jouw vakgebied in..."
                value={departmentOtherText}
              />
            </label>
          ) : null}
        </SurveyQuestionBlock>

        <RunIdCard runId={runId} />

        <SurveyFooterActions backHref="/survey">
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
