"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  RequiredBadge,
  RpcStepRow,
  RunIdCard,
  SecondarySurveyButton,
  SurveyFooterActions,
  SurveyStepLayout,
  SurveySummaryGrid,
  SurveySummaryItem,
  TechnicalStatus,
  ValidationMessage,
} from "@/components/survey-ui";
import { saveTool } from "@/lib/sai-rpc/client";
import {
  markSurveyStepCompleted,
  readSurveySession,
  type StoredSurveyTool,
  updateSurveyCurrentStep,
  updateSurveySession,
} from "@/lib/sai-rpc/session";
import type {
  RpcError,
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
  toolOptions,
  type SurveyOption,
  type ToolOption,
  useCaseOptions,
} from "@/lib/sai-survey/options";

type StepState = {
  status: "idle" | "running" | "ok" | "error";
  message: string;
};

const INITIAL_TOOL_STEP: StepState = {
  status: "idle",
  message: "Wacht op toolkeuze",
};

const ALL_TOOL_CATEGORIES = "Alle";
const TOOL_CATEGORIES = [
  ALL_TOOL_CATEGORIES,
  ...Array.from(new Set(toolOptions.map((tool) => tool.category))),
];
const POPULAR_TOOL_IDS = [
  "chatgpt",
  "claude",
  "gemini",
  "microsoft_copilot",
  "perplexity",
  "midjourney",
  "fireflies_ai",
  "cursor",
  "n8n",
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
  const [savedTools, setSavedTools] = useState<StoredSurveyTool[]>([]);
  const [toolStep, setToolStep] = useState<StepState>(INITIAL_TOOL_STEP);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTool = useMemo(
    () =>
      toolOptions.find((tool) => tool.id === selectedToolId) ?? toolOptions[0],
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
  const popularToolOptions = useMemo(
    () => getPopularTools(toolOptions),
    [],
  );
  const categoryCounts = useMemo(() => getCategoryCounts(toolOptions), []);
  const selectedToolName = getSelectedToolName(selectedTool, customToolName);
  const alreadySavedCount = savedTools.filter(
    (tool) => tool.toolName.toLowerCase() === selectedToolName.toLowerCase(),
  ).length;

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

  async function handleSaveTool() {
    if (!surveySession) {
      setError("Geen actieve respondent session gevonden. Start de scan opnieuw.");
      return;
    }

    setError(null);

    if (!selectedToolName.trim()) {
      setError("Kies een tool of vul een toolnaam in.");
      return;
    }

    setIsSaving(true);
    setToolStep({ status: "running", message: "Tool registreren" });

    const toolPayload: SaveToolPayload = {
      tool_name: selectedToolName,
      is_custom: !selectedTool.toolCode,
      catalog_beheerstatus_code: "newly_discovered",
    };

    if (selectedTool.toolCode) {
      toolPayload.tool_code = selectedTool.toolCode;
    }

    const toolResult = await saveTool(surveySession, toolPayload);

    if (!toolResult.ok) {
      finishWithError(toolResult.error);
      return;
    }

    const pendingTool = {
      surveyToolId: toolResult.data,
      toolName: selectedToolName,
      registeredAt: new Date().toISOString(),
    };

    markSurveyStepCompleted("tools");
    updateSurveySession({
      currentStep: "useCases",
      pendingTool,
      surveyToolId: toolResult.data,
      surveyToolUseCaseId: undefined,
    });
    setToolStep({ status: "ok", message: `${selectedToolName} geregistreerd` });
    setIsSaving(false);
    router.push("/survey/use-cases");
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

  function finishWithError(rpcError: RpcError) {
    setToolStep({ status: "error", message: formatRpcError(rpcError) });
    setError(formatRpcError(rpcError));
    setIsSaving(false);
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
    <SurveyStepLayout
      completedSteps={completedSteps}
      currentStep="tools"
      eyebrow="Toolregistratie"
      intro="Kies de AI-tool die je gebruikt. Toepassing, context en accountstatus volgen in aparte stappen."
      maxWidthClassName="max-w-5xl"
      title="Welke AI-tool wil je registreren?"
    >
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSaveTool();
        }}
      >
        <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
          <ToolPicker
            alreadySavedCount={alreadySavedCount}
            categoryCounts={categoryCounts}
            customToolName={customToolName}
            filteredToolOptions={filteredToolOptions}
            isDisabled={isSaving}
            onCustomToolNameChange={setCustomToolName}
            onSearchQueryChange={setToolSearchQuery}
            onSelectCategory={setSelectedToolCategory}
            onSelect={setSelectedToolId}
            popularToolOptions={popularToolOptions}
            searchQuery={toolSearchQuery}
            selectedCategory={selectedToolCategory}
            selectedToolId={selectedToolId}
            totalToolCount={toolOptions.length}
          />

          <ToolWorkspace
            savedTools={savedTools}
            selectedCategory={selectedTool.category}
            toolName={selectedToolName}
          />
        </section>

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        <TechnicalStatus>
          <RpcStepRow label="save_tool" state={toolStep} />
        </TechnicalStatus>

        <RunIdCard runId={runId} />

        <SurveyFooterActions backHref="/survey/data">
          <PrimarySurveyButton
            disabled={isSaving}
            isBusy={isSaving}
            type="submit"
          >
            {isSaving
              ? "Opslaan..."
              : alreadySavedCount > 0
                ? "Nogmaals registreren"
                : "Tool registreren"}
          </PrimarySurveyButton>
          <SecondarySurveyButton
            disabled={isSaving || savedTools.length === 0}
            onClick={handleContinueToComplete}
          >
            Verder naar afronden
          </SecondarySurveyButton>
        </SurveyFooterActions>
      </form>
    </SurveyStepLayout>
  );
}

