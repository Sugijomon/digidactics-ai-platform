"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  saveTool,
  saveToolAccount,
  saveToolUseCase,
  saveToolUseCaseContext,
} from "@/lib/sai-rpc/client";
import {
  readSurveySession,
  type StoredSurveyTool,
  updateSurveyCurrentStep,
  updateSurveySession,
} from "@/lib/sai-rpc/session";
import type {
  RpcError,
  RpcResult,
  SaveToolPayload,
  SurveySession,
} from "@/lib/sai-rpc/types";
import {
  accountTypeOptions,
  contextOptions,
  toolOptions,
  useCaseOptions,
  type SurveyOption,
  type ToolOption,
} from "@/lib/sai-survey/options";

type StepKey = "tool" | "useCase" | "context" | "account";

type StepState = {
  status: "idle" | "running" | "ok" | "error";
  message: string;
};

type StepStates = Record<StepKey, StepState>;
type ValidationErrors = Partial<
  Record<"tool" | "useCases" | "contexts" | "account", string>
>;

const INITIAL_STEPS: StepStates = {
  tool: { status: "idle", message: "Wacht op opslaan" },
  useCase: { status: "idle", message: "Wacht op toolregistratie" },
  context: { status: "idle", message: "Wacht op use case" },
  account: { status: "idle", message: "Wacht op toolregistratie" },
};

