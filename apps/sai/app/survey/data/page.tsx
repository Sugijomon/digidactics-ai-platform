"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  SurveyStepLayout,
  ValidationMessage,
} from "@/components/survey-ui";
import { saveDataTypes, saveProfile } from "@/lib/sai-rpc/client";
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
  anonymizationBehaviorOptions,
  dataAwarenessOptions,
  dataTypeOptions,
  type SurveyOption,
} from "@/lib/sai-survey/options";

const DATA_OPTIONS = [
  { code: "public_information", risk: "neutral" },
  { code: "names", risk: "mid" },
  { code: "interne_email", risk: "mid" },
  { code: "internal_documents", risk: "mid" },
  { code: "meeting_notes", risk: "mid" },
  { code: "source_code_logic", risk: "mid" },
  { code: "customer_data", risk: "high" },
  { code: "financial_data", risk: "high" },
  { code: "special_personal_data", risk: "high" },
  { code: "excel_sheets", risk: "mid" },
  { code: "legal_documents", risk: "high" },
  { code: "none", risk: "neutral" },
  { code: "unsure", risk: "neutral", wide: true },
] satisfies Array<{ code: string; risk: DataRisk; wide?: boolean }>;

const EXCLUSIVE_DATA_CODES = new Set(["none", "niets", "unsure", "onzeker"]);

type DataRisk = "neutral" | "mid" | "high";

