"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  RequiredBadge,
  RunIdCard,
  SurveyFooterActions,
  SurveyStepLayout,
  SurveySummaryGrid,
  SurveySummaryItem,
  ValidationMessage,
} from "@/components/survey-ui";
import { saveMotivations } from "@/lib/sai-rpc/client";
import {
  markSurveyStepCompleted,
  readSurveySession,
  updateSurveyCurrentStep,
} from "@/lib/sai-rpc/session";
import type { RpcError, SurveySession } from "@/lib/sai-rpc/types";
import {
  canAccessSurveyStep,
  getResumeStep,
  type SurveyStepId,
} from "@/lib/sai-survey/flow";
import {
  motivationOptions,
  type SurveyOption,
} from "@/lib/sai-survey/options";

type MotivationValidationErrors = Partial<
  Record<"selectedMotivations" | "otherText", string>
>;

export default function SurveyMotivationsPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(
    null,
  );
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [selectedMotivations, setSelectedMotivations] = useState([
    "tijdswinst",
    "kwaliteitsverbetering",
  ]);
  const [otherText, setOtherText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] =
    useState<MotivationValidationErrors>({});

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      if (!canAccessSurveyStep(storedSession, "motivations")) {
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
      setError("Geen actieve respondent session gevonden. Start de scan opnieuw.");
      return;
    }

    setError(null);
    setValidationErrors({});

    const nextValidationErrors = validateMotivationsForm({
      otherText,
      selectedMotivations,
    });

    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors);
      setError("Controleer de gemarkeerde motivatievragen voordat je doorgaat.");
      return;
    }

    setIsSaving(true);

    const result = await saveMotivations(
      surveySession,
      selectedMotivations.map((code) => ({
        code,
        other_text: code === "anders" ? otherText : undefined,
      })),
    );

    if (!result.ok) {
      setError(formatRpcError(result.error));
      setIsSaving(false);
      return;
    }

    markSurveyStepCompleted("motivations");
    updateSurveyCurrentStep("data");
    router.push("/survey/data");
  }

  if (!runId) {
    return (
      <EmptySurveyState>
        Start eerst een scan en sla de profielstap op voordat je motivaties
        invult.
      </EmptySurveyState>
    );
  }

  return (
    <SurveyStepLayout
      completedSteps={completedSteps}
      currentStep="motivations"
      eyebrow="Gebruikssignaal"
      intro="Kies een of meer redenen waarom AI voor jou waardevol is in je werk."
      title="Waarom gebruik je AI-tools in je werk?"
    >

          <MotivationAnswerSummary
            selectedCount={selectedMotivations.length}
            selectedLabels={getSelectedMotivationLabels(selectedMotivations)}
          />

          <form
            className="grid gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveMotivations();
            }}
          >
            <MotivationGroup
              error={validationErrors.selectedMotivations}
              onChange={setSelectedMotivations}
              options={motivationOptions}
              selectedCodes={selectedMotivations}
            />

            {selectedMotivations.includes("anders") ? (
              <label className="grid gap-2 text-sm font-semibold text-[#181c1e]">
                Andere motivatie
                <input
                  className="h-11 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
                  onChange={(event) => setOtherText(event.target.value)}
                  placeholder="Bijvoorbeeld: verplicht vanuit project of klantvraag"
                  type="text"
                  value={otherText}
                />
                {validationErrors.otherText ? (
                  <span className="text-xs font-medium text-red-700">
                    {validationErrors.otherText}
                  </span>
                ) : null}
              </label>
            ) : null}

            {error ? (
              <ValidationMessage>{error}</ValidationMessage>
            ) : null}

            <RunIdCard runId={runId} />

            <SurveyFooterActions backHref="/survey/profile">
              <PrimarySurveyButton
                disabled={isSaving}
                isBusy={isSaving}
                type="submit"
              >
                {isSaving ? "Opslaan..." : "Verder"}
              </PrimarySurveyButton>
            </SurveyFooterActions>
          </form>
    </SurveyStepLayout>
  );
}

function MotivationGroup({
  error,
  onChange,
  options,
  selectedCodes,
}: {
  error?: string;
  onChange: (codes: string[]) => void;
  options: SurveyOption[];
  selectedCodes: string[];
}) {
  function toggleCode(code: string) {
    onChange(
      selectedCodes.includes(code)
        ? selectedCodes.filter((selectedCode) => selectedCode !== code)
        : [...selectedCodes, code],
    );
  }

  return (
    <section className="grid gap-4 rounded-[1.35rem] border border-white/80 bg-white/75 p-4 shadow-[0_4px_14px_rgba(0,101,139,0.035)]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-[#00658b]">Motivaties</h3>
          <RequiredBadge />
        </div>
        <p className="mt-1 text-sm leading-6 text-[#40484e]">
          Meerdere antwoorden zijn mogelijk.
        </p>
      </div>
      {error ? (
        <ValidationMessage>{error}</ValidationMessage>
      ) : null}
      <div className="grid gap-2 md:grid-cols-2">
        {options.map((option) => (
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:shadow-[0_4px_12px_rgba(0,101,139,0.06)] ${
              selectedCodes.includes(option.code)
                ? "border-[#00658b] bg-[#f1f4f6]"
                : "border-[#bfc7cf] bg-white"
            }`}
            key={option.code}
          >
            <input
              checked={selectedCodes.includes(option.code)}
              className="mt-0.5 h-5 w-5 accent-[#00658b]"
              onChange={() => toggleCode(option.code)}
              type="checkbox"
              value={option.code}
            />
            <span>
              <span className="block text-sm font-semibold text-[#181c1e]">
                {option.label}
              </span>
              {option.description ? (
                <span className="mt-1 block text-xs leading-5 text-[#40484e]">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

function validateMotivationsForm({
  otherText,
  selectedMotivations,
}: {
  otherText: string;
  selectedMotivations: string[];
}): MotivationValidationErrors {
  const errors: MotivationValidationErrors = {};

  if (selectedMotivations.length === 0) {
    errors.selectedMotivations =
      "Kies minimaal een motivatie voordat je doorgaat.";
  }

  if (selectedMotivations.includes("anders") && !otherText.trim()) {
    errors.otherText = "Vul kort in wat je andere motivatie is.";
  }

  return errors;
}

function getSelectedMotivationLabels(selectedCodes: string[]) {
  return selectedCodes
    .map(
      (code) =>
        motivationOptions.find((option) => option.code === code)?.label ?? code,
    )
    .join(", ");
}

function MotivationAnswerSummary({
  selectedCount,
  selectedLabels,
}: {
  selectedCount: number;
  selectedLabels: string;
}) {
  return (
    <SurveySummaryGrid
      className="mb-6"
      columnsClassName="md:grid-cols-[10rem_1fr]"
    >
      <SurveySummaryItem label="Selectie" value={`${selectedCount} gekozen`} />
      <SurveySummaryItem
        label="Motivaties"
        value={selectedLabels || "Nog niets gekozen"}
      />
    </SurveySummaryGrid>
  );
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