function ToolWorkspace({
  savedTools,
  selectedCategory,
  toolName,
}: {
  savedTools: StoredSurveyTool[];
  selectedCategory: string;
  toolName: string;
}) {
  return (
    <section className="relative grid min-w-0 max-w-full gap-4 rounded-[1.6rem] border-2 border-dashed border-[#bfc7cf]/70 bg-white/55 p-4 shadow-[0_8px_24px_rgba(0,101,139,0.04)] md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-extrabold text-[#00658b]">
            Jouw selectie
          </h3>
          <p className="mt-1 break-words text-sm leading-6 text-[#40484e]">
            Voeg per AI-tool toepassing en accountstatus toe. Na elke tool kies
            je of je nog een tool registreert of afrondt.
          </p>
        </div>
        <span className="rounded-full bg-[#00658b] px-3 py-1 text-xs font-extrabold text-white">
          {savedTools.length} afgerond
        </span>
      </div>

      <SurveySummaryGrid columnsClassName="grid-cols-2">
        <SurveySummaryItem label="Tool" value={toolName || "Nog niet gekozen"} />
        <SurveySummaryItem label="Categorie" value={selectedCategory} />
      </SurveySummaryGrid>

      {savedTools.length === 0 ? (
        <div className="grid min-h-44 min-w-0 place-items-center rounded-2xl border border-dashed border-[#bfc7cf]/80 bg-white/65 px-4 py-8 text-center">
          <div className="min-w-0">
            <p className="break-words text-base font-extrabold text-[#00658b]/55">
              Nog geen afgeronde toolregistraties
            </p>
            <p className="mt-2 break-words text-sm leading-6 text-[#40484e]/75">
              Kies links een tool en ga daarna door naar toepassingen.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {savedTools.map((tool, index) => (
            <article
              className="grid min-w-0 gap-2 rounded-xl border border-[#00658b]/35 bg-white px-4 py-3 text-sm shadow-[0_4px_14px_rgba(0,101,139,0.06)]"
              key={tool.surveyToolId}
            >
              <h4 className="font-bold text-[#181c1e]">
                {index + 1}. {tool.toolName}
              </h4>
              <p className="break-words text-[#40484e]">
                {tool.useCaseCodes.length} toepassing
                {tool.useCaseCodes.length === 1 ? "" : "en"} -{" "}
                {getOptionLabel(accountTypeOptions, tool.accountTypeCode)}
              </p>
              <p className="break-words text-xs text-[#40484e]/80">
                {getOptionLabels(useCaseOptions, tool.useCaseCodes)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ToolPicker({
  alreadySavedCount,
  categoryCounts,
  customToolName,
  filteredToolOptions,
  isDisabled = false,
  onCustomToolNameChange,
  onSearchQueryChange,
  onSelect,
  onSelectCategory,
  popularToolOptions,
  searchQuery,
  selectedCategory,
  selectedToolId,
  totalToolCount,
}: {
  alreadySavedCount: number;
  categoryCounts: Map<string, number>;
  customToolName: string;
  filteredToolOptions: ToolOption[];
  isDisabled?: boolean;
  onCustomToolNameChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onSelect: (toolId: string) => void;
  onSelectCategory: (category: string) => void;
  popularToolOptions: ToolOption[];
  searchQuery: string;
  selectedCategory: string;
  selectedToolId: string;
  totalToolCount: number;
}) {
  const catalogHelpId = "tool-catalog-help";

  return (
    <fieldset
      aria-describedby={catalogHelpId}
      className="grid min-w-0 max-w-full gap-4 rounded-[1.6rem] border border-white/80 bg-white/80 p-4 shadow-[0_8px_24px_rgba(0,101,139,0.04)] md:p-5"
    >
      <legend className="sr-only">Keuzegroep</legend>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-extrabold text-[#00658b]">
            Catalogus
          </h3>
          <p
            className="mt-1 break-words text-sm leading-6 text-[#40484e]"
            id={catalogHelpId}
          >
            Kies de AI-tool die je in deze stap wilt registreren.
          </p>
        </div>
        <RequiredBadge />
      </div>

      <div className="grid min-w-0 gap-3 rounded-2xl border border-[#c4e7ff] bg-[#f3fbff] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-extrabold text-[#00658b]">
            Veel gekozen
          </h4>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#00658b]">
            Snelle keuze
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {popularToolOptions.map((tool) => (
            <button
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                selectedToolId === tool.id
                  ? "border-[#00658b] bg-[#00658b] text-white"
                  : "border-[#bfc7cf] bg-white text-[#40484e] hover:border-[#00658b] hover:text-[#00658b]"
              }`}
              disabled={isDisabled}
              key={tool.id}
              onClick={() => onSelect(tool.id)}
              type="button"
            >
              {tool.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 gap-3 rounded-2xl border border-[#bfc7cf]/45 bg-[#f7fafc] p-3">
        <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#181c1e]">
          Zoek tool
          <input
            className="h-11 w-full min-w-0 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
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
              {category}{" "}
              <span className="font-black opacity-75">
                {category === ALL_TOOL_CATEGORIES
                  ? totalToolCount
                  : (categoryCounts.get(category) ?? 0)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {alreadySavedCount > 0 ? (
        <p className="break-words rounded-xl border border-[#c4e7ff] bg-[#f3fbff] px-4 py-3 text-sm font-medium text-[#00658b]">
          Deze tool staat al {alreadySavedCount} keer in je registratie. Je kunt
          hem nogmaals toevoegen als het om een andere toepassing of account gaat.
        </p>
      ) : null}

      <div className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
        {filteredToolOptions.map((tool) => (
          <label
            className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:shadow-[0_4px_12px_rgba(0,101,139,0.06)] ${
              selectedToolId === tool.id
                ? "border-[#00658b] bg-[#f1f4f6]"
                : "border-[#bfc7cf] bg-white"
            }`}
            key={tool.id}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f1f4f6] text-sm font-black text-[#00658b]">
                {tool.name.slice(0, 1)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-[#181c1e]">
                  {tool.name}
                </span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-[#40484e]">
                  {tool.category}
                </span>
              </span>
            </span>
            <input
              checked={selectedToolId === tool.id}
              className="h-5 w-5 shrink-0 accent-[#00658b]"
              disabled={isDisabled}
              name="tool"
              onChange={() => onSelect(tool.id)}
              type="radio"
              value={tool.id}
            />
          </label>
        ))}
      </div>
      {filteredToolOptions.length === 0 ? (
        <div className="grid min-w-0 gap-3 rounded-xl border border-dashed border-[#bfc7cf] bg-white px-4 py-4 text-sm text-[#40484e]">
          <div className="min-w-0">
            <p className="break-words font-bold text-[#181c1e]">Geen tool gevonden</p>
            <p className="mt-1 break-words leading-6">
              Registreer de tool als eigen invoer of pas je zoekterm/filter aan.
            </p>
          </div>
          <button
            className="inline-flex h-10 w-max items-center justify-center rounded-full border border-[#00658b] px-4 text-xs font-extrabold text-[#00658b] transition hover:bg-[#c4e7ff]/30"
            disabled={isDisabled}
            onClick={() => onSelect("custom")}
            type="button"
          >
            Eigen invoer gebruiken
          </button>
        </div>
      ) : null}

      {selectedToolId === "custom" ? (
        <label className="grid min-w-0 gap-2 border-t border-[#bfc7cf]/35 pt-4 text-sm font-semibold text-[#181c1e]">
          Naam van de tool
          <input
            className="h-11 w-full min-w-0 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
            disabled={isDisabled}
            onChange={(event) => onCustomToolNameChange(event.target.value)}
            placeholder="Bijvoorbeeld: Gamma, Fireflies.ai of eigen tool"
            type="text"
            value={customToolName}
          />
        </label>
      ) : null}
    </fieldset>
  );
}

function getSelectedToolName(tool: ToolOption, customToolName: string) {
  return tool.id === "custom" ? customToolName.trim() : tool.name;
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}

function getOptionLabel(options: SurveyOption[], code: string) {
  return options.find((option) => option.code === code)?.label ?? code;
}

function getOptionLabels(options: SurveyOption[], codes: string[]) {
  return codes.map((code) => getOptionLabel(options, code)).join(", ");
}

function getCategoryCounts(tools: ToolOption[]) {
  return tools.reduce((counts, tool) => {
    counts.set(tool.category, (counts.get(tool.category) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

function getPopularTools(tools: readonly ToolOption[]) {
  const popularTools: ToolOption[] = [];

  for (const toolId of POPULAR_TOOL_IDS) {
    const tool = tools.find((candidate) => candidate.id === toolId);

    if (tool) {
      popularTools.push(tool);
    }
  }

  return popularTools;
}
