"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlignLeft,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  CircleHelp,
  Clapperboard,
  Code2,
  Headphones,
  ImageIcon,
  Info,
  Languages,
  Lightbulb,
  Mic2,
  Network,
  PenLine,
  Plus,
  PlusCircle,
  Presentation,
  Route,
  Scale,
  Search,
  Sparkles,
  Store,
  Trash2,
  TriangleAlert,
  Volume2,
  Users,
  X,
} from "lucide-react";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  SurveyStepLayout,
  ValidationMessage,
} from "@/components/survey-ui";
import { ToolLogo } from "@/components/tool-logo";
import {
  registerToolDiscovery,
  saveTool,
  saveToolUseCase,
  saveToolUseCases,
  saveToolUseCaseContext,
} from "@/lib/sai-rpc/client";
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
  contextOptions,
  toolOptions,
  type SurveyOption,
  type ToolOption,
  useCaseOptions,
} from "@/lib/sai-survey/options";

const TOOL_CATEGORIES = Array.from(
  new Set(
    toolOptions
      .filter((tool) => tool.id !== "custom")
      .map((tool) => tool.category),
  ),
);
const DEFAULT_TOOL_CATEGORY = TOOL_CATEGORIES[0] ?? "Algemene AI";
const CODE_TOOL_CATEGORY = "Code";
const CODE_TOOL_USE_CASE = "code_schrijven";