export default function SurveyDataPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [dataAwarenessCode, setDataAwarenessCode] = useState("");
  const [anonymizationBehaviorCode, setAnonymizationBehaviorCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      if (!canAccessSurveyStep(storedSession, "data")) {
        storeSurveyGuardNotice(
          "We hebben je teruggezet naar de eerstvolgende open stap.",
        );
        router.replace(getResumeStep(storedSession).href);
        return;
      }

      updateSurveyCurrentStep("data");
      setSurveySession({
        runId: storedSession.runId,
        submissionToken: storedSession.submissionToken,
      });
      setRunId(storedSession.runId);
      setCompletedSteps(storedSession.completedSteps ?? []);
    });
  }, [router]);

  async function handleSaveDataScreen() {
    if (!surveySession) {
      setError("Geen actieve scan gevonden. Start de scan opnieuw.");
      return;
    }

    if (selectedDataTypes.length === 0) {
      setError("Kies minimaal een datatype, of kies dat je dit niet invoert.");
      return;
    }

    if (!dataAwarenessCode || !anonymizationBehaviorCode) {
      setError("Beantwoord ook de vragen over data-opslag en anonimiseren.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const dataTypesResult = await saveDataTypes(surveySession, selectedDataTypes);

    if (!dataTypesResult.ok) {
      finishWithError(dataTypesResult.error);
      return;
    }

    const profileResult = await saveProfile(surveySession, {
      data_awareness_code: dataAwarenessCode,
      anonymization_behavior_code: anonymizationBehaviorCode,
      future_usecases_text: "",
    });

    if (!profileResult.ok) {
      finishWithError(profileResult.error);
      return;
    }

    markSurveyStepCompleted("data");
    updateSurveyCurrentStep("accounts");
    setIsSaving(false);
    router.push("/survey/accounts");
  }

  function handleToggleDataType(code: string) {
    if (EXCLUSIVE_DATA_CODES.has(code)) {
      setSelectedDataTypes([code]);
      return;
    }

    setSelectedDataTypes((current) => {
      const withoutExclusive = current.filter(
        (selectedCode) => !EXCLUSIVE_DATA_CODES.has(selectedCode),
      );

      return withoutExclusive.includes(code)
        ? withoutExclusive.filter((selectedCode) => selectedCode !== code)
        : [...withoutExclusive, code];
    });
  }

  function finishWithError(rpcError: RpcError) {
    setError(formatRpcError(rpcError));
    setIsSaving(false);
  }

  if (!runId) {
    return (
      <EmptySurveyState>
        Kies eerst een tool en toepassing voordat je de datatypevragen invult.
      </EmptySurveyState>
    );
  }

  return (
    <SurveyStepLayout
      completedSteps={completedSteps}
      currentStep="data"
      eyebrow="Data & risico"
      intro=""
      maxWidthClassName="max-w-3xl"
      title="Welk type informatie voer je wel eens in bij AI-tools?"
    >
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSaveDataScreen();
        }}
      >
        <p className="w-max max-w-full rounded-lg border border-[#bfc7cf]/30 bg-[#f1f4f6] px-3 py-1.5 text-sm leading-6 text-[#40484e]">
          Meerdere antwoorden mogelijk. Kies bij overlappende informatie altijd de{" "}
          <strong>meest gevoelige</strong> categorie.
        </p>

        <details className="group rounded-[1.25rem] border border-[#bfc7cf]/30 bg-[#f1f4f6] p-4">
          <summary className="flex cursor-pointer items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-[#00658b] shadow-sm">
              i
            </span>
            <span className="flex-1 text-[13px] font-semibold text-[#00658b]">
              De juiste bescherming voor jouw werk.
            </span>
            <InlineChevron className="text-[#94a3b8] transition group-open:rotate-180" />
          </summary>
          <p className="mt-3 border-t border-[#bfc7cf]/20 pt-3 text-[13px] leading-relaxed text-[#40484e]">
            Niet alle informatie is hetzelfde. Een concept-mail voor het
            bedrijfsuitje vraagt om een andere beveiliging dan een strategisch
            plan met bedrijfsgegevens.
          </p>
        </details>

        <DataTypeGrid
          isDisabled={isSaving}
          onToggle={handleToggleDataType}
          selectedCodes={selectedDataTypes}
        />

        <ChoicePanel
          isDisabled={isSaving}
          onChange={setDataAwarenessCode}
          options={dataAwarenessOptions}
          selectedCode={dataAwarenessCode}
          title="Ben je op de hoogte van hoe AI-tools omgaan met de informatie die jij invoert?"
        />

        <ChoicePanel
          helpText="Bijvoorbeeld door namen of klantnummers verwijderen voordat je het in een AI-tool deelt."
          isDisabled={isSaving}
          onChange={setAnonymizationBehaviorCode}
          options={anonymizationBehaviorOptions}
          selectedCode={anonymizationBehaviorCode}
          title="Maak je informatie anoniem?"
        />

        <details className="group rounded-[1.25rem] border border-[#bfc7cf]/30 bg-[#f1f4f6] p-4">
          <summary className="flex cursor-pointer items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-[#00658b] shadow-sm">
              i
            </span>
            <span className="flex-1 text-[13px] font-semibold text-[#00658b]">
              Waarom is anonimiseren belangrijk?
            </span>
            <InlineChevron className="text-[#94a3b8] transition group-open:rotate-180" />
          </summary>
          <p className="mt-3 border-t border-[#bfc7cf]/20 pt-3 text-[13px] leading-relaxed text-[#40484e]">
            Zodra je gegevens invoert in een gratis AI-tool, kunnen deze
            onderdeel worden van de trainingsset van de aanbieder. Door namen te
            vervangen door Persoon A of Bedrijf X bescherm je privacy,
            terwijl de AI nog steeds kan helpen met de inhoud.
          </p>
        </details>

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        <div className="flex items-center justify-between border-t border-[#bfc7cf]/20 pt-6">
          <a
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#40484e] transition hover:text-[#00658b]"
            href="/survey/tools"
          >
            <span className="text-lg leading-none">‹</span>
            Vorige
          </a>
          <PrimarySurveyButton disabled={isSaving} isBusy={isSaving} type="submit">
            {isSaving ? "Opslaan..." : "Volgende"}
          </PrimarySurveyButton>
        </div>
      </form>
    </SurveyStepLayout>
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

function DataTypeGrid({
  isDisabled,
  onToggle,
  selectedCodes,
}: {
  isDisabled: boolean;
  onToggle: (code: string) => void;
  selectedCodes: string[];
}) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Datatypes</legend>
      {DATA_OPTIONS.map((item) => {
        const option = getDataTypeOption(item.code);
        const isSelected = selectedCodes.includes(item.code);

        return (
          <label
            className={`flex cursor-pointer items-start gap-4 rounded-2xl border-[1.5px] bg-white/70 px-5 py-4 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:bg-[#c4e7ff]/20 ${
              item.wide ? "sm:col-span-2" : ""
            } ${getDataRiskClass(item.risk, isSelected)} ${
              isDisabled ? "cursor-not-allowed opacity-55" : ""
            }`}
            key={item.code}
          >
            <input
              checked={isSelected}
              className="sr-only"
              disabled={isDisabled}
              onChange={() => onToggle(item.code)}
              type="checkbox"
              value={item.code}
            />
            <span
              className={`mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border-2 ${
                isSelected
                  ? "border-[#004c6a] bg-[#004c6a] text-[0px] after:-mt-0.5 after:block after:h-3 after:w-1.5 after:rotate-45 after:border-b-2 after:border-r-2 after:border-white"
                  : "border-[#bfc7cf] bg-white"
              }`}
            >
              {isSelected ? "✓" : null}
            </span>
            <span className="min-w-0">
              <span
                className={`block text-base leading-snug ${
                  isSelected ? "text-[#004c6a]" : "text-[#181c1e]"
                }`}
              >
                {option.label}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

function ChoicePanel({
  helpText,
  isDisabled,
  onChange,
  options,
  selectedCode,
  title,
}: {
  helpText?: string;
  isDisabled: boolean;
  onChange: (code: string) => void;
  options: SurveyOption[];
  selectedCode: string;
  title: string;
}) {
  return (
    <fieldset className="rounded-[1.25rem] border border-[#bfc7cf]/55 bg-[#f1f4f6] p-4">
      <legend className="sr-only">{title}</legend>
      <div className={helpText ? "mb-3" : "mb-4"}>
        <h2 className="text-xl font-extrabold leading-tight text-[#00658b]">
          {title}
        </h2>
        {helpText ? (
          <p className="mt-1 text-sm leading-6 text-[#40484e]">{helpText}</p>
        ) : null}
      </div>
      <div className="grid gap-2.5">
        {options.map((option) => {
          const isSelected = selectedCode === option.code;

          return (
            <label
              className={`flex cursor-pointer items-center gap-4 rounded-2xl border-[1.5px] bg-white/70 px-5 py-4 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:bg-[#c4e7ff]/20 ${
                isSelected
                  ? "border-[#00658b] bg-[#c4e7ff]/40"
                  : "border-[#bfc7cf]"
              } ${isDisabled ? "cursor-not-allowed opacity-55" : ""}`}
              key={option.code}
            >
              <input
                checked={isSelected}
                className="sr-only"
                disabled={isDisabled}
                name={title}
                onChange={() => onChange(option.code)}
                type="radio"
                value={option.code}
              />
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-[#bfc7cf] bg-white">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isSelected ? "bg-[#00658b]" : "bg-transparent"
                  }`}
                />
              </span>
              <span className="text-base leading-snug text-[#181c1e]">
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function getDataTypeOption(code: string) {
  return (
    dataTypeOptions.find((option) => option.code === code) ?? {
      code,
      label: code,
    }
  );
}

function getDataRiskClass(risk: DataRisk, isSelected: boolean) {
  if (!isSelected) {
    return "border-[#bfc7cf]";
  }

  if (risk === "high") {
    return "border-[#0c4a6e] bg-[#bae6fd]/50";
  }

  if (risk === "mid") {
    return "border-[#0369a1] bg-[#e0f2fe]/50";
  }

  return "border-[#004c6a] bg-[#c4e7ff]/40";
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
