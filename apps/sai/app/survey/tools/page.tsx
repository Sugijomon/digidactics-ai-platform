"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  SecondarySurveyButton,
  SurveyFooterActions,
  SurveyStepLayout,
  ValidationMessage,
} from "@/components/survey-ui";
import { saveTool, saveToolUseCase } from "@/lib/sai-rpc/client";
import {
  markSurveyStepCompleted,
  readSurveySession,
  storeSurveyGuardNotice,
  type PendingSurveyTool,
  type StoredSurveyTool,
  updateSurveyCurrentStep,
  updateSurveySession,
} from "@/lib/sai-rpc/session";
import type { RpcError, SaveToolPayload, SurveySession } from "@/lib/sai-rpc/types";
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

const DEFAULT_USE_CASES_BY_TOOL: Record<string, string[]> = {
  chatgpt: [
    "teksten_schrijven",
    "brainstormen",
    "informatie_opzoeken",
    "samenvatten_redigeren",
    "vertalen",
    "data_analyseren",
    "code_schrijven",
  ],
  claude: [
    "teksten_schrijven",
    "samenvatten_redigeren",
    "brainstormen",
    "informatie_opzoeken",
    "data_analyseren",
    "code_schrijven",
  ],
  gemini: [
    "teksten_schrijven",
    "samenvatten_redigeren",
    "vertalen",
    "brainstormen",
    "informatie_opzoeken",
    "data_analyseren",
    "afbeeldingen_genereren",
  ],
  microsoft_copilot: [
    "teksten_schrijven",
    "samenvatten_redigeren",
    "brainstormen",
    "informatie_opzoeken",
    "data_analyseren",
  ],
  perplexity: ["informatie_opzoeken", "samenvatten_redigeren"],
  notebooklm: [
    "samenvatten_redigeren",
    "informatie_opzoeken",
    "brainstormen",
    "presentaties_design",
  ],
  github_copilot: ["code_schrijven"],
  cursor: ["code_schrijven"],
  claude_code: ["code_schrijven", "workflow_uitvoeren"],
  midjourney: ["afbeeldingen_genereren"],
  canva_ai: ["presentaties_design", "afbeeldingen_genereren"],
  gamma: ["presentaties_design", "teksten_schrijven", "brainstormen"],
  fireflies_ai: ["vergaderingen_notuleren", "samenvatten_redigeren"],
  otter_ai: ["vergaderingen_notuleren", "samenvatten_redigeren"],
  n8n: ["automatisering", "workflow_uitvoeren", "systemen_aansturen"],
  make: ["automatisering", "workflow_uitvoeren"],
  zapier_ai: ["automatisering", "workflow_uitvoeren"],
};

