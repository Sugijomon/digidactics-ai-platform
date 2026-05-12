"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  RequiredBadge,
  RpcStepRow,
  RunIdCard,
  SurveyFooterActions,
  SurveyStepLayout,
  SurveySummaryGrid,
  SurveySummaryItem,
  TechnicalStatus,
  ValidationMessage,
} from "@/components/survey-ui";
import {
  saveConcerns,
  saveDataTypes,
  saveSupportNeeds,
  saveToolPreferenceReasons,
} from "@/lib/sai-rpc/client";
import {
  markSurveyStepCompleted,
  readSurveySession,
  storeSurveyGuardNotice,
  updateSurveyCurrentStep,
} from "@/lib/sai-rpc/session";
import type { RpcError, RpcResult, SurveySession } from "@/lib/sai-rpc/types";
import {
  canAccessSurveyStep,
  getResumeStep,
  type SurveyStepId,
} from "@/lib/sai-survey/flow";
import {
  dataTypeOptions,
  preferenceReasonOptions,
  supportNeedOptions,
  topConcernOptions,
  type SurveyOption,
} from "@/lib/sai-survey/options";

type StepKey = "dataTypes" | "concerns" | "supportNeeds" | "preferenceReasons";

type StepState = {
  status: "idle" | "running" | "ok" | "error";
  message: string;
};

type StepStates = Record<StepKey, StepState>;
type ValidationErrors = Partial<Record<StepKey, string>>;

const INITIAL_STEPS: StepStates = {
  dataTypes: { status: "idle", message: "Wacht op opslaan" },
  concerns: { status: "idle", message: "Wacht op datatypes" },
  supportNeeds: { status: "idle", message: "Wacht op zorgen" },
  preferenceReasons: { status: "idle", message: "Wacht op supportbehoeften" },
};

const DATA_TYPE_GROUPS = [
  {
    title: "Publiek en algemeen",
    codes: ["public_information", "publiek"],
  },
  {
    title: "Intern werkmateriaal",
    codes: [
      "internal_emails",
      "interne_email",
      "internal_documents",
      "interne_documenten",
      "meeting_notes",
      "notulen",
      "source_code_logic",
      "broncode_logica",
      "excel_sheets",
    ],
  },
  {
    title: "Klant, financieel en juridisch",
    codes: [
      "customer_data",
      "klantdata",
      "financial_data",
      "financiele_data",
      "legal_documents",
      "juridische_documenten",
    ],
  },
  {
    title: "Persoonsgegevens en onzeker",
    codes: [
      "names",
      "namen",
      "special_personal_data",
      "gevoelig_persoonsgegeven",
      "none",
      "niets",
      "unsure",
      "onzeker",
    ],
  },
];