const CODE_CONTEXT_CODES = [
  "intern_gebruik",
  "klantgerichte_toepassing",
  "beslisondersteuning",
  "besluiten_over_personen",
  "financieel_juridisch",
  "kritieke_systemen",
  "nog_niet_duidelijk",
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

const TOOL_USE_CASE_OPTIONS: Record<string, string[]> = {
  ...DEFAULT_USE_CASES_BY_TOOL,
  deepseek: [
    "teksten_schrijven",
    "samenvatten_redigeren",
    "brainstormen",
    "informatie_opzoeken",
    "vertalen",
    "data_analyseren",
    "code_schrijven",
  ],
  mistral_le_chat: [
    "teksten_schrijven",
    "samenvatten_redigeren",
    "brainstormen",
    "informatie_opzoeken",
    "vertalen",
    "data_analyseren",
    "code_schrijven",
  ],
  perplexity_computer: [
    "informatie_opzoeken",
    "data_analyseren",
    "automatisering",
    "workflow_uitvoeren",
    "systemen_aansturen",
    "taken_automatisch_afhandelen",
  ],
  claude_cowork: [
    "teksten_schrijven",
    "samenvatten_redigeren",
    "informatie_opzoeken",
    "data_analyseren",
    "code_schrijven",
    "automatisering",
    "workflow_uitvoeren",
    "systemen_aansturen",
    "taken_automatisch_afhandelen",
  ],
  grammarly: ["brainstormen", "klantenservice", "informatie_opzoeken", "samenvatten_redigeren", "teksten_schrijven", "vertalen"],
  jasper: ["automatisering", "brainstormen", "klantenservice", "informatie_opzoeken", "samenvatten_redigeren", "teksten_schrijven", "vertalen"],
  copy_ai: ["automatisering", "brainstormen", "klantenservice", "informatie_opzoeken", "samenvatten_redigeren", "teksten_schrijven", "vertalen"],
  notion_ai: ["automatisering", "brainstormen", "vergaderingen_notuleren", "informatie_opzoeken", "samenvatten_redigeren", "teksten_schrijven"],
  midjourney: ["brainstormen", "afbeeldingen_genereren", "presentaties_design"],
  dall_e: ["brainstormen", "afbeeldingen_genereren", "presentaties_design"],
  runway: ["afbeeldingen_genereren", "presentaties_design", "video_genereren"],
  synthesia: [
    "klantenservice",
    "afbeeldingen_genereren",
    "presentaties_design",
    "video_genereren",
  ],
  canva_ai: ["afbeeldingen_genereren", "brainstormen", "presentaties_design"],
  google_stitch: ["afbeeldingen_genereren", "brainstormen", "presentaties_design"],
  adobe_firefly: [
    "audio_genereren",
    "afbeeldingen_genereren",
    "brainstormen",
    "presentaties_design",
    "samenvatten_redigeren",
    "video_genereren",
  ],
  elevenlabs: ["klantenservice", "presentaties_design", "audio_genereren"],
  murf_ai: ["klantenservice", "presentaties_design", "audio_genereren", "video_genereren"],
  otter_ai: [
    "samenvatten_redigeren",
    "brainstormen",
    "informatie_opzoeken",
    "klantenservice",
    "data_analyseren",
    "vergaderingen_notuleren",
  ],
  fireflies_ai: [
    "samenvatten_redigeren",
    "brainstormen",
    "informatie_opzoeken",
    "klantenservice",
    "data_analyseren",
    "vergaderingen_notuleren",
  ],
  tl_dv: [
    "samenvatten_redigeren",
    "brainstormen",
    "informatie_opzoeken",
    "vertalen",
    "klantenservice",
    "data_analyseren",
    "presentaties_design",
    "automatisering",
    "video_genereren",
    "vergaderingen_notuleren",
  ],
  fathom: [
    "samenvatten_redigeren",
    "brainstormen",
    "informatie_opzoeken",
    "klantenservice",
    "data_analyseren",
    "vergaderingen_notuleren",
  ],
  tactiq: [
    "samenvatten_redigeren",
    "brainstormen",
    "informatie_opzoeken",
    "klantenservice",
    "data_analyseren",
    "vergaderingen_notuleren",
  ],
  julius_ai: [
    "data_analyseren",
    "automatisering",
    "code_schrijven",
    "informatie_opzoeken",
    "samenvatten_redigeren",
  ],
  akkio: ["data_analyseren", "automatisering", "informatie_opzoeken"],
  n8n: [
    "data_analyseren",
    "automatisering",
    "code_schrijven",
    "klantenservice",
    "informatie_opzoeken",
    "samenvatten_redigeren",
    "workflow_uitvoeren",
    "systemen_aansturen",
  ],
  make: [
    "data_analyseren",
    "automatisering",
    "code_schrijven",
    "klantenservice",
    "informatie_opzoeken",
    "samenvatten_redigeren",
    "workflow_uitvoeren",
    "systemen_aansturen",
  ],
  zapier_ai: [
    "data_analyseren",
    "automatisering",
    "code_schrijven",
    "klantenservice",
    "informatie_opzoeken",
    "samenvatten_redigeren",
    "workflow_uitvoeren",
    "systemen_aansturen",
  ],
  m365_copilot: [
    "data_analyseren",
    "audio_genereren",
    "automatisering",
    "afbeeldingen_genereren",
    "brainstormen",
    "code_schrijven",
    "vergaderingen_notuleren",
    "presentaties_design",
    "informatie_opzoeken",
    "samenvatten_redigeren",
    "teksten_schrijven",
    "vertalen",
    "video_genereren",
  ],
  google_workspace_ai: [
    "data_analyseren",
    "audio_genereren",
    "automatisering",
    "afbeeldingen_genereren",
    "brainstormen",
    "klantenservice",
    "vergaderingen_notuleren",
    "presentaties_design",
    "informatie_opzoeken",
    "samenvatten_redigeren",
    "teksten_schrijven",
    "vertalen",
    "video_genereren",
  ],
  salesforce_einstein: [
    "data_analyseren",
    "audio_genereren",
    "automatisering",
    "brainstormen",
    "code_schrijven",
    "klantenservice",
    "vergaderingen_notuleren",
    "informatie_opzoeken",
    "samenvatten_redigeren",
    "teksten_schrijven",
  ],
  hubspot_ai: ["data_analyseren", "automatisering", "klantenservice"],
  pipedrive_ai: ["data_analyseren", "automatisering"],
  monday_ai: [
    "data_analyseren",
    "automatisering",
    "brainstormen",
    "vergaderingen_notuleren",
    "samenvatten_redigeren",
    "teksten_schrijven",
  ],
};

export default function SurveyToolsPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [selectedToolId, setSelectedToolId] = useState("chatgpt");
  const [selectedToolCategory, setSelectedToolCategory] =
    useState(DEFAULT_TOOL_CATEGORY);
  const [toolSearchQuery, setToolSearchQuery] = useState("");
  const [customToolName, setCustomToolName] = useState("");
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([
    "teksten_schrijven",
    "brainstormen",
  ]);
  const [configuringToolId, setConfiguringToolId] = useState<string | null>(null);
  const [editingPendingToolId, setEditingPendingToolId] = useState<string | null>(
    null,
  );
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
        if (tool.id === "custom") {
          return false;
        }

        const normalizedQuery = toolSearchQuery.trim().toLowerCase();
        const matchesCategory = normalizedQuery
          ? true
          : tool.category === selectedToolCategory;
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
    setError(null);
    const tool = toolOptions.find((option) => option.id === toolId);

    if (!tool) {
      return;
    }

    if (isToolAlreadySelected(tool.name, pendingTools, savedTools)) {
      setError(`${tool.name} staat al in je selectie.`);
      return;
    }

    setSelectedToolId(toolId);
    setCustomToolName("");
    setSelectedUseCases([]);
    setEditingPendingToolId(null);
    setConfiguringToolId(toolId);
  }

  function handleAddCustomTool() {
    const customName = customToolName.trim();

    if (!customName) {
      setError("Vul eerst de naam van je eigen tool in.");
      return;
    }

    if (isToolAlreadySelected(customName, pendingTools, savedTools)) {
      setError(`${customName} staat al in je selectie.`);
      return;
    }

    setError(null);
    setSelectedToolId("custom");
    setSelectedUseCases([]);
    setEditingPendingToolId(null);
    setConfiguringToolId("custom");
  }

  function handleEditPendingTool(tool: PendingSurveyTool) {
    if (isSaving) {
      return;
    }

    const catalogTool =
      toolOptions.find((option) => option.name === tool.toolName) ??
      toolOptions.find((option) => option.id === "custom") ??
      toolOptions[0];

    setError(null);
    setSelectedToolId(catalogTool.id);
    setCustomToolName(catalogTool.id === "custom" ? tool.toolName : "");
    setSelectedUseCases(
      tool.contextCodes?.length ? tool.contextCodes : (tool.useCaseCodes ?? []),
    );
    setEditingPendingToolId(tool.surveyToolId);
    setConfiguringToolId(catalogTool.id);
  }

  function handleRemovePendingTool(toolId: string) {
    const nextPendingTools = pendingTools.filter(
      (tool) => tool.surveyToolId !== toolId,
    );

    setPendingTools(nextPendingTools);
    updateSurveySession({
      pendingTool: nextPendingTools.at(-1),
      pendingTools: nextPendingTools,
      surveyToolId: nextPendingTools.at(-1)?.surveyToolId,
      surveyToolUseCaseId: nextPendingTools.at(-1)?.surveyToolUseCaseIds?.[0],
    });
  }

  async function handleSuggestUseCases() {
    setIsSuggesting(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    setSelectedUseCases(getSuggestedSelections(selectedTool));
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

    try {
      const isCodeTool = isCodeCategory(selectedTool);
      const useCaseCodesToSave = isCodeTool ? [CODE_TOOL_USE_CASE] : selectedUseCases;

      if (editingPendingToolId) {
        const useCaseResult = await saveToolUseCases(
          surveySession,
          editingPendingToolId,
          useCaseCodesToSave,
        );

        if (!useCaseResult.ok) {
          finishWithError(useCaseResult.error);
          return;
        }

        if (isCodeTool && useCaseResult.data[0]) {
          const contextResult = await saveToolUseCaseContext(
            surveySession,
            useCaseResult.data[0],
            selectedUseCases,
          );

          if (!contextResult.ok) {
            finishWithError(contextResult.error);
            return;
          }
        }

        const nextPendingTools = pendingTools.map((tool) =>
          tool.surveyToolId === editingPendingToolId
            ? {
                ...tool,
                useCaseCodes: useCaseCodesToSave,
                contextCodes: isCodeTool ? selectedUseCases : [],
                surveyToolUseCaseIds: useCaseResult.data,
              }
            : tool,
        );

        updateSurveySession({
          pendingTool: nextPendingTools.at(-1),
          pendingTools: nextPendingTools,
        });
        setPendingTools(nextPendingTools);
        setEditingPendingToolId(null);
        setConfiguringToolId(null);
        setIsSaving(false);
        return;
      }

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

      if (!selectedTool.toolCode) {
        const discoveryResult = await registerToolDiscovery(
          surveySession,
          toolResult.data,
          selectedToolName,
        );

        if (!discoveryResult.ok) {
          finishWithError(discoveryResult.error);
          return;
        }
      }

      const surveyToolUseCaseIds: string[] = [];

      for (const useCaseCode of useCaseCodesToSave) {
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

      if (isCodeTool && surveyToolUseCaseIds[0]) {
        const contextResult = await saveToolUseCaseContext(
          surveySession,
          surveyToolUseCaseIds[0],
          selectedUseCases,
        );

        if (!contextResult.ok) {
          finishWithError(contextResult.error);
          return;
        }
      }

      const pendingTool = {
        surveyToolId: toolResult.data,
        toolName: selectedToolName,
        registeredAt: new Date().toISOString(),
        useCaseCodes: useCaseCodesToSave,
        contextCodes: isCodeTool ? selectedUseCases : [],
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
      setSelectedUseCases([]);
      setEditingPendingToolId(null);
      setConfiguringToolId(null);
      setCustomToolName("");
      setIsSaving(false);
    } catch (unknownError) {
      finishWithUnknownError(unknownError);
    }
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

  function finishWithUnknownError(unknownError: unknown) {
    const message =
      unknownError instanceof Error
        ? unknownError.message
        : "Opslaan is niet gelukt door een onbekende fout.";

    setError(message);
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
      maxWidthClassName="max-w-5xl"
      title="Welke AI-tools gebruik je wel eens in je dagelijkse werk?"
    >
      <div className="grid gap-6">
        <section className="grid min-w-0 gap-6 lg:grid-cols-[460px_minmax(0,1fr)] lg:items-start">
          <ToolCatalog
            customToolName={customToolName}
            filteredToolOptions={filteredToolOptions}
            isDisabled={isSaving}
            onCustomToolNameChange={setCustomToolName}
            onAddCustomTool={handleAddCustomTool}
            onSearchQueryChange={setToolSearchQuery}
            onSelect={handleSelectTool}
            onSelectCategory={setSelectedToolCategory}
            searchQuery={toolSearchQuery}
            selectedCategory={selectedToolCategory}
            selectedToolNames={[
              ...pendingTools.map((tool) => tool.toolName),
              ...savedTools.map((tool) => tool.toolName),
            ]}
          />

          <ToolWorkspace
            isDisabled={isSaving}
            onContinue={handleContinueToNextStep}
            onEditPendingTool={handleEditPendingTool}
            onRemovePendingTool={handleRemovePendingTool}
            pendingTools={pendingTools}
            savedTools={savedTools}
          />
        </section>

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}
      </div>

      {configuringToolId ? (
        <UseCaseModal
          error={error}
          isSaving={isSaving}
          isSuggesting={isSuggesting}
          onClose={() => {
            if (!isSaving) {
              setEditingPendingToolId(null);
              setConfiguringToolId(null);
            }
          }}
          onSave={() => void handleSaveToolWithUseCases()}
          onSelectUseCases={setSelectedUseCases}
          onSuggestUseCases={() => void handleSuggestUseCases()}
          selectedTool={selectedTool}
          selectedToolName={selectedToolName}
          selectedUseCases={selectedUseCases}
        />
      ) : null}
    </SurveyStepLayout>
  );
}

function ToolCatalog({
  customToolName,
  filteredToolOptions,
  isDisabled,
  onAddCustomTool,
  onCustomToolNameChange,
  onSearchQueryChange,
  onSelect,
  onSelectCategory,
  searchQuery,
  selectedCategory,
  selectedToolNames,
}: {
  customToolName: string;
  filteredToolOptions: ToolOption[];
  isDisabled: boolean;
  onAddCustomTool: () => void;
  onCustomToolNameChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onSelect: (toolId: string) => void;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  selectedCategory: string;
  selectedToolNames: string[];
}) {
  const selectedToolNameSet = new Set(
    selectedToolNames.map((name) => normalizeToolName(name)),
  );

  return (
    <fieldset className="grid min-w-0 gap-4 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_8px_40px_rgba(0,101,139,0.06)] backdrop-blur md:p-6">
      <legend className="sr-only">Toolcatalogus</legend>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold text-[#00658b]">Catalogus</h3>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TOOL_CATEGORIES.map((category) => (
          <button
            className={`inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
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
          </button>
        ))}
      </div>

      <div className="flex max-h-[350px] min-h-[250px] flex-col gap-3 overflow-y-auto pr-3 pt-1 [scrollbar-gutter:stable]">
        {filteredToolOptions.map((tool) => {
          const isSelected = selectedToolNameSet.has(normalizeToolName(tool.name));

          return (
          <button
            className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:shadow-[0_4px_12px_rgba(0,101,139,0.06)] ${
              isSelected
                ? "border-[#00658b] bg-[#f1f4f6]"
                : "border-[#bfc7cf] bg-white"
            }`}
            disabled={isDisabled || isSelected}
            key={tool.id}
            onClick={() => onSelect(tool.id)}
            type="button"
          >
              <span className="flex min-w-0 items-center gap-3">
              <ToolLogo tool={tool} />
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold text-[#181c1e]">
                  {tool.name}
                </span>
              </span>
            </span>
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-black leading-none ${
                isSelected ? "text-[#00658b]" : "text-[#bfc7cf]"
              }`}
            >
              {isSelected ? (
                <CheckCircle2 aria-hidden="true" className="h-5 w-5" strokeWidth={2.2} />
              ) : (
                <PlusCircle aria-hidden="true" className="h-5 w-5" strokeWidth={2.2} />
              )}
            </span>
          </button>
        );
        })}
      </div>

      <div className="mt-1 border-t border-[#bfc7cf]/30 pt-5">
        <label className="mb-4 grid gap-2 text-sm font-semibold text-[#181c1e]">
          Zoek tool
          <input
            className="h-11 rounded-xl border border-[#bfc7cf]/60 bg-white px-3 text-sm font-normal outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
            disabled={isDisabled}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Zoek bijvoorbeeld Claude, Copilot of n8n"
            type="search"
            value={searchQuery}
          />
        </label>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#40484e]">
          Ontbreekt er een?
        </p>
        <label className="flex gap-2">
          <span className="sr-only">Naam van eigen tool</span>
          <input
            className="h-11 min-w-0 flex-1 rounded-xl border border-[#bfc7cf]/60 bg-white px-3 text-sm font-normal outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
            disabled={isDisabled}
            onChange={(event) => onCustomToolNameChange(event.target.value)}
            placeholder="Naam van eigen tool"
            type="text"
            value={customToolName}
          />
          <button
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ebeef0] text-xl font-black text-[#00658b] transition hover:bg-[#e5e9eb]"
            disabled={isDisabled}
            onClick={onAddCustomTool}
            type="button"
          >
            <Plus aria-hidden="true" className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </label>
      </div>
    </fieldset>
  );
}

function ToolWorkspace({
  isDisabled,
  onContinue,
  onEditPendingTool,
  onRemovePendingTool,
  pendingTools,
  savedTools,
}: {
  isDisabled: boolean;
  onContinue: () => void;
  onEditPendingTool: (tool: PendingSurveyTool) => void;
  onRemovePendingTool: (toolId: string) => void;
  pendingTools: PendingSurveyTool[];
  savedTools: StoredSurveyTool[];
}) {
  const toolCount = pendingTools.length + savedTools.length;

  return (
    <section className="relative flex min-h-[500px] min-w-0 flex-col gap-4 rounded-[2rem] border-2 border-dashed border-[#bfc7cf]/60 bg-white/40 p-5 shadow-[0_8px_40px_rgba(0,101,139,0.06)] backdrop-blur md:p-6">
      <div className="z-10 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-extrabold text-[#00658b]">
            Jouw selectie
          </h3>
        </div>
        <span className="rounded-full bg-[#00658b] px-3 py-1 text-xs font-extrabold text-white">
          {toolCount} tool{toolCount === 1 ? "" : "s"}
        </span>
      </div>

      {toolCount === 0 ? (
        <div className="absolute inset-0 grid place-items-center px-4 text-center">
          <div>
            <Sparkles
              aria-hidden="true"
              className="mx-auto h-12 w-12 text-[#00658b]/20"
              strokeWidth={1.8}
            />
            <p className="mt-2 text-lg font-extrabold text-[#00658b]/45">
              Nog geen tools geselecteerd
            </p>
            <p className="mt-1 text-sm text-[#40484e]/50">
              Klik op een tool in de catalogus
            </p>
          </div>
        </div>
      ) : (
        <div className="z-10 grid gap-3 md:grid-cols-2">
          {pendingTools.map((tool, index) => (
            <article
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border-[1.5px] border-[#00658b] bg-white px-4 py-3 text-sm shadow-[0_4px_12px_rgba(0,101,139,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,101,139,0.08)]"
              key={tool.surveyToolId}
              onClick={() => onEditPendingTool(tool)}
            >
              <div className="flex min-w-0 items-center gap-3">
                <ToolLogo tool={getCatalogTool(tool.toolName)} />
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-bold text-[#181c1e]">
                    {index + 1}. {tool.toolName}
                  </h4>
                  <p className="mt-0.5 text-xs font-semibold text-[#00658b]">
                    {getSelectionCountLabel(tool)}
                  </p>
                </div>
              </div>
              <button
                aria-label={`${tool.toolName} verwijderen`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f1f4f6] text-sm font-black text-[#40484e] transition hover:bg-[#ffe4e6] hover:text-[#e11d48]"
                disabled={isDisabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemovePendingTool(tool.surveyToolId);
                }}
                type="button"
              >
                <Trash2 aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </button>
            </article>
          ))}
          {savedTools.map((tool, index) => (
            <article
              className="flex items-center justify-between gap-3 rounded-xl border-[1.5px] border-[#00658b]/70 bg-white px-4 py-3 text-sm shadow-[0_4px_12px_rgba(0,101,139,0.04)]"
              key={tool.surveyToolId}
            >
              <div className="flex min-w-0 items-center gap-3">
                <ToolLogo tool={getCatalogTool(tool.toolName)} />
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-bold text-[#181c1e]">
                    {pendingTools.length + index + 1}. {tool.toolName}
                  </h4>
                  <p className="mt-0.5 text-xs font-semibold text-[#00658b]">
                    {getSelectionCountLabel(tool)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="z-10 mt-auto flex items-center justify-between border-t border-transparent pt-8">
        <a
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#40484e] transition hover:text-[#00658b]"
          href="/survey/motivations"
        >
          <span className="text-lg leading-none">‹</span>
          Vorige
        </a>
        <PrimarySurveyButton
          disabled={isDisabled || toolCount === 0}
          onClick={onContinue}
        >
          Volgende
        </PrimarySurveyButton>
      </div>
    </section>
  );
}

function UseCaseModal({
  error,
  isSaving,
  isSuggesting,
  onClose,
  onSave,
  onSelectUseCases,
  onSuggestUseCases,
  selectedTool,
  selectedToolName,
  selectedUseCases,
}: {
  error: string | null;
  isSaving: boolean;
  isSuggesting: boolean;
  onClose: () => void;
  onSave: () => void;
  onSelectUseCases: (codes: string[]) => void;
  onSuggestUseCases: () => void;
  selectedTool: ToolOption;
  selectedToolName: string;
  selectedUseCases: string[];
}) {
  const isCodeTool = isCodeCategory(selectedTool);
  const editorOptions = getEditorOptions(selectedTool);
  const [activeTooltip, setActiveTooltip] = useState<{
    code: string;
    left: number;
    text: string;
    top: number;
    width: number;
  } | null>(null);

  function showTooltip(option: SurveyOption, target: HTMLElement) {
    if (!option.description) {
      return;
    }

    const tooltipWidth = Math.min(280, window.innerWidth - 32);
    const estimatedHeight = 92;
    const targetRect = target.getBoundingClientRect();
    const left = clampNumber(
      targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
      16,
      window.innerWidth - tooltipWidth - 16,
    );
    const preferredTop = targetRect.bottom + 10;
    const top =
      preferredTop + estimatedHeight > window.innerHeight - 16
        ? Math.max(16, targetRect.top - estimatedHeight - 10)
        : preferredTop;

    setActiveTooltip({
      code: option.code,
      left,
      text: option.description,
      top,
      width: tooltipWidth,
    });
  }

  function toggleUseCase(code: string) {
    setActiveTooltip(null);
    onSelectUseCases(
      selectedUseCases.includes(code)
        ? selectedUseCases.filter((selectedCode) => selectedCode !== code)
        : [...selectedUseCases, code],
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#181c1e]/40 p-4 backdrop-blur-sm">
      <section
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-[#ebeef0] px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <ToolLogo sizeClassName="h-10 w-10" tool={selectedTool} />
            <div className="min-w-0">
              <h3 className="truncate text-lg font-extrabold text-[#181c1e]">
                {selectedToolName}
              </h3>
              <p className="text-sm font-semibold text-[#40484e]">
                Configureer toepassingen
              </p>
            </div>
          </div>
          <button
            className="grid h-8 w-8 place-items-center rounded-full text-xl font-bold text-[#40484e] transition hover:bg-[#f1f4f6]"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-6 w-6" strokeWidth={2.1} />
          </button>
        </header>

        <div
          className="grid gap-4 overflow-y-auto py-5 pl-6 pr-8 [scrollbar-gutter:stable]"
          onScroll={() => setActiveTooltip(null)}
        >
          <div>
            <h4 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#40484e]">
              Waarvoor gebruik je deze tool?
            </h4>
          </div>

          {error ? (
            <p
              aria-live="polite"
              className="rounded-xl border border-[#f0d38a] bg-[#fff8df] px-3 py-2 text-xs font-bold leading-5 text-[#6f5600]"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {editorOptions.map((option) => (
              <button
                className={`group relative inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                  selectedUseCases.includes(option.code)
                    ? "border-[#00658b] bg-[#00658b] text-white"
                    : "border-[#bfc7cf] bg-[#f1f4f6] text-[#181c1e] hover:border-[#00658b]"
                }`}
                key={option.code}
                onClick={() => toggleUseCase(option.code)}
                type="button"
              >
                {isCodeTool ? (
                  <ContextIcon
                    className={`h-4 w-4 shrink-0 ${
                      selectedUseCases.includes(option.code)
                        ? "text-white"
                        : "text-[#40484e]"
                    }`}
                    code={option.code}
                  />
                ) : (
                  <UseCaseIcon
                    className={`h-4 w-4 shrink-0 ${
                      selectedUseCases.includes(option.code)
                        ? "text-white"
                        : "text-[#40484e]"
                    }`}
                    code={option.code}
                  />
                )}
                {option.label}
                {option.description ? (
                  <span
                    aria-label={`Toelichting bij ${option.label}`}
                    aria-describedby={
                      activeTooltip?.code === option.code
                        ? "tool-context-tooltip"
                        : undefined
                    }
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] font-black ${
                      selectedUseCases.includes(option.code)
                        ? "border-white/60 text-white"
                        : "border-[#bfc7cf] text-[#00658b]"
                    }`}
                    onBlur={() => setActiveTooltip(null)}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveTooltip(null);
                    }}
                    onFocus={(event) => showTooltip(option, event.currentTarget)}
                    onMouseEnter={(event) =>
                      showTooltip(option, event.currentTarget)
                    }
                    onMouseLeave={() => setActiveTooltip(null)}
                    role="button"
                    tabIndex={0}
                  >
                    <Info aria-hidden="true" className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {activeTooltip ? (
            <div
              className="pointer-events-none fixed z-[70] rounded-[14px] bg-[#2f363b] px-3 py-2 text-left text-xs font-medium leading-[1.45] text-white shadow-[0_12px_26px_rgba(24,28,30,0.18)]"
              id="tool-context-tooltip"
              role="tooltip"
              style={{
                left: activeTooltip.left,
                top: activeTooltip.top,
                width: activeTooltip.width,
              }}
            >
              {activeTooltip.text}
            </div>
          ) : null}

          {isCodeTool ? (
            <div className="mt-3 flex gap-4 rounded-[1.5rem] border border-[#c4e7ff] bg-[#f1f4f6] p-5 shadow-[0_8px_24px_rgba(0,101,139,0.06)]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#00658b] shadow-sm">
                <Info aria-hidden="true" className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h4 className="text-lg font-extrabold leading-6 text-[#00658b]">
                  Waar wordt de software voor gebruikt?
                </h4>
                <p className="mt-2 text-sm leading-6 text-[#40484e]">
                  Deze tools helpen bij het schrijven van code. Het risico zit
                  niet in de tool zelf, maar in wat je ermee bouwt. Kies de
                  categorie die het beste past bij de uiteindelijke toepassing.
                </p>
              </div>
            </div>
          ) : null}

          <button
            className="inline-flex h-16 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#bfc7cf] bg-[#f7fafc] px-4 text-sm font-extrabold text-[#40484e] transition hover:border-[#00658b] hover:text-[#00658b] disabled:opacity-60"
            disabled={isSaving || isSuggesting}
            onClick={onSuggestUseCases}
            type="button"
          >
            <Sparkles aria-hidden="true" className="h-5 w-5" strokeWidth={2.2} />
            {isSuggesting ? "Analyseren..." : "Laat AI toepassingen voorstellen"}
          </button>

        </div>

        <footer className="flex justify-end gap-3 border-t border-[#ebeef0] bg-[#f7fafc] px-6 py-5">
          <button
            className="h-10 rounded-full px-5 text-sm font-bold text-[#40484e] transition hover:bg-[#ebeef0]"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Annuleren
          </button>
          <button
            className="h-10 rounded-full bg-[#00658b] px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#004c6a] disabled:opacity-60"
            disabled={isSaving}
            onClick={onSave}
            type="button"
          >
            {isSaving ? "Opslaan..." : "Opslaan"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function getSelectedToolName(tool: ToolOption, customToolName: string) {
  return tool.id === "custom" ? customToolName.trim() : tool.name;
}

function UseCaseIcon({
  className,
  code,
}: {
  className?: string;
  code: string;
}) {
  const iconProps = {
    "aria-hidden": true,
    className,
    strokeWidth: 2.1,
  };

  switch (code) {
    case "data_analyseren":
      return <BarChart3 {...iconProps} />;
    case "audio_genereren":
      return <Volume2 {...iconProps} />;
    case "automatisering":
      return <Bot {...iconProps} />;
    case "afbeeldingen_genereren":
      return <ImageIcon {...iconProps} />;
    case "brainstormen":
      return <Lightbulb {...iconProps} />;
    case "code_schrijven":
      return <Code2 {...iconProps} />;
    case "klantenservice":
      return <Headphones {...iconProps} />;
    case "informatie_opzoeken":
      return <Search {...iconProps} />;
    case "samenvatten_redigeren":
      return <AlignLeft {...iconProps} />;
    case "drafting":
    case "teksten_schrijven":
      return <PenLine {...iconProps} />;
    case "vertalen":
      return <Languages {...iconProps} />;
    case "video_genereren":
      return <Clapperboard {...iconProps} />;
    case "presentaties_design":
      return <Presentation {...iconProps} />;
    case "vergaderingen_notuleren":
      return <Mic2 {...iconProps} />;
    case "workflow_uitvoeren":
      return <Route {...iconProps} />;
    case "systemen_aansturen":
      return <Network {...iconProps} />;
    case "taken_automatisch_afhandelen":
      return <CheckCircle2 {...iconProps} />;
    default:
      return <CircleHelp {...iconProps} />;
  }
}

function ContextIcon({
  className,
  code,
}: {
  className?: string;
  code: string;
}) {
  const iconProps = {
    "aria-hidden": true,
    className,
    strokeWidth: 2.1,
  };

  switch (code) {
    case "internal_work":
    case "intern_gebruik":
      return <BriefcaseBusiness {...iconProps} />;
    case "klantgerichte_toepassing":
      return <Store {...iconProps} />;
    case "beslisondersteuning":
      return <CheckCircle2 {...iconProps} />;
    case "besluiten_over_personen":
    case "personenbesluit":
    case "hr_evaluatie":
      return <Users {...iconProps} />;
    case "financieel_juridisch":
      return <Scale {...iconProps} />;
    case "kritieke_systemen":
      return <TriangleAlert {...iconProps} />;
    case "onbekend":
    case "nog_niet_duidelijk":
    default:
      return <CircleHelp {...iconProps} />;
  }
}

function getCatalogTool(toolName: string) {
  return (
    toolOptions.find((tool) => tool.name === toolName) ?? {
      id: "custom",
      name: toolName,
      category: "Zelf invullen",
    }
  );
}

function getSuggestedSelections(tool: ToolOption) {
  if (isCodeCategory(tool)) {
    return ["intern_gebruik", "klantgerichte_toepassing"];
  }

  return TOOL_USE_CASE_OPTIONS[tool.id] ?? ["teksten_schrijven"];
}

function getEditorOptions(tool: ToolOption): SurveyOption[] {
  if (isCodeCategory(tool)) {
    return CODE_CONTEXT_CODES.map((code) =>
      contextOptions.find((option) => option.code === code),
    ).filter((option): option is SurveyOption => Boolean(option));
  }

  if (tool.id === "custom") {
    return useCaseOptions;
  }

  const optionCodes = TOOL_USE_CASE_OPTIONS[tool.id] ?? [];

  if (optionCodes.length === 0) {
    return useCaseOptions;
  }

  return optionCodes
    .map((code) => useCaseOptions.find((option) => option.code === code))
    .filter((option): option is SurveyOption => Boolean(option));
}

function isCodeCategory(tool: ToolOption) {
  return tool.category === CODE_TOOL_CATEGORY;
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}

function getSelectionCodes(tool: PendingSurveyTool | StoredSurveyTool) {
  return tool.contextCodes?.length ? tool.contextCodes : (tool.useCaseCodes ?? []);
}

function getSelectionCountLabel(tool: PendingSurveyTool | StoredSurveyTool) {
  const count = getSelectionCodes(tool).length;
  const noun = tool.contextCodes?.length ? "context" : "toepassing";

  return `${count} ${noun}${count === 1 ? "" : noun === "context" ? "en" : "en"}`;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeToolName(name: string) {
  return name.trim().toLowerCase();
}

function isToolAlreadySelected(
  toolName: string,
  pendingTools: PendingSurveyTool[],
  savedTools: StoredSurveyTool[],
) {
  const normalizedToolName = normalizeToolName(toolName);

  return [...pendingTools, ...savedTools].some(
    (tool) => normalizeToolName(tool.toolName) === normalizedToolName,
  );
}
