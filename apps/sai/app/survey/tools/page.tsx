"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SurveyProgress } from "@/components/survey-progress";
import {
  EmptySurveyState,
  RequiredBadge,
  RpcStepRow,
  RunIdCard,
  SurveySummaryGrid,
  SurveySummaryItem,
  ValidationMessage,
} from "@/components/survey-ui";
import {
  saveTool,
  saveToolAccount,
  saveToolUseCase,
  saveToolUseCaseContext,
} from "@/lib/sai-rpc/client";
import {
  markSurveyStepCompleted,
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
  canAccessSurveyStep,
  getResumeStep,
  type SurveyStepId,
} from "@/lib/sai-survey/flow";
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

const ALL_TOOL_CATEGORIES = "Alle";
const TOOL_CATEGORIES = [
  ALL_TOOL_CATEGORIES,
  ...Array.from(new Set(toolOptions.map((tool) => tool.category))),
];

export default function SurveyToolsPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(
    null,
  );
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [selectedToolId, setSelectedToolId] = useState("chatgpt");
  const [selectedToolCategory, setSelectedToolCategory] =
    useState(ALL_TOOL_CATEGORIES);
  const [toolSearchQuery, setToolSearchQuery] = useState("");
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
  const filteredToolOptions = useMemo(
    () =>
      toolOptions.filter((tool) => {
        const matchesCategory =
          selectedToolCategory === ALL_TOOL_CATEGORIES ||
          tool.category === selectedToolCategory;
        const normalizedQuery = toolSearchQuery.trim().toLowerCase();
        const matchesSearch =
          !normalizedQuery ||
          tool.name.toLowerCase().includes(normalizedQuery) ||
          tool.category.toLowerCase().includes(normalizedQuery);

        return matchesCategory && matchesSearch;
      }),
    [selectedToolCategory, toolSearchQuery],
  );

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      if (!canAccessSurveyStep(storedSession, "tools")) {
        router.replace(getResumeStep(storedSession).href);
        return;
      }

      updateSurveyCurrentStep("tools");
      setSurveySession({
        runId: storedSession.runId,
        submissionToken: storedSession.submissionToken,
      });
      setRunId(storedSession.runId);
      setSavedTools(storedSession.savedTools ?? []);
      setCompletedSteps(storedSession.completedSteps ?? []);
    });
  }, [router]);

  async function handleSaveToolFlow() {
    if (!surveySession) {
      setError("Geen actieve respondent session gevonden. Start de scan opnieuw.");
      return;
    }

    setError(null);
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
      return;
    }

    setIsSaving(true);
    setSteps(INITIAL_STEPS);

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
    markSurveyStepCompleted("tools");
    updateSurveyCurrentStep("complete");
    router.push("/survey/complete");
  }

  function resetToolForm() {
    setSelectedToolId("chatgpt");
    setSelectedToolCategory(ALL_TOOL_CATEGORIES);
    setToolSearchQuery("");
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
      <EmptySurveyState>
        Start eerst een scan en sla de profiel- en datastap op voordat je een
        tool registreert.
      </EmptySurveyState>
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

        <SurveyProgress completedSteps={completedSteps} currentStep="tools" />

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

            <ToolAnswerSummary
              accountTypeLabel={getSelectedOptionLabels(
                accountTypeOptions,
                [selectedAccountType],
              )}
              contextCount={selectedContexts.length}
              toolName={getSelectedToolName(selectedTool, customToolName)}
              useCaseCount={selectedUseCases.length}
            />

            <ToolPicker
              customToolName={customToolName}
              filteredToolOptions={filteredToolOptions}
              isDisabled={isSaving}
              onCustomToolNameChange={setCustomToolName}
              onSearchQueryChange={setToolSearchQuery}
              onSelectCategory={setSelectedToolCategory}
              onSelect={setSelectedToolId}
              searchQuery={toolSearchQuery}
              selectedCategory={selectedToolCategory}
              selectedToolId={selectedToolId}
              validationError={validationErrors.tool}
            />

            <CheckboxGroup
              helpText="Kies alle toepassingen die voor deze tool gelden."
              isDisabled={isSaving}
              label="Toepassingen"
              onChange={setSelectedUseCases}
              options={useCaseOptions}
              selectedCodes={selectedUseCases}
              validationError={validationErrors.useCases}
            />

            <CheckboxGroup
              helpText="Kies de context waarin je deze tool inzet."
              isDisabled={isSaving}
              label="Context"
              onChange={setSelectedContexts}
              options={contextOptions}
              selectedCodes={selectedContexts}
              validationError={validationErrors.contexts}
            />

            <RadioGroup
              helpText="Kies het accounttype dat het best past bij deze tool."
              isDisabled={isSaving}
              label="Accounttype"
              onChange={setSelectedAccountType}
              options={accountTypeOptions}
              selectedCode={selectedAccountType}
              validationError={validationErrors.account}
            />

            {error ? (
              <ValidationMessage>{error}</ValidationMessage>
            ) : null}

            <section className="grid gap-3">
              <RpcStepRow label="save_tool" state={steps.tool} />
              <RpcStepRow label="save_tool_use_case" state={steps.useCase} />
              <RpcStepRow
                label="save_tool_use_case_context"
                state={steps.context}
              />
              <RpcStepRow label="save_tool_account" state={steps.account} />
            </section>

            <RunIdCard runId={runId} />

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
        <div className="grid gap-3">
          {savedTools.map((tool, index) => (
            <article
              className="grid gap-3 rounded-xl border border-[#bfc7cf]/60 bg-white px-4 py-3 text-sm md:grid-cols-[1fr_auto]"
              key={tool.surveyToolId}
            >
              <div>
                <h4 className="font-bold text-[#181c1e]">
                  {index + 1}. {tool.toolName}
                </h4>
                <p className="mt-2 text-[#40484e]">
                  Usecases: {tool.useCaseCodes.join(", ")}
                </p>
                <p className="mt-1 text-[#40484e]">
                  Context: {tool.contextCodes.join(", ")} · Account:{" "}
                  {tool.accountTypeCode}
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-2 md:justify-end">
                <span className="rounded-full bg-[#c4e7ff]/50 px-2.5 py-1 text-xs font-semibold text-[#00658b]">
                  {tool.useCaseCodes.length} usecase
                  {tool.useCaseCodes.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-[#f1f4f6] px-2.5 py-1 text-xs font-semibold text-[#40484e]">
                  {tool.contextCodes.length} context
                  {tool.contextCodes.length === 1 ? "" : "en"}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ToolAnswerSummary({
  accountTypeLabel,
  contextCount,
  toolName,
  useCaseCount,
}: {
  accountTypeLabel: string;
  contextCount: number;
  toolName: string;
  useCaseCount: number;
}) {
  return (
    <SurveySummaryGrid columnsClassName="md:grid-cols-4">
      <SurveySummaryItem label="Tool" value={toolName || "Nog niet gekozen"} />
      <SurveySummaryItem
        label="Usecases"
        value={`${useCaseCount} geselecteerd`}
      />
      <SurveySummaryItem
        label="Context"
        value={`${contextCount} geselecteerd`}
      />
      <SurveySummaryItem
        label="Account"
        value={accountTypeLabel || "Niet gekozen"}
      />
    </SurveySummaryGrid>
  );
}

function ToolPicker({
  customToolName,
  filteredToolOptions,
  isDisabled = false,
  onCustomToolNameChange,
  onSearchQueryChange,
  onSelect,
  onSelectCategory,
  searchQuery,
  selectedCategory,
  selectedToolId,
  validationError,
}: {
  customToolName: string;
  filteredToolOptions: ToolOption[];
  isDisabled?: boolean;
  onCustomToolNameChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onSelect: (toolId: string) => void;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  selectedCategory: string;
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
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-[#00658b]">Tool</h3>
          <RequiredBadge />
        </div>
        <p className="mt-1 text-sm leading-6 text-[#40484e]">
          Kies de AI-tool die je in deze stap wilt registreren.
        </p>
        {validationError ? (
          <p className="mt-2 text-sm font-semibold text-red-700">
            {validationError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-xl border border-[#bfc7cf]/50 bg-white p-3">
        <label className="grid gap-2 text-sm font-semibold text-[#181c1e]">
          Zoek tool
          <input
            className="h-11 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
            disabled={isDisabled}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Zoek bijvoorbeeld Claude, Copilot of n8n"
            type="search"
            value={searchQuery}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {TOOL_CATEGORIES.map((category) => (
            <button
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                selectedCategory === category
                  ? "border-[#00658b] bg-[#00658b] text-white"
                  : "border-[#bfc7cf] bg-white text-[#40484e] hover:border-[#00658b]"
              }`}
              disabled={isDisabled}
              key={category}
              onClick={() => onSelectCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {filteredToolOptions.map((tool) => (
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
              disabled={isDisabled}
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
      {filteredToolOptions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#bfc7cf] bg-white px-4 py-3 text-sm text-[#40484e]">
          Geen tool gevonden. Kies Andere tool of pas je filter aan.
        </p>
      ) : null}

      {selectedToolId === "custom" ? (
        <label className="grid gap-2 text-sm font-semibold text-[#181c1e]">
          Naam van de tool
          <input
            className="h-11 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
            disabled={isDisabled}
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
  isDisabled = false,
  label,
  onChange,
  options,
  selectedCodes,
  validationError,
}: {
  helpText: string;
  isDisabled?: boolean;
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-[#00658b]">{label}</h3>
            <RequiredBadge />
          </div>
          <span className="rounded-full bg-[#c4e7ff]/50 px-2.5 py-1 text-xs font-bold text-[#00658b]">
            {selectedCodes.length} geselecteerd
          </span>
        </div>
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
              disabled={isDisabled}
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
  isDisabled = false,
  label,
  onChange,
  options,
  selectedCode,
  validationError,
}: {
  helpText: string;
  isDisabled?: boolean;
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
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-[#00658b]">{label}</h3>
          <RequiredBadge />
        </div>
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
              disabled={isDisabled}
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

function getSelectedOptionLabels(options: SurveyOption[], selectedCodes: string[]) {
  return selectedCodes
    .map((code) => options.find((option) => option.code === code)?.label ?? code)
    .join(", ");
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