export default function SurveyDataPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(
    null,
  );
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [selectedDataTypes, setSelectedDataTypes] = useState(["customer_data"]);
  const [selectedConcerns, setSelectedConcerns] = useState(["privacy"]);
  const [selectedSupportNeeds, setSelectedSupportNeeds] = useState([
    "clear_policy",
  ]);
  const [selectedPreferenceReasons, setSelectedPreferenceReasons] = useState([
    "ease_of_use",
  ]);
  const [steps, setSteps] = useState<StepStates>(INITIAL_STEPS);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
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

  async function handleSaveDataFlow() {
    if (!surveySession) {
      setError("Geen actieve scan gevonden. Start de scan opnieuw.");
      return;
    }

    setError(null);
    setValidationErrors({});

    const nextValidationErrors = validateSelections({
      dataTypes: selectedDataTypes,
      concerns: selectedConcerns,
      supportNeeds: selectedSupportNeeds,
      preferenceReasons: selectedPreferenceReasons,
    });

    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors);
      setError("Controleer de gemarkeerde vragen voordat je doorgaat.");
      return;
    }

    setIsSaving(true);
    setSteps(INITIAL_STEPS);

    const dataTypesResult = await runStep(
      "dataTypes",
      () => saveDataTypes(surveySession, selectedDataTypes),
      "Datatypes opgeslagen",
    );
    if (!dataTypesResult.ok) return finishWithError(dataTypesResult.error);

    const concernsResult = await runStep(
      "concerns",
      () => saveConcerns(surveySession, selectedConcerns),
      "Zorgen opgeslagen",
    );
    if (!concernsResult.ok) return finishWithError(concernsResult.error);

    const supportNeedsResult = await runStep(
      "supportNeeds",
      () => saveSupportNeeds(surveySession, selectedSupportNeeds),
      "Supportbehoeften opgeslagen",
    );
    if (!supportNeedsResult.ok) return finishWithError(supportNeedsResult.error);

    const preferenceReasonsResult = await runStep(
      "preferenceReasons",
      () =>
        saveToolPreferenceReasons(surveySession, selectedPreferenceReasons),
      "Toolvoorkeuren opgeslagen",
    );
    if (!preferenceReasonsResult.ok) {
      return finishWithError(preferenceReasonsResult.error);
    }

    markSurveyStepCompleted("data");
    updateSurveyCurrentStep("tools");
    router.push("/survey/tools");
  }

  async function runStep<T>(
    key: StepKey,
    action: () => Promise<RpcResult<T>>,
    successMessage: string,
  ) {
    setStep(key, "running", "Bezig");
    const result = await action();

    if (!result.ok) {
      setStep(key, "error", formatRpcError(result.error));
      return result;
    }

    setStep(key, "ok", successMessage);
    return result;
  }

  function finishWithError(rpcError: RpcError) {
    setError(formatRpcError(rpcError));
    setIsSaving(false);
  }

  function setStep(
    key: StepKey,
    status: StepState["status"],
    message: string,
  ) {
    setSteps((current) => ({
      ...current,
      [key]: { status, message },
    }));
  }

  if (!runId) {
    return (
      <EmptySurveyState>
        Start eerst een scan en sla de profielstap op voordat je de data/context
        stap invult.
      </EmptySurveyState>
    );
  }

  return (
    <SurveyStepLayout
      completedSteps={completedSteps}
      currentStep="data"
      eyebrow="Contextsignalen"
      intro="Kies welke soorten informatie, zorgen en ondersteuningsbehoeften bij jouw AI-gebruik passen."
      title="Welke data, zorgen en behoeften spelen mee?"
    >

          <DataAnswerSummary
            items={[
              {
                label: "Datatypes",
                selectedCodes: selectedDataTypes,
                options: dataTypeOptions,
              },
              {
                label: "Zorgen",
                selectedCodes: selectedConcerns,
                options: topConcernOptions,
              },
              {
                label: "Support",
                selectedCodes: selectedSupportNeeds,
                options: supportNeedOptions,
              },
              {
                label: "Voorkeuren",
                selectedCodes: selectedPreferenceReasons,
                options: preferenceReasonOptions,
              },
            ]}
          />

          <form
            className="grid gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveDataFlow();
            }}
          >
            <CheckboxGroup
              helpText="Kies welke soort data je in of rond AI-tools tegenkomt."
              isDisabled={isSaving}
              label="Datatypes"
              name="data_type"
              onChange={setSelectedDataTypes}
              options={dataTypeOptions}
              optionGroups={DATA_TYPE_GROUPS}
              required
              selectedCodes={selectedDataTypes}
              validationError={validationErrors.dataTypes}
            />

            <CheckboxGroup
              helpText="Kies welke zorg het sterkst naar voren komt."
              isDisabled={isSaving}
              label="Belangrijkste zorgen"
              name="top_concern"
              onChange={setSelectedConcerns}
              options={topConcernOptions}
              required
              selectedCodes={selectedConcerns}
              validationError={validationErrors.concerns}
            />

            <CheckboxGroup
              helpText="Kies welke ondersteuning zou helpen om veilig met AI te werken."
              isDisabled={isSaving}
              label="Supportbehoeften"
              name="support_need"
              onChange={setSelectedSupportNeeds}
              options={supportNeedOptions}
              required
              selectedCodes={selectedSupportNeeds}
              validationError={validationErrors.supportNeeds}
            />

            <CheckboxGroup
              helpText="Kies waarom je eerder voor een bepaalde AI-tool kiest."
              isDisabled={isSaving}
              label="Toolvoorkeuren"
              name="preference_reason"
              onChange={setSelectedPreferenceReasons}
              options={preferenceReasonOptions}
              required
              selectedCodes={selectedPreferenceReasons}
              validationError={validationErrors.preferenceReasons}
            />

            {error ? (
              <ValidationMessage>{error}</ValidationMessage>
            ) : null}

            <TechnicalStatus>
              <RpcStepRow label="save_data_types" state={steps.dataTypes} />
              <RpcStepRow label="save_concerns" state={steps.concerns} />
              <RpcStepRow label="save_support_needs" state={steps.supportNeeds} />
              <RpcStepRow
                label="save_tool_preference_reasons"
                state={steps.preferenceReasons}
              />
            </TechnicalStatus>

            <RunIdCard runId={runId} />

            <SurveyFooterActions backHref="/survey/motivations">
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

