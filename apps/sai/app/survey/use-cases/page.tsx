"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SurveyCheckboxGroup } from "@/components/survey-choice-groups";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  RpcStepRow,
  RunIdCard,
  SurveyFooterActions,
  SurveyStepLayout,
  SurveySummaryGrid,
  SurveySummaryItem,
  TechnicalStatus,
  ValidationMessage,
} from "@/components/survey-ui";
import { saveToolUseCase, saveToolUseCaseContext } from "@/lib/sai-rpc/client";
import {
  markSurveyStepCompleted,
  readSurveySession,
  updateSurveyCurrentStep,
  updateSurveySession,
  type PendingSurveyTool,
} from "@/lib/sai-rpc/session";
import type { RpcError, RpcResult, SurveySession } from "@/lib/sai-rpc/types";
import {
  canAccessSurveyStep,
  getResumeStep,
  type SurveyStepId,
} from "@/lib/sai-survey/flow";
import { contextOptions, useCaseOptions } from "@/lib/sai-survey/options";

type StepKey = "useCase" | "context";

type StepState = {
  status: "idle" | "running" | "ok" | "error";
  message: string;
};

type StepStates = Record<StepKey, StepState>;

const INITIAL_STEPS: StepStates = {
  useCase: { status: "idle", message: "Wacht op toepassing" },
  context: { status: "idle", message: "Alleen nodig bij code-toepassing" },
};

const DEFAULT_USE_CASES = ["drafting", "data_analyseren"];
const DEFAULT_CONTEXTS = ["internal_work"];
const CODE_USE_CASE_CODES = new Set(["code_schrijven"]);

