"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SurveyRadioGroup } from "@/components/survey-choice-groups";
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
import { saveToolAccount } from "@/lib/sai-rpc/client";
import {
  markSurveyStepCompleted,
  readSurveySession,
  type PendingSurveyTool,
  type StoredSurveyTool,
  updateSurveyCurrentStep,
  updateSurveySession,
} from "@/lib/sai-rpc/session";
import type { RpcError, SurveySession } from "@/lib/sai-rpc/types";
import {
  canAccessSurveyStep,
  getResumeStep,
  type SurveyStepId,
} from "@/lib/sai-survey/flow";
import { accountTypeOptions } from "@/lib/sai-survey/options";

type StepState = {
  status: "idle" | "running" | "ok" | "error";
  message: string;
};

const INITIAL_ACCOUNT_STEP: StepState = {
  status: "idle",
  message: "Wacht op accountstatus",
};

export default function SurveyAccountsPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(
    null,
  );
  const [pendingTool, setPendingTool] = useState<PendingSurveyTool | null>(
    null,
  );
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [savedTools, setSavedTools] = useState<StoredSurveyTool[]>([]);
  const [selectedAccountType, setSelectedAccountType] =
    useState("personal_free");
  const [accountStep, setAccountStep] =
    useState<StepState>(INITIAL_ACCOUNT_STEP);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      if (!canAccessSurveyStep(storedSession, "accounts")) {
        router.replace(getResumeStep(storedSession).href);
        return;
      }

      if (!storedSession.pendingTool?.useCaseCodes?.length) {
        router.replace("/survey/use-cases");
        return;
      }

      updateSurveyCurrentStep("accounts");
      setSurveySession({
        runId: storedSession.runId,
        submissionToken: storedSession.submissionToken,
      });
      setPendingTool(storedSession.pendingTool);
      setRunId(storedSession.runId);
      setCompletedSteps(storedSession.completedSteps ?? []);
      setSavedTools(storedSession.savedTools ?? []);
    });
  }, [router]);

  async function handleSaveAccount() {
    if (!surveySession || !pendingTool) {
      setError("Geen actieve toolregistratie gevonden. Kies eerst een tool.");
      return;
    }

    if (!selectedAccountType) {
      setError("Kies een accounttype.");
      return;
    }

    setError(null);
    setIsSaving(true);
    setAccountStep({ status: "running", message: "Accounttype opslaan" });

    const accountResult = await saveToolAccount(
      surveySession,
      pendingTool.surveyToolId,
      selectedAccountType,
    );

    if (!accountResult.ok) {
      finishWithError(accountResult.error);
      return;
    }

    const savedTool: StoredSurveyTool = {
      surveyToolId: pendingTool.surveyToolId,
      toolName: pendingTool.toolName,
      useCaseCodes: pendingTool.useCaseCodes ?? [],
      contextCodes: pendingTool.contextCodes ?? [],
      accountTypeCode: selectedAccountType,
      savedAt: new Date().toISOString(),
    };
    const nextSavedTools = [...savedTools, savedTool];

    setAccountStep({ status: "ok", message: "Accounttype opgeslagen" });
    markSurveyStepCompleted("accounts");
    updateSurveySession({
      currentStep: "complete",
      pendingTool: undefined,
      savedTools: nextSavedTools,
      surveyToolId: pendingTool.surveyToolId,
      surveyToolUseCaseId: pendingTool.surveyToolUseCaseIds?.[0],
    });
    setIsSaving(false);
    router.push("/survey/complete");
  }

  function finishWithError(rpcError: RpcError) {
    setAccountStep({ status: "error", message: formatRpcError(rpcError) });
    setError(formatRpcError(rpcError));
    setIsSaving(false);
  }

  if (!runId || !pendingTool) {
    return (
      <EmptySurveyState href="/survey/tools" linkLabel="Naar toolkeuze">
        Kies eerst een tool en toepassing voordat je accountstatus vastlegt.
      </EmptySurveyState>
    );
  }

  return (
    <SurveyStepLayout
      completedSteps={completedSteps}
      currentStep="accounts"
      eyebrow="Accountstatus"
      intro="Leg vast met welk type account deze tool gebruikt wordt. Dit staat nu los van de toolpicker, zoals in de V8-opzet."
      maxWidthClassName="max-w-4xl"
      title={`Met welk account gebruik je ${pendingTool.toolName}?`}
    >
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSaveAccount();
        }}
      >
        <SurveySummaryGrid columnsClassName="md:grid-cols-3">
          <SurveySummaryItem label="Tool" value={pendingTool.toolName} />
          <SurveySummaryItem
            label="Toepassingen"
            value={`${pendingTool.useCaseCodes?.length ?? 0} gekozen`}
          />
          <SurveySummaryItem
            label="Context"
            value={`${pendingTool.contextCodes?.length ?? 0} opgeslagen`}
          />
        </SurveySummaryGrid>

        <SurveyRadioGroup
          helpText="Kies het accounttype dat het best past bij deze tool."
          isDisabled={isSaving}
          label="Accounttype"
          name="account_type"
          onChange={setSelectedAccountType}
          options={accountTypeOptions}
          selectedCode={selectedAccountType}
          validationError={!selectedAccountType ? "Kies een accounttype." : undefined}
        />

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        <TechnicalStatus>
          <RpcStepRow label="save_tool_account" state={accountStep} />
        </TechnicalStatus>

        <RunIdCard runId={runId} />

        <SurveyFooterActions backHref="/survey/use-cases">
          <PrimarySurveyButton
            disabled={isSaving}
            isBusy={isSaving}
            type="submit"
          >
            {isSaving ? "Opslaan..." : "Opslaan en afronden"}
          </PrimarySurveyButton>
        </SurveyFooterActions>
      </form>
    </SurveyStepLayout>
  );
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