export default function SurveyToolsPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [selectedToolId, setSelectedToolId] = useState("chatgpt");
  const [selectedToolCategory, setSelectedToolCategory] =
    useState(ALL_TOOL_CATEGORIES);
  const [toolSearchQuery, setToolSearchQuery] = useState("");
  const [customToolName, setCustomToolName] = useState("");
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([
    "teksten_schrijven",
    "brainstormen",
  ]);
  const [isUseCaseModalOpen, setIsUseCaseModalOpen] = useState(false);
  const [pendingTools, setPendingTools] = useState<PendingSurveyTool[]>([]);
  const [savedTools, setSavedTools] = useState<StoredSurveyTool[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTool = useMemo(
    () => toolOptions.find((tool) => tool.id === selectedToolId) ?? toolOptions[0],
    [selectedToolId],
  );

  const selectedToolName = getSelectedToolName(selectedTool, customToolName);

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

  const popularToolOptions = useMemo(() => getPopularTools(toolOptions), []);
  const categoryCounts = useMemo(() => getCategoryCounts(toolOptions), []);

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      if (!canAccessSurveyStep(storedSession, "tools")) {
        storeSurveyGuardNotice(
          "We hebben je teruggezet naar de eerstvolgende open stap.",
        );
        router.replace(getResumeStep(storedSession).href);
        return;
      }

      updateSurveyCurrentStep("tools");
      setSurveySession({
        runId: storedSession.runId,
        submissionToken: storedSession.submissionToken,
      });
      setRunId(storedSession.runId);
      setPendingTools(
        storedSession.pendingTools ??
          (storedSession.pendingTool ? [storedSession.pendingTool] : []),
      );
      setSavedTools(storedSession.savedTools ?? []);
      setCompletedSteps(storedSession.completedSteps ?? []);
    });
  }, [router]);

  function handleSelectTool(toolId: string) {
    setSelectedToolId(toolId);
    setError(null);
    setSelectedUseCases(getSuggestedUseCases(toolId).slice(0, 2));
  }

  async function handleSuggestUseCases() {
    setIsSuggesting(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    setSelectedUseCases(getSuggestedUseCases(selectedToolId));
    setIsSuggesting(false);
  }

  async function handleSaveToolWithUseCases() {
    if (!surveySession) {
      setError("Geen actieve scan gevonden. Start de scan opnieuw.");
      return;
    }

    if (!selectedToolName.trim()) {
      setError("Kies een tool of vul een toolnaam in.");
      return;
    }

    if (selectedUseCases.length === 0) {
      setError("Kies minimaal een toepassing voor deze tool.");
      return;
    }

    setIsSaving(true);
    setError(null);

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

    const surveyToolUseCaseIds: string[] = [];

    for (const useCaseCode of selectedUseCases) {
      const useCaseResult = await saveToolUseCase(
        surveySession,
        toolResult.data,
        useCaseCode,
      );

      if (!useCaseResult.ok) {
        finishWithError(useCaseResult.error);
        return;
      }

      surveyToolUseCaseIds.push(useCaseResult.data);
    }

    const pendingTool = {
      surveyToolId: toolResult.data,
      toolName: selectedToolName,
      registeredAt: new Date().toISOString(),
      useCaseCodes: selectedUseCases,
      contextCodes: [],
      surveyToolUseCaseIds,
    };
    const nextPendingTools = [
      ...pendingTools.filter((tool) => tool.surveyToolId !== pendingTool.surveyToolId),
      pendingTool,
    ];

    updateSurveySession({
      currentStep: "tools",
      pendingTool,
      pendingTools: nextPendingTools,
      surveyToolId: toolResult.data,
      surveyToolUseCaseId: surveyToolUseCaseIds[0],
    });
    setPendingTools(nextPendingTools);
    setSelectedUseCases(getSuggestedUseCases(selectedToolId).slice(0, 2));
    setIsSaving(false);
  }

  function handleContinueToNextStep() {
    if (pendingTools.length === 0 && savedTools.length === 0) {
      setError("Sla minimaal een tool met toepassing op voordat je doorgaat.");
      return;
    }

    setError(null);
    markSurveyStepCompleted("tools");
    markSurveyStepCompleted("useCases");
    updateSurveyCurrentStep("data");
    router.push("/survey/data");
  }

  function finishWithError(rpcError: RpcError) {
    setError(formatRpcError(rpcError));
    setIsSaving(false);
  }

  if (!runId) {
    return (
      <EmptySurveyState>
        Start eerst een scan en beantwoord de frequentievraag voordat je tools
        selecteert.
      </EmptySurveyState>
    );
  }

  return (
    <SurveyStepLayout
      completedSteps={completedSteps}
      currentStep="tools"
      eyebrow="Mijn AI gereedschapskist"
      intro="Selecteer de tools uit de catalogus en geef per tool meteen aan waarvoor je hem gebruikt."
      maxWidthClassName="max-w-6xl"
      title="Welke AI-tools gebruik je wel eens in je dagelijkse werk?"
    >
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSaveToolWithUseCases();
        }}
      >
        <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <ToolCatalog
            categoryCounts={categoryCounts}
            customToolName={customToolName}
            filteredToolOptions={filteredToolOptions}
            isDisabled={isSaving}
            onCustomToolNameChange={setCustomToolName}
            onSearchQueryChange={setToolSearchQuery}
            onSelect={handleSelectTool}
            onSelectCategory={setSelectedToolCategory}
            popularToolOptions={popularToolOptions}
            searchQuery={toolSearchQuery}
            selectedCategory={selectedToolCategory}
            selectedToolId={selectedToolId}
            totalToolCount={toolOptions.length}
          />

          <ToolWorkspace
            isDisabled={isSaving}
            isModalOpen={isUseCaseModalOpen}
            isSuggesting={isSuggesting}
            onCloseModal={() => setIsUseCaseModalOpen(false)}
            onOpenModal={() => setIsUseCaseModalOpen(true)}
            onSelectUseCases={setSelectedUseCases}
            onSuggestUseCases={() => void handleSuggestUseCases()}
            pendingTools={pendingTools}
            savedTools={savedTools}
            selectedTool={selectedTool}
            selectedToolName={selectedToolName}
            selectedUseCases={selectedUseCases}
          />
        </section>

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        <SurveyFooterActions backHref="/survey/motivations">
          <PrimarySurveyButton disabled={isSaving} isBusy={isSaving} type="submit">
            {isSaving ? "Opslaan..." : "Tool + toepassingen opslaan"}
          </PrimarySurveyButton>
          <SecondarySurveyButton
            disabled={isSaving || (pendingTools.length === 0 && savedTools.length === 0)}
            onClick={handleContinueToNextStep}
          >
            Volgende stap
          </SecondarySurveyButton>
        </SurveyFooterActions>
      </form>
    </SurveyStepLayout>
  );
}