export default function SurveyUseCasesPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(
    null,
  );
  const [pendingTool, setPendingTool] = useState<PendingSurveyTool | null>(
    null,
  );
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [selectedUseCases, setSelectedUseCases] =
    useState<string[]>(DEFAULT_USE_CASES);
  const [selectedContexts, setSelectedContexts] =
    useState<string[]>(DEFAULT_CONTEXTS);
  const [steps, setSteps] = useState<StepStates>(INITIAL_STEPS);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsContext = useMemo(
    () => selectedUseCases.some((code) => CODE_USE_CASE_CODES.has(code)),
    [selectedUseCases],
  );

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      if (!canAccessSurveyStep(storedSession, "useCases")) {
        router.replace(getResumeStep(storedSession).href);
        return;
      }

      if (!storedSession.pendingTool) {
        router.replace("/survey/tools");
        return;
      }

      updateSurveyCurrentStep("useCases");
      setSurveySession({
        runId: storedSession.runId,
        submissionToken: storedSession.submissionToken,
      });
      setPendingTool(storedSession.pendingTool);
      setRunId(storedSession.runId);
      setCompletedSteps(storedSession.completedSteps ?? []);
      setSelectedUseCases(
        storedSession.pendingTool.useCaseCodes?.length
          ? storedSession.pendingTool.useCaseCodes
          : DEFAULT_USE_CASES,
      );
      setSelectedContexts(
        storedSession.pendingTool.contextCodes?.length
          ? storedSession.pendingTool.contextCodes
          : DEFAULT_CONTEXTS,
      );
    });
  }, [router]);

  async function handleSaveUseCases() {
    if (!surveySession || !pendingTool) {
      setError("Geen actieve toolregistratie gevonden. Kies eerst een tool.");
      return;
    }

    setError(null);

    if (selectedUseCases.length === 0) {
      setError("Kies minimaal een toepassing.");
      return;
    }

    if (needsContext && selectedContexts.length === 0) {
      setError("Kies minimaal een context voor code-toepassingen.");
      return;
    }

    setIsSaving(true);
    setSteps(INITIAL_STEPS);

    const useCaseIds: string[] = [];

    for (const useCaseCode of selectedUseCases) {
      const useCaseResult = await runStep(
        "useCase",
        () =>
          saveToolUseCase(
            surveySession,
            pendingTool.surveyToolId,
            useCaseCode,
          ),
        `Toepassingen opgeslagen (${useCaseIds.length + 1}/${selectedUseCases.length})`,
      );

      if (!useCaseResult.ok) {
        return finishWithError(useCaseResult.error);
      }

      useCaseIds.push(useCaseResult.data);
    }

    const contextCodes = needsContext ? selectedContexts : [];

    if (needsContext) {
      for (const useCaseId of useCaseIds) {
        const contextResult = await runStep(
          "context",
          () =>
            saveToolUseCaseContext(surveySession, useCaseId, selectedContexts),
          `Context opgeslagen (${selectedContexts.length})`,
        );

        if (!contextResult.ok) {
          return finishWithError(contextResult.error);
        }
      }
    } else {
      setStep("context", "ok", "Niet nodig voor deze toepassing");
    }

    markSurveyStepCompleted("useCases");
    updateSurveySession({
      currentStep: "accounts",
      pendingTool: {
        ...pendingTool,
        contextCodes,
        surveyToolUseCaseIds: useCaseIds,
        useCaseCodes: selectedUseCases,
      },
      surveyToolUseCaseId: useCaseIds[0],
    });
    setIsSaving(false);
    router.push("/survey/accounts");
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

  if (!runId || !pendingTool) {
    return (
      <EmptySurveyState href="/survey/tools" linkLabel="Naar toolkeuze">
        Kies eerst een tool voordat je toepassingen vastlegt.
      </EmptySurveyState>
    );
  }

  return (
    <SurveyStepLayout
      completedSteps={completedSteps}
      currentStep="useCases"
      eyebrow="Toepassingen"
      intro="Kies waarvoor je deze tool gebruikt. Context vragen we alleen wanneer de toepassing daar om vraagt."
      maxWidthClassName="max-w-4xl"
      title={`Waarvoor gebruik je ${pendingTool.toolName}?`}
    >
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSaveUseCases();
        }}
      >
        <SurveySummaryGrid columnsClassName="md:grid-cols-2">
          <SurveySummaryItem label="Tool" value={pendingTool.toolName} />
          <SurveySummaryItem
            label="Context"
            value={needsContext ? "Nodig" : "Niet nodig"}
          />
        </SurveySummaryGrid>

        <SurveyCheckboxGroup
          helpText="Kies alle toepassingen die voor deze tool gelden."
          isDisabled={isSaving}
          label="Toepassingen"
          onChange={setSelectedUseCases}
          options={useCaseOptions}
          selectedCodes={selectedUseCases}
          validationError={
            selectedUseCases.length === 0 ? "Kies minimaal een toepassing." : undefined
          }
        />

        {needsContext ? (
          <SurveyCheckboxGroup
            helpText="Omdat je Code schrijven kiest, vragen we in welke context deze toepassing plaatsvindt."
            isDisabled={isSaving}
            label="Context bij code-toepassing"
            onChange={setSelectedContexts}
            options={contextOptions}
            selectedCodes={selectedContexts}
            validationError={
              selectedContexts.length === 0
                ? "Kies minimaal een context."
                : undefined
            }
          />
        ) : (
          <section className="rounded-[1.35rem] border border-[#c4e7ff] bg-[#f3fbff] p-4 text-sm text-[#40484e]">
            <h3 className="font-bold text-[#00658b]">Context</h3>
            <p className="mt-1 leading-6">
              Context wordt in deze V8-slice alleen uitgevraagd bij
              code-toepassingen. Voor deze selectie slaan we geen contextcodes
              op.
            </p>
          </section>
        )}

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        <TechnicalStatus>
          <RpcStepRow label="save_tool_use_case" state={steps.useCase} />
          <RpcStepRow
            label="save_tool_use_case_context"
            state={steps.context}
          />
        </TechnicalStatus>

        <RunIdCard runId={runId} />

        <SurveyFooterActions backHref="/survey/tools">
          <PrimarySurveyButton
            disabled={isSaving}
            isBusy={isSaving}
            type="submit"
          >
            {isSaving ? "Opslaan..." : "Verder naar account"}
          </PrimarySurveyButton>
        </SurveyFooterActions>
      </form>
    </SurveyStepLayout>
  );
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