function CheckboxGroup({
  helpText,
  isDisabled = false,
  label,
  name,
  onChange,
  optionGroups,
  options,
  required = false,
  selectedCodes,
  validationError,
}: {
  helpText: string;
  isDisabled?: boolean;
  label: string;
  name: string;
  onChange: (codes: string[]) => void;
  optionGroups?: Array<{ title: string; codes: string[] }>;
  options: SurveyOption[];
  required?: boolean;
  selectedCodes: string[];
  validationError?: string;
}) {
  function toggleCode(code: string) {
    const isSelected = selectedCodes.includes(code);
    const nextSelection = isSelected
      ? selectedCodes.filter((selectedCode) => selectedCode !== code)
      : [...selectedCodes.filter((selectedCode) => !isExclusiveCode(code, selectedCode)), code];

    onChange(normalizeExclusiveSelection(nextSelection, code));
  }

  const groupId = toDomId(label);
  const helpId = `${groupId}-help`;
  const exclusiveHintId = `${groupId}-exclusive-hint`;
  const errorId = validationError ? `${groupId}-error` : undefined;
  const hasExclusiveSelection = selectedCodes.some((code) =>
    EXCLUSIVE_CODES.has(code),
  );

  return (
    <fieldset
      aria-describedby={[helpId, hasExclusiveSelection ? exclusiveHintId : "", errorId]
        .filter(Boolean)
        .join(" ")}
      aria-invalid={validationError ? true : undefined}
      className={`grid min-w-0 max-w-full gap-4 rounded-[1.35rem] border bg-white/75 p-4 shadow-[0_4px_14px_rgba(0,101,139,0.035)] ${
        validationError ? "border-red-300" : "border-white/80"
      }`}
    >
      <legend className="sr-only">Keuzegroep</legend>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words font-bold text-[#00658b]">
              {label}
            </h3>
            {required ? (
              <RequiredBadge />
            ) : null}
          </div>
          <span className="rounded-full bg-[#c4e7ff]/50 px-2.5 py-1 text-xs font-bold text-[#00658b]">
            {selectedCodes.length} geselecteerd
          </span>
        </div>
        <p
          className="mt-1 break-words text-sm leading-6 text-[#40484e]"
          id={helpId}
        >
          {helpText}
        </p>
        {hasExclusiveSelection ? (
          <p
            className="mt-2 rounded-xl border border-[#f0d38a] bg-[#fff8df] px-3 py-2 text-xs font-semibold leading-5 text-[#6f5600]"
            id={exclusiveHintId}
          >
            Je hebt een exclusieve keuze geselecteerd. Die vervangt andere
            keuzes binnen deze vraag.
          </p>
        ) : null}
        {validationError ? (
          <p className="mt-2 text-sm font-semibold text-red-700" id={errorId}>
            {validationError}
          </p>
        ) : null}
      </div>
      <div className="grid min-w-0 gap-4">
        {getOptionGroups(options, optionGroups).map((group) => (
          <div className="grid min-w-0 gap-2" key={group.title}>
            {group.title ? (
              <h4 className="break-words text-xs font-bold uppercase tracking-wide text-[#6993aa]">
                {group.title}
              </h4>
            ) : null}
            <div className="grid min-w-0 gap-2 md:grid-cols-2">
              {group.options.map((option) => (
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:shadow-[0_4px_12px_rgba(0,101,139,0.06)] ${
                    selectedCodes.includes(option.code)
                      ? "border-[#00658b] bg-[#f1f4f6]"
                      : "border-[#bfc7cf] bg-white"
                  } ${option.disabled ? "cursor-not-allowed opacity-55" : ""} ${
                    EXCLUSIVE_CODES.has(option.code) ? "border-dashed" : ""
                  }`}
                  key={option.code}
                >
                  <input
                    checked={selectedCodes.includes(option.code)}
                    className="mt-0.5 h-5 w-5 accent-[#00658b]"
                    disabled={isDisabled || option.disabled}
                    name={name}
                    onChange={() => toggleCode(option.code)}
                    type="checkbox"
                    value={option.code}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#181c1e]">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="mt-1 block break-words text-xs leading-5 text-[#40484e]">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function getOptionGroups(
  options: SurveyOption[],
  optionGroups?: Array<{ title: string; codes: string[] }>,
) {
  if (!optionGroups) {
    return [{ title: "", options }];
  }

  return optionGroups.map((group) => ({
    title: group.title,
    options: group.codes
      .map((code) => options.find((option) => option.code === code))
      .filter((option): option is SurveyOption => Boolean(option)),
  }));
}

function DataAnswerSummary({
  items,
}: {
  items: Array<{
    label: string;
    options: SurveyOption[];
    selectedCodes: string[];
  }>;
}) {
  return (
    <SurveySummaryGrid className="mb-6" columnsClassName="md:grid-cols-2">
      {items.map((item) => (
        <SurveySummaryItem
          key={item.label}
          detail={getSelectedOptionLabels(item.options, item.selectedCodes) || "Nog niets gekozen"}
          label={item.label}
          value={`${item.selectedCodes.length} geselecteerd`}
        />
      ))}
    </SurveySummaryGrid>
  );
}

function getSelectedOptionLabels(options: SurveyOption[], selectedCodes: string[]) {
  return selectedCodes
    .map((code) => options.find((option) => option.code === code)?.label ?? code)
    .join(", ");
}

function validateSelections(selections: Record<StepKey, string[]>) {
  const errors: ValidationErrors = {};

  if (selections.dataTypes.length === 0) {
    errors.dataTypes = "Kies minimaal een datatype, of kies 'Ik voer dit niet in'.";
  }

  if (selections.concerns.length === 0) {
    errors.concerns = "Kies minimaal een zorg, of kies 'Geen bijzondere zorgen'.";
  }

  if (selections.supportNeeds.length === 0) {
    errors.supportNeeds = "Kies minimaal een vorm van ondersteuning.";
  }

  if (selections.preferenceReasons.length === 0) {
    errors.preferenceReasons = "Kies minimaal een reden voor je toolvoorkeur.";
  }

  return errors;
}

const EXCLUSIVE_CODES = new Set([
  "none",
  "niets",
  "unsure",
  "onzeker",
  "no_major_concerns",
]);

function isExclusiveCode(newCode: string, selectedCode: string) {
  return EXCLUSIVE_CODES.has(newCode) || EXCLUSIVE_CODES.has(selectedCode);
}

function normalizeExclusiveSelection(codes: string[], latestCode: string) {
  if (!EXCLUSIVE_CODES.has(latestCode)) {
    return codes.filter((code) => !EXCLUSIVE_CODES.has(code));
  }

  return [latestCode];
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}

function toDomId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
