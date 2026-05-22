"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SurveyCheckboxGroup, SurveyRadioGroup } from "@/components/survey-choice-groups";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  RunIdCard,
  SurveyFooterActions,
  SurveyStepLayout,
  SurveySummaryGrid,
  SurveySummaryItem,
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

const DATA_TYPE_GROUPS = [
  {
    title: "Publiek en algemeen",
    codes: ["publiek", "public_information"],
  },
  {
    title: "Intern werkmateriaal",
    codes: [
      "interne_email",
      "internal_emails",
      "interne_documenten",
      "internal_documents",
      "notulen",
      "meeting_notes",
      "broncode_logica",
      "source_code_logic",
      "excel_sheets",
    ],
  },
  {
    title: "Klant, financieel en juridisch",
    codes: [
      "klantdata",
      "customer_data",
      "financiele_data",
      "financial_data",
      "juridische_documenten",
      "legal_documents",
    ],
  },
  {
    title: "Persoonsgegevens en onzeker",
    codes: [
      "namen",
      "names",
      "gevoelig_persoonsgegeven",
      "special_personal_data",
      "niets",
      "none",
      "onzeker",
      "unsure",
    ],
  },
];

const EXCLUSIVE_DATA_CODES = new Set(["none", "niets", "unsure", "onzeker"]);

export default function SurveyDataPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [selectedDataTypes, setSelectedDataTypes] = useState(["klantdata"]);
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
      department_code: "it_data_development",
      ai_frequency_code: "weekly",
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

  function handleDataTypeChange(codes: string[]) {
    const latestCode = codes.find((code) => !selectedDataTypes.includes(code));

    if (latestCode && EXCLUSIVE_DATA_CODES.has(latestCode)) {
      setSelectedDataTypes([latestCode]);
      return;
    }

    setSelectedDataTypes(codes.filter((code) => !EXCLUSIVE_DATA_CODES.has(code)));
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
      eyebrow="Data & veiligheid"
      intro="Niet alle informatie is hetzelfde. Een conceptmail vraagt om andere beveiliging dan klantdata, HR-informatie of broncode."
      title="Welk type informatie voer je wel eens in bij AI-tools?"
    >
      <DataSummary
        awarenessCode={dataAwarenessCode}
        dataTypeCodes={selectedDataTypes}
        anonymizationCode={anonymizationBehaviorCode}
      />

      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSaveDataScreen();
        }}
      >
        <GroupedDataTypes
          isDisabled={isSaving}
          onChange={handleDataTypeChange}
          selectedCodes={selectedDataTypes}
        />

        <SurveyRadioGroup
          helpText="Bij gratis of onbeheerde AI-tools kan invoer worden opgeslagen of gebruikt voor verbetering van de dienst."
          isDisabled={isSaving}
          label="Ben je op de hoogte van hoe AI-tools omgaan met de informatie die jij invoert?"
          name="data_awareness"
          onChange={setDataAwarenessCode}
          options={dataAwarenessOptions}
          selectedCode={dataAwarenessCode}
          validationError={!dataAwarenessCode ? "Kies een antwoord." : undefined}
        />

        <SurveyRadioGroup
          helpText="Bijvoorbeeld door namen, klantnummers of bedrijfsnamen te verwijderen voordat je informatie deelt."
          isDisabled={isSaving}
          label="Anonimiseer of pseudonimiseer je informatie voordat je die in AI-tools invoert?"
          name="anonymization"
          onChange={setAnonymizationBehaviorCode}
          options={anonymizationBehaviorOptions}
          selectedCode={anonymizationBehaviorCode}
          validationError={
            !anonymizationBehaviorCode ? "Kies een antwoord." : undefined
          }
        />

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        <RunIdCard runId={runId} />

        <SurveyFooterActions backHref="/survey/use-cases">
          <PrimarySurveyButton disabled={isSaving} isBusy={isSaving} type="submit">
            {isSaving ? "Opslaan..." : "Volgende stap"}
          </PrimarySurveyButton>
        </SurveyFooterActions>
      </form>
    </SurveyStepLayout>
  );
}

function GroupedDataTypes({
  isDisabled,
  onChange,
  selectedCodes,
}: {
  isDisabled: boolean;
  onChange: (codes: string[]) => void;
  selectedCodes: string[];
}) {
  return (
    <section className="grid gap-4">
      {DATA_TYPE_GROUPS.map((group) => (
        <SurveyCheckboxGroup
          helpText={group.title}
          isDisabled={isDisabled}
          key={group.title}
          label={group.title}
          onChange={(codes) => {
            const otherGroups = DATA_TYPE_GROUPS.filter(
              (candidate) => candidate.title !== group.title,
            ).flatMap((candidate) => candidate.codes);
            const nextCodes = [
              ...selectedCodes.filter((code) => otherGroups.includes(code)),
              ...codes,
            ];
            onChange(nextCodes);
          }}
          options={getDataTypeOptions(group.codes)}
          required={false}
          selectedCodes={selectedCodes.filter((code) => group.codes.includes(code))}
        />
      ))}
    </section>
  );
}

function DataSummary({
  awarenessCode,
  anonymizationCode,
  dataTypeCodes,
}: {
  awarenessCode: string;
  anonymizationCode: string;
  dataTypeCodes: string[];
}) {
  return (
    <SurveySummaryGrid className="mb-6">
      <SurveySummaryItem label="Datatypes" value={`${dataTypeCodes.length} gekozen`} />
      <SurveySummaryItem
        label="Data-awareness"
        value={getOptionLabel(dataAwarenessOptions, awarenessCode)}
      />
      <SurveySummaryItem
        label="Anonimiseren"
        value={getOptionLabel(anonymizationBehaviorOptions, anonymizationCode)}
      />
    </SurveySummaryGrid>
  );
}

function getOptionLabel(options: SurveyOption[], code: string) {
  return options.find((option) => option.code === code)?.label ?? "Nog kiezen";
}

function getDataTypeOptions(codes: string[]): SurveyOption[] {
  const options: SurveyOption[] = [];

  for (const code of codes) {
    const option = dataTypeOptions.find((candidate) => candidate.code === code);

    if (option) {
      options.push(option);
    }
  }

  return options;
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
