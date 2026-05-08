"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SurveyProgress } from "@/components/survey-progress";
import {
  saveConcerns,
  saveDataTypes,
  saveSupportNeeds,
  saveToolPreferenceReasons,
} from "@/lib/sai-rpc/client";
import {
  markSurveyStepCompleted,
  readSurveySession,
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
      setError("Geen actieve respondent session gevonden. Start de scan opnieuw.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSteps(INITIAL_STEPS);
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
      setIsSaving(false);
      return;
    }

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
      <main className="grid min-h-screen place-items-center bg-[#f7fafc] px-6 text-[#181c1e]">
        <section className="max-w-md rounded-2xl border border-[#bfc7cf]/50 bg-white p-6 text-center shadow-sm">
          <h1 className="mb-2 text-2xl font-bold">Geen actieve scan</h1>
          <p className="mb-5 text-sm leading-6 text-[#40484e]">
            Start eerst een scan en sla de profielstap op voordat je de
            data/context stap invult.
          </p>
          <a
            className="inline-flex h-11 items-center rounded-full bg-[#004c6a] px-6 text-sm font-bold text-white"
            href="/survey"
          >
            Terug naar start
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7fafc] px-6 py-8 text-[#181c1e]">
      <section className="mx-auto grid w-full max-w-4xl gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#6993aa]">Stap 3 van 6</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#00658b]">
              Data en context
            </h1>
          </div>
          <span className="rounded-full border border-[#bfc7cf]/60 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#40484e]">
            Vertrouwelijk
          </span>
        </header>

        <SurveyProgress completedSteps={completedSteps} currentStep="data" />

        <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_8px_40px_rgba(0,101,139,0.06)] md:p-8">
          <div className="mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#00658b]/70">
              Contextsignalen
            </p>
            <h2 className="text-2xl font-extrabold leading-tight text-[#00658b]">
              Welke data, zorgen en behoeften spelen mee?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#40484e]">
              Kies de soorten informatie, zorgen en behoeften die bij jouw
              AI-gebruik passen. Deze stap schrijft uitsluitend via de
              respondent RPC-laag.
            </p>
          </div>

          <form
            className="grid gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveDataFlow();
            }}
          >
            <CheckboxGroup
              helpText="Kies welke soort data je in of rond AI-tools tegenkomt."
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
              label="Toolvoorkeuren"
              name="preference_reason"
              onChange={setSelectedPreferenceReasons}
              options={preferenceReasonOptions}
              required
              selectedCodes={selectedPreferenceReasons}
              validationError={validationErrors.preferenceReasons}
            />

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <section className="grid gap-3">
              <StepRow label="save_data_types" state={steps.dataTypes} />
              <StepRow label="save_concerns" state={steps.concerns} />
              <StepRow label="save_support_needs" state={steps.supportNeeds} />
              <StepRow
                label="save_tool_preference_reasons"
                state={steps.preferenceReasons}
              />
            </section>

            <section className="rounded-2xl border border-[#bfc7cf]/50 bg-white/80 p-4 text-sm">
              <p>
                <span className="font-semibold">Run ID:</span>{" "}
                <span className="font-mono">{runId}</span>
              </p>
              <p className="mt-2 text-[#40484e]">
                Submission token blijft alleen in respondent session state.
              </p>
            </section>

            <div className="flex items-center justify-between gap-3 border-t border-[#bfc7cf]/30 pt-6">
              <a
                className="inline-flex h-11 items-center rounded-full border border-[#bfc7cf] px-6 text-sm font-bold text-[#40484e]"
                href="/survey/motivations"
              >
                Vorige
              </a>
              <button
                className="inline-flex h-11 items-center rounded-full bg-[#00658b] px-7 text-sm font-bold text-white shadow-lg transition hover:bg-[#004c6a] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Opslaan..." : "Verder"}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}

function CheckboxGroup({
  helpText,
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

  return (
    <section
      className={`grid gap-4 rounded-2xl border bg-white/70 p-4 ${
        validationError ? "border-red-300" : "border-[#bfc7cf]/50"
      }`}
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-[#00658b]">
            {label}
            {required ? <span className="text-red-600"> *</span> : null}
          </h3>
          <span className="rounded-full bg-[#c4e7ff]/50 px-2.5 py-1 text-xs font-bold text-[#00658b]">
            {selectedCodes.length} geselecteerd
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-[#40484e]">{helpText}</p>
        {selectedCodes.some((code) => EXCLUSIVE_CODES.has(code)) ? (
          <p className="mt-2 rounded-xl border border-[#f0d38a] bg-[#fff8df] px-3 py-2 text-xs font-semibold leading-5 text-[#6f5600]">
            Je hebt een exclusieve keuze geselecteerd. Die vervangt andere
            keuzes binnen deze vraag.
          </p>
        ) : null}
        {validationError ? (
          <p className="mt-2 text-sm font-semibold text-red-700">
            {validationError}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4">
        {getOptionGroups(options, optionGroups).map((group) => (
          <div className="grid gap-2" key={group.title}>
            {group.title ? (
              <h4 className="text-xs font-bold uppercase tracking-wide text-[#6993aa]">
                {group.title}
              </h4>
            ) : null}
            <div className="grid gap-2 md:grid-cols-2">
              {group.options.map((option) => (
                <label
                  className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:bg-[#c4e7ff]/20 ${
                    selectedCodes.includes(option.code)
                      ? "border-[#00658b] bg-[#c4e7ff]/40"
                      : "border-[#bfc7cf] bg-white/70"
                  } ${option.disabled ? "cursor-not-allowed opacity-55" : ""} ${
                    EXCLUSIVE_CODES.has(option.code) ? "border-dashed" : ""
                  }`}
                  key={option.code}
                >
                  <input
                    checked={selectedCodes.includes(option.code)}
                    className="mt-0.5 h-5 w-5 accent-[#00658b]"
                    disabled={option.disabled}
                    name={name}
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
          </div>
        ))}
      </div>
    </section>
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

function StepRow({ label, state }: { label: string; state: StepState }) {
  return (
    <div className="grid gap-2 rounded-xl border border-[#bfc7cf]/50 bg-white px-4 py-3 sm:grid-cols-[250px_90px_1fr] sm:items-center">
      <span className="font-mono text-sm font-semibold text-[#181c1e]">
        {label}
      </span>
      <span className="w-max rounded-full border border-[#bfc7cf]/60 px-2.5 py-1 text-xs font-semibold text-[#40484e]">
        {state.status}
      </span>
      <span className="break-words text-sm text-[#40484e]">{state.message}</span>
    </div>
  );
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