function ToolCatalog({
  categoryCounts,
  customToolName,
  filteredToolOptions,
  isDisabled,
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
  categoryCounts: Map<string, number>;
  customToolName: string;
  filteredToolOptions: ToolOption[];
  isDisabled: boolean;
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
  return (
    <fieldset className="grid min-w-0 gap-4 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_8px_40px_rgba(0,101,139,0.06)] backdrop-blur md:p-6">
      <legend className="sr-only">Toolcatalogus</legend>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold text-[#00658b]">Catalogus</h3>
        </div>
      </div>

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
        {[...new Set([ALL_TOOL_CATEGORIES, ...popularToolOptions.map((tool) => tool.category), ...TOOL_CATEGORIES])].map((category) => (
          <button
            className={`rounded-full border px-3.5 py-2 text-[13px] font-bold transition ${
              selectedCategory === category
                ? "border-[#bfc7cf] bg-[#e5e9eb] text-[#00658b]"
                : "border-transparent bg-transparent text-[#40484e] hover:bg-[#ebeef0]"
            }`}
            disabled={isDisabled}
            key={category}
            onClick={() => onSelectCategory(category)}
            type="button"
          >
            {category}
            <span className="ml-1 font-black opacity-70">
              {category === ALL_TOOL_CATEGORIES
                ? totalToolCount
                : (categoryCounts.get(category) ?? 0)}
            </span>
          </button>
        ))}
      </div>

      <div className="grid max-h-[350px] min-h-[250px] gap-3 overflow-y-auto pr-1 pt-1">
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
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f1f4f6] text-sm font-black text-[#40484e]">
                {tool.name.slice(0, 1)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-bold text-[#181c1e]">
                  {tool.name}
                </span>
              </span>
            </span>
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-black leading-none ${
                selectedToolId === tool.id ? "text-[#00658b]" : "text-[#bfc7cf]"
              }`}
            >
              {selectedToolId === tool.id ? "ok" : "+"}
            </span>
            <input
              checked={selectedToolId === tool.id}
              className="sr-only"
              disabled={isDisabled}
              name="tool"
              onChange={() => onSelect(tool.id)}
              type="radio"
              value={tool.id}
            />
          </label>
        ))}
      </div>

      <div className="mt-1 border-t border-[#bfc7cf]/30 pt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#40484e]">
          Ontbreekt er een?
        </p>
        <label className="flex gap-2">
          <span className="sr-only">Naam van eigen tool</span>
          <input
            className="h-11 min-w-0 flex-1 rounded-xl border border-[#bfc7cf]/60 bg-white px-3 text-sm font-normal outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
            disabled={isDisabled}
            onChange={(event) => {
              onCustomToolNameChange(event.target.value);
              onSelect("custom");
            }}
            placeholder="Naam van eigen tool"
            type="text"
            value={customToolName}
          />
          <button
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ebeef0] text-xl font-black text-[#00658b] transition hover:bg-[#e5e9eb]"
            disabled={isDisabled}
            onClick={() => onSelect("custom")}
            type="button"
          >
            +
          </button>
        </label>
      </div>
    </fieldset>
  );
}

function ToolWorkspace({
  isDisabled,
  isModalOpen,
  isSuggesting,
  onCloseModal,
  onOpenModal,
  onSelectUseCases,
  onSuggestUseCases,
  pendingTools,
  savedTools,
  selectedTool,
  selectedToolName,
  selectedUseCases,
}: {
  isDisabled: boolean;
  isModalOpen: boolean;
  isSuggesting: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
  onSelectUseCases: (codes: string[]) => void;
  onSuggestUseCases: () => void;
  pendingTools: PendingSurveyTool[];
  savedTools: StoredSurveyTool[];
  selectedTool: ToolOption;
  selectedToolName: string;
  selectedUseCases: string[];
}) {
  return (
    <section className="relative flex min-h-[500px] min-w-0 flex-col gap-4 rounded-[2rem] border-2 border-dashed border-[#bfc7cf]/60 bg-white/55 p-5 shadow-[0_8px_40px_rgba(0,101,139,0.06)] backdrop-blur md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-extrabold text-[#00658b]">
            Jouw selectie
          </h3>
        </div>
        <span className="rounded-full bg-[#00658b] px-3 py-1 text-xs font-extrabold text-white">
          {pendingTools.length + savedTools.length} tools
        </span>
      </div>

      <article className="rounded-xl border-[1.5px] border-[#00658b] bg-white px-4 py-3 shadow-[0_4px_12px_rgba(0,101,139,0.04)]">
        <div className="flex items-start gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e0f2fe] text-sm font-black text-[#00658b]">
            {selectedToolName.slice(0, 1) || "?"}
          </span>
          <div className="min-w-0">
            <h4 className="break-words text-sm font-extrabold text-[#181c1e]">
              {selectedToolName || "Nog geen tool gekozen"}
            </h4>
            <p className="mt-0.5 text-xs font-semibold text-[#00658b]">
              {selectedUseCases.length} toepassing
              {selectedUseCases.length === 1 ? "" : "en"} ingesteld
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-3 rounded-2xl border border-[#bfc7cf]/45 bg-white/85 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-extrabold text-[#181c1e]">Toepassingen</h4>
            <p className="mt-1 text-sm leading-6 text-[#40484e]">Waarvoor gebruik je deze tool?</p>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#00658b] px-4 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#004c6a] disabled:opacity-60"
            disabled={isDisabled}
            onClick={onOpenModal}
            type="button"
          >
            Toepassingen kiezen
          </button>
        </div>

        {selectedUseCases.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedUseCases.map((code) => (
              <span
              className="rounded-full border border-[#00658b]/20 bg-[#f1f4f6] px-3 py-1.5 text-xs font-bold text-[#00658b]"
                key={code}
              >
                {getOptionLabel(useCaseOptions, code)}
              </span>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[#bfc7cf] bg-[#f7fafc] px-3 py-3 text-sm font-semibold text-[#40484e]/70">
            Nog geen toepassingen gekozen.
          </p>
        )}
      </div>

      {pendingTools.length === 0 && savedTools.length === 0 ? (
        <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-[#bfc7cf]/70 bg-white/40 px-4 py-10 text-center">
          <div>
            <p className="text-lg font-extrabold text-[#00658b]/45">
              Nog geen tools geselecteerd
            </p>
            <p className="mt-1 text-sm text-[#40484e]/50">
              Klik op een tool in de catalogus
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {pendingTools.map((tool, index) => (
            <article
              className="rounded-xl border-[1.5px] border-[#00658b] bg-white px-4 py-3 text-sm shadow-[0_4px_12px_rgba(0,101,139,0.04)]"
              key={tool.surveyToolId}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold text-[#181c1e]">
                  {index + 1}. {tool.toolName}
                </h4>
                <span className="rounded-full bg-[#f3fbff] px-2.5 py-1 text-[11px] font-bold text-[#00658b]">
                  Account volgt later
                </span>
              </div>
              <p className="mt-1 break-words text-xs text-[#40484e]">
                {getOptionLabels(useCaseOptions, tool.useCaseCodes ?? [])}
              </p>
            </article>
          ))}
          {savedTools.map((tool, index) => (
            <article
              className="rounded-xl border-[1.5px] border-[#00658b]/70 bg-white px-4 py-3 text-sm shadow-[0_4px_12px_rgba(0,101,139,0.04)]"
              key={tool.surveyToolId}
            >
              <h4 className="font-bold text-[#181c1e]">
                {pendingTools.length + index + 1}. {tool.toolName}
              </h4>
              <p className="mt-1 break-words text-xs text-[#40484e]">
                {getOptionLabels(useCaseOptions, tool.useCaseCodes)} -{" "}
                {getOptionLabel(accountTypeOptions, tool.accountTypeCode)}
              </p>
            </article>
          ))}
        </div>
      )}
      {isModalOpen ? (
        <UseCaseModal
          isSuggesting={isSuggesting}
          onClose={onCloseModal}
          onSave={onCloseModal}
          onSelectUseCases={onSelectUseCases}
          onSuggestUseCases={onSuggestUseCases}
          selectedTool={selectedTool}
          selectedToolName={selectedToolName}
          selectedUseCases={selectedUseCases}
        />
      ) : null}
    </section>
  );
}

function UseCaseModal({
  isSuggesting,
  onClose,
  onSave,
  onSelectUseCases,
  onSuggestUseCases,
  selectedTool,
  selectedToolName,
  selectedUseCases,
}: {
  isSuggesting: boolean;
  onClose: () => void;
  onSave: () => void;
  onSelectUseCases: (codes: string[]) => void;
  onSuggestUseCases: () => void;
  selectedTool: ToolOption;
  selectedToolName: string;
  selectedUseCases: string[];
}) {
  function toggleUseCase(code: string) {
    onSelectUseCases(
      selectedUseCases.includes(code)
        ? selectedUseCases.filter((selectedCode) => selectedCode !== code)
        : [...selectedUseCases, code],
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#181c1e]/40 p-4 backdrop-blur-sm">
      <section className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#ebeef0] px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1f4f6] text-base font-black text-[#00658b]">
              {selectedToolName.slice(0, 1) || "?"}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-extrabold text-[#181c1e]">
                {selectedToolName}
              </h3>
              <p className="text-xs font-semibold text-[#6993aa]">
                {selectedTool.category}
              </p>
            </div>
          </div>
          <button
            className="grid h-8 w-8 place-items-center rounded-full text-xl font-bold text-[#40484e] transition hover:bg-[#f1f4f6]"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </header>

        <div className="grid gap-4 overflow-y-auto px-6 py-5">
          <div>
            <h4 className="text-sm font-extrabold text-[#00658b]">
              Waar gebruik je deze tool voor?
            </h4>
            <p className="mt-1 text-sm leading-6 text-[#40484e]">
              Meerdere antwoorden mogelijk.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {useCaseOptions.map((option) => (
              <button
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selectedUseCases.includes(option.code)
                    ? "border-[#00658b] bg-[#00658b] text-white"
                    : "border-[#bfc7cf] bg-[#f1f4f6] text-[#181c1e] hover:border-[#00658b]"
                }`}
                key={option.code}
                onClick={() => toggleUseCase(option.code)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            className="inline-flex h-11 w-max items-center justify-center rounded-full border border-[#00658b] bg-[#f3fbff] px-4 text-xs font-extrabold text-[#00658b] transition hover:bg-[#c4e7ff]/40 disabled:opacity-60"
            disabled={isSuggesting}
            onClick={onSuggestUseCases}
            type="button"
          >
            {isSuggesting ? "Analyseren..." : "Laat AI toepassingen voorstellen"}
          </button>

          {selectedUseCases.length > 0 ? (
            <p className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-xs font-bold text-[#15803d]">
              {selectedUseCases.length} toepassingen geselecteerd.
            </p>
          ) : null}
        </div>

        <footer className="flex justify-end gap-3 border-t border-[#ebeef0] bg-[#f7fafc] px-6 py-5">
          <button
            className="h-10 rounded-full px-5 text-sm font-bold text-[#40484e] transition hover:bg-[#ebeef0]"
            onClick={onClose}
            type="button"
          >
            Annuleren
          </button>
          <button
            className="h-10 rounded-full bg-[#00658b] px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#004c6a]"
            onClick={onSave}
            type="button"
          >
            Opslaan
          </button>
        </footer>
      </section>
    </div>
  );
}

function getSelectedToolName(tool: ToolOption, customToolName: string) {
  return tool.id === "custom" ? customToolName.trim() : tool.name;
}

function getSuggestedUseCases(toolId: string) {
  return DEFAULT_USE_CASES_BY_TOOL[toolId] ?? ["teksten_schrijven"];
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