export default function SurveyToolsPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(
    null,
  );
  const [runId, setRunId] = useState<string | null>(null);
  const [selectedToolId, setSelectedToolId] = useState("chatgpt");
  const [customToolName, setCustomToolName] = useState("");
  const [selectedUseCases, setSelectedUseCases] = useState([
    "drafting",
    "data_analyseren",
  ]);
  const [selectedContexts, setSelectedContexts] = useState(["internal_work"]);
  const [selectedAccountType, setSelectedAccountType] =
    useState("personal_free");
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const [steps, setSteps] = useState<StepStates>(INITIAL_STEPS);
  const [savedTools, setSavedTools] = useState<StoredSurveyTool[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTool = useMemo(
    () => toolOptions.find((tool) => tool.id === selectedToolId) ?? toolOptions[0],
    [selectedToolId],
  );

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      updateSurveyCurrentStep("tools");
      setSurveySession({
        runId: storedSession.runId,
        submissionToken: storedSession.submissionToken,
      });
      setRunId(storedSession.runId);
      setSavedTools(storedSession.savedTools ?? []);
    });
  }, []);

  async function handleSaveToolFlow() {
    if (!surveySession) {
      setError("Geen actieve respondent session gevonden. Start de scan opnieuw.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSteps(INITIAL_STEPS);
    setValidationErrors({});

    const toolName = getSelectedToolName(selectedTool, customToolName);
    const nextValidationErrors = validateToolStep({
      accountType: selectedAccountType,
      contexts: selectedContexts,
      toolName,
      useCases: selectedUseCases,
    });

    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors);
      setError("Controleer de gemarkeerde vragen voordat je doorgaat.");
      setIsSaving(false);
      return;
    }

    const toolPayload: SaveToolPayload = {
      tool_name: toolName,
      is_custom: !selectedTool.toolCode,
      catalog_beheerstatus_code: "newly_discovered",
    };

    if (selectedTool.toolCode) {
      toolPayload.tool_code = selectedTool.toolCode;
    }

    const toolResult = await runStep(
      "tool",
      () => saveTool(surveySession, toolPayload),
      `${toolName} opgeslagen`,
    );
    if (!toolResult.ok) return finishWithError(toolResult.error);

    updateSurveySession({ surveyToolId: toolResult.data });

    const useCaseIds: string[] = [];

    for (const useCaseCode of selectedUseCases) {
      const useCaseResult = await runStep(
        "useCase",
        () => saveToolUseCase(surveySession, toolResult.data, useCaseCode),
        `Use cases opgeslagen (${useCaseIds.length + 1}/${selectedUseCases.length})`,
      );

      if (!useCaseResult.ok) {
        return finishWithError(useCaseResult.error);
      }

      useCaseIds.push(useCaseResult.data);
    }

    updateSurveySession({ surveyToolUseCaseId: useCaseIds[0] });

    for (const useCaseId of useCaseIds) {
      const contextResult = await runStep(
        "context",
        () =>
          saveToolUseCaseContext(surveySession, useCaseId, selectedContexts),
        `Contexten opgeslagen (${selectedContexts.length})`,
      );

      if (!contextResult.ok) {
        return finishWithError(contextResult.error);
      }
    }

    const accountResult = await runStep(
      "account",
      () =>
        saveToolAccount(surveySession, toolResult.data, selectedAccountType),
      "Accounttype opgeslagen",
    );
    if (!accountResult.ok) return finishWithError(accountResult.error);

    const savedTool: StoredSurveyTool = {
      surveyToolId: toolResult.data,
      toolName,
      useCaseCodes: selectedUseCases,
      contextCodes: selectedContexts,
      accountTypeCode: selectedAccountType,
      savedAt: new Date().toISOString(),
    };
    const nextSavedTools = [...savedTools, savedTool];

    setSavedTools(nextSavedTools);
    updateSurveySession({
      currentStep: "tools",
      savedTools: nextSavedTools,
      surveyToolId: toolResult.data,
      surveyToolUseCaseId: useCaseIds[0],
    });
    resetToolForm();
    setStep("tool", "ok", `${toolName} opgeslagen. Je kunt nog een tool toevoegen.`);
    setIsSaving(false);
  }

  function handleContinueToComplete() {
    if (savedTools.length === 0) {
      setError("Sla minimaal een tool op voordat je de scan afrondt.");
      return;
    }

    setError(null);
    updateSurveyCurrentStep("complete");
    router.push("/survey/complete");
  }

  function resetToolForm() {
    setSelectedToolId("chatgpt");
    setCustomToolName("");
    setSelectedUseCases(["drafting", "data_analyseren"]);
    setSelectedContexts(["internal_work"]);
    setSelectedAccountType("personal_free");
    setValidationErrors({});
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
            Start eerst een scan en sla de profiel- en datastap op voordat je
            een tool registreert.
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
      <section className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#6993aa]">Stap 4 van 6</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#00658b]">
              Mijn AI gereedschapskist
            </h1>
          </div>
          <span className="rounded-full border border-[#bfc7cf]/60 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#40484e]">
            Vertrouwelijk
          </span>
        </header>

        <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_8px_40px_rgba(0,101,139,0.06)] md:p-8">
          <div className="mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#00658b]/70">
              Toolregistratie
            </p>
            <h2 className="text-2xl font-extrabold leading-tight text-[#00658b]">
              Welke AI-tool gebruik je, en waarvoor?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#40484e]">
              Kies een tool, selecteer een of meer toepassingen, geef de context
              aan en kies het accounttype. Je kunt meerdere tools toevoegen
              voordat je doorgaat naar afronden.
            </p>
          </div>

          <form
            className="grid gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveToolFlow();
            }}
            >
            <SavedToolsSummary savedTools={savedTools} />

            <ToolPicker
              customToolName={customToolName}
              onCustomToolNameChange={setCustomToolName}
              onSelect={setSelectedToolId}
              selectedToolId={selectedToolId}
              validationError={validationErrors.tool}
            />

            <CheckboxGroup
              helpText="Kies alle toepassingen die voor deze tool gelden."
              label="Toepassingen"
              onChange={setSelectedUseCases}
              options={useCaseOptions}
              selectedCodes={selectedUseCases}
              validationError={validationErrors.useCases}
            />

            <CheckboxGroup
              helpText="Kies de context waarin je deze tool inzet."
              label="Context"
              onChange={setSelectedContexts}
              options={contextOptions}
              selectedCodes={selectedContexts}
              validationError={validationErrors.contexts}
            />

            <RadioGroup
              helpText="Kies het accounttype dat het best past bij deze tool."
              label="Accounttype"
              onChange={setSelectedAccountType}
              options={accountTypeOptions}
              selectedCode={selectedAccountType}
              validationError={validationErrors.account}
            />

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <section className="grid gap-3">
              <StepRow label="save_tool" state={steps.tool} />
              <StepRow label="save_tool_use_case" state={steps.useCase} />
              <StepRow
                label="save_tool_use_case_context"
                state={steps.context}
              />
              <StepRow label="save_tool_account" state={steps.account} />
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
                href="/survey/data"
              >
                Vorige
              </a>
              <button
                className="inline-flex h-11 items-center rounded-full bg-[#00658b] px-7 text-sm font-bold text-white shadow-lg transition hover:bg-[#004c6a] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Opslaan..." : "Tool opslaan"}
              </button>
              <button
                className="inline-flex h-11 items-center rounded-full border border-[#00658b] bg-white px-7 text-sm font-bold text-[#00658b] transition hover:bg-[#c4e7ff]/30 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving || savedTools.length === 0}
                onClick={handleContinueToComplete}
                type="button"
              >
                Verder naar afronden
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}

function SavedToolsSummary({
  savedTools,
}: {
  savedTools: StoredSurveyTool[];
}) {
  return (
    <section className="grid gap-3 rounded-2xl border border-[#bfc7cf]/50 bg-white/70 p-4">
      <div>
        <h3 className="font-bold text-[#00658b]">Opgeslagen tools</h3>
        <p className="mt-1 text-sm leading-6 text-[#40484e]">
          Voeg minimaal een tool toe. Daarna kun je afronden of nog een tool
          registreren.
        </p>
      </div>
      {savedTools.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#bfc7cf] bg-white px-4 py-3 text-sm text-[#40484e]">
          Nog geen tools opgeslagen.
        </p>
      ) : (
        <div className="grid gap-2">
          {savedTools.map((tool, index) => (
            <article
              className="rounded-xl border border-[#bfc7cf]/60 bg-white px-4 py-3 text-sm"
              key={tool.surveyToolId}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold text-[#181c1e]">
                  {index + 1}. {tool.toolName}
                </h4>
                <span className="rounded-full bg-[#c4e7ff]/50 px-2.5 py-1 text-xs font-semibold text-[#00658b]">
                  {tool.useCaseCodes.length} usecase
                  {tool.useCaseCodes.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-2 text-[#40484e]">
                Context: {tool.contextCodes.join(", ")} · Account:{" "}
                {tool.accountTypeCode}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ToolPicker({
  customToolName,
  onCustomToolNameChange,
  onSelect,
  selectedToolId,
  validationError,
}: {
  customToolName: string;
  onCustomToolNameChange: (value: string) => void;
  onSelect: (toolId: string) => void;
  selectedToolId: string;
  validationError?: string;
}) {
  return (
    <section
      className={`grid gap-4 rounded-2xl border bg-white/70 p-4 ${
        validationError ? "border-red-300" : "border-[#bfc7cf]/50"
      }`}
    >
      <div>
        <h3 className="font-bold text-[#00658b]">
          Tool <span className="text-red-600">*</span>
        </h3>
        <p className="mt-1 text-sm leading-6 text-[#40484e]">
          Kies de AI-tool die je in deze stap wilt registreren.
        </p>
        {validationError ? (
          <p className="mt-2 text-sm font-semibold text-red-700">
            {validationError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {toolOptions.map((tool) => (
          <label
            className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:bg-[#c4e7ff]/20 ${
              selectedToolId === tool.id
                ? "border-[#00658b] bg-[#c4e7ff]/40"
                : "border-[#bfc7cf] bg-white/70"
            }`}
            key={tool.id}
          >
            <input
              checked={selectedToolId === tool.id}
              className="mt-0.5 h-5 w-5 accent-[#00658b]"
              name="tool"
              onChange={() => onSelect(tool.id)}
              type="radio"
              value={tool.id}
            />
            <span>
              <span className="block text-sm font-semibold text-[#181c1e]">
                {tool.name}
              </span>
              <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-[#00658b]">
                {tool.category}
              </span>
              {tool.description ? (
                <span className="mt-1 block text-xs leading-5 text-[#40484e]">
                  {tool.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>

      {selectedToolId === "custom" ? (
        <label className="grid gap-2 text-sm font-semibold text-[#181c1e]">
          Naam van de tool
          <input
            className="h-11 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
            onChange={(event) => onCustomToolNameChange(event.target.value)}
            placeholder="Bijvoorbeeld: Gamma, Fireflies.ai of eigen tool"
            type="text"
            value={customToolName}
          />
        </label>
      ) : null}
    </section>
  );
}

function CheckboxGroup({
  helpText,
  label,
  onChange,
  options,
  selectedCodes,
  validationError,
}: {
  helpText: string;
  label: string;
  onChange: (codes: string[]) => void;
  options: SurveyOption[];
  selectedCodes: string[];
  validationError?: string;
}) {
  function toggleCode(code: string) {
    onChange(
      selectedCodes.includes(code)
        ? selectedCodes.filter((selectedCode) => selectedCode !== code)
        : [...selectedCodes, code],
    );
  }

  return (
    <section
      className={`grid gap-4 rounded-2xl border bg-white/70 p-4 ${
        validationError ? "border-red-300" : "border-[#bfc7cf]/50"
      }`}
    >
      <div>
        <h3 className="font-bold text-[#00658b]">
          {label} <span className="text-red-600">*</span>
        </h3>
        <p className="mt-1 text-sm leading-6 text-[#40484e]">{helpText}</p>
        {validationError ? (
          <p className="mt-2 text-sm font-semibold text-red-700">
            {validationError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {options.map((option) => (
          <label
            className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:bg-[#c4e7ff]/20 ${
              selectedCodes.includes(option.code)
                ? "border-[#00658b] bg-[#c4e7ff]/40"
                : "border-[#bfc7cf] bg-white/70"
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

function RadioGroup({
  helpText,
  label,
  onChange,
  options,
  selectedCode,
  validationError,
}: {
  helpText: string;
  label: string;
  onChange: (code: string) => void;
  options: SurveyOption[];
  selectedCode: string;
  validationError?: string;
}) {
  return (
    <section
      className={`grid gap-4 rounded-2xl border bg-white/70 p-4 ${
        validationError ? "border-red-300" : "border-[#bfc7cf]/50"
      }`}
    >
      <div>
        <h3 className="font-bold text-[#00658b]">
          {label} <span className="text-red-600">*</span>
        </h3>
        <p className="mt-1 text-sm leading-6 text-[#40484e]">{helpText}</p>
        {validationError ? (
          <p className="mt-2 text-sm font-semibold text-red-700">
            {validationError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {options.map((option) => (
          <label
            className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:bg-[#c4e7ff]/20 ${
              selectedCode === option.code
                ? "border-[#00658b] bg-[#c4e7ff]/40"
                : "border-[#bfc7cf] bg-white/70"
            }`}
            key={option.code}
          >
            <input
              checked={selectedCode === option.code}
              className="mt-0.5 h-5 w-5 accent-[#00658b]"
              name="account_type"
              onChange={() => onChange(option.code)}
              type="radio"
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

function validateToolStep({
  accountType,
  contexts,
  toolName,
  useCases,
}: {
  accountType: string;
  contexts: string[];
  toolName: string;
  useCases: string[];
}) {
  const errors: ValidationErrors = {};

  if (!toolName.trim()) {
    errors.tool = "Kies een tool of vul een toolnaam in.";
  }

  if (useCases.length === 0) {
    errors.useCases = "Kies minimaal een toepassing.";
  }

  if (contexts.length === 0) {
    errors.contexts = "Kies minimaal een context.";
  }

  if (!accountType) {
    errors.account = "Kies een accounttype.";
  }

  return errors;
}

function getSelectedToolName(tool: ToolOption, customToolName: string) {
  return tool.id === "custom" ? customToolName.trim() : tool.name;
}

function StepRow({ label, state }: { label: string; state: StepState }) {
  return (
    <div className="grid gap-2 rounded-xl border border-[#bfc7cf]/50 bg-white px-4 py-3 sm:grid-cols-[250px_90px_1fr] sm:items-center">
      <span className="font-mono text-sm font-semibold text-[#181c1e]">
        {label}
      </span>
      <span
        className="w-max rounded-full border border-[#bfc7cf]/60 px-2.5 py-1 text-xs font-semibold text-[#40484e]"
        data-status={state.status}
      >
        {state.status}
      </span>
      <span className="break-words text-sm text-[#40484e]">{state.message}</span>
    </div>
  );
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
