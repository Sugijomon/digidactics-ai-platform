"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import {
  accountTypeOptions,
  contextOptions,
  useCaseOptions,
  type SurveyOption,
} from "@/lib/sai-survey/options";

type StepState = {
  status: "idle" | "running" | "ok" | "error";
  message: string;
};

const INITIAL_ACCOUNT_STEP: StepState = {
  status: "idle",
  message: "Wacht op accountstatus",
};

const ACCOUNT_MATRIX_OPTIONS = [
  {
    code: "business_license",
    eyebrow: "Beheerd",
    label: "Zakelijke licentie",
    description: "De organisatie heeft grip op contract, logging en beheer.",
  },
  {
    code: "personal_free",
    eyebrow: "Prive",
    label: "Gratis account",
    description: "Gebruik zonder zakelijke overeenkomst of centraal beheer.",
  },
  {
    code: "personal_paid",
    eyebrow: "Prive",
    label: "Betaald account",
    description: "Zelf betaald, maar meestal nog buiten organisatieregie.",
  },
  {
    code: "both",
    eyebrow: "Gemengd",
    label: "Beide",
    description: "Je gebruikt zowel een zakelijke als persoonlijke variant.",
  },
] satisfies SurveyOptionWithEyebrow[];

type SurveyOptionWithEyebrow = SurveyOption & {
  eyebrow: string;
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
  const [isAccountSaved, setIsAccountSaved] = useState(false);
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
      currentStep: "accounts",
      pendingTool: undefined,
      savedTools: nextSavedTools,
      surveyToolId: pendingTool.surveyToolId,
      surveyToolUseCaseId: pendingTool.surveyToolUseCaseIds?.[0],
    });
    setSavedTools(nextSavedTools);
    setIsAccountSaved(true);
    setIsSaving(false);
  }

  function handleAddAnotherTool() {
    updateSurveyCurrentStep("tools");
    router.push("/survey/tools");
  }

  function handleContinueToComplete() {
    updateSurveyCurrentStep("complete");
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
        <AccountStepHeader
          pendingTool={pendingTool}
          selectedAccountLabel={getOptionLabel(
            accountTypeOptions,
            selectedAccountType,
          )}
        />

        <AccountMatrix
          isDisabled={isSaving}
          onChange={setSelectedAccountType}
          selectedCode={selectedAccountType}
          validationError={!selectedAccountType ? "Kies een accounttype." : undefined}
        />

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        {isAccountSaved ? (
          <AccountSavedChoice
            savedToolCount={savedTools.length}
            toolName={pendingTool.toolName}
          />
        ) : null}

        <TechnicalStatus>
          <RpcStepRow label="save_tool_account" state={accountStep} />
        </TechnicalStatus>

        <RunIdCard runId={runId} />

        <SurveyFooterActions backHref="/survey/use-cases">
          {isAccountSaved ? (
            <>
              <SecondarySurveyButton onClick={handleAddAnotherTool}>
                Nog een tool toevoegen
              </SecondarySurveyButton>
              <PrimarySurveyButton onClick={handleContinueToComplete}>
                Naar afronden
              </PrimarySurveyButton>
            </>
          ) : (
            <PrimarySurveyButton
              disabled={isSaving}
              isBusy={isSaving}
              type="submit"
            >
              {isSaving ? "Opslaan..." : "Account opslaan"}
            </PrimarySurveyButton>
          )}
        </SurveyFooterActions>
      </form>
    </SurveyStepLayout>
  );
}

function AccountSavedChoice({
  savedToolCount,
  toolName,
}: {
  savedToolCount: number;
  toolName: string;
}) {
  return (
    <section className="min-w-0 max-w-full rounded-[1.35rem] border border-[#c4e7ff] bg-[#f3fbff] p-4 text-sm text-[#40484e]">
      <p className="font-bold text-[#00658b]">{toolName} is opgeslagen</p>
      <p className="mt-1 leading-6">
        Je hebt nu {savedToolCount} tool
        {savedToolCount === 1 ? "" : "s"} compleet geregistreerd. Voeg nog een
        tool toe als je meerdere AI-tools gebruikt, of rond de scan af.
      </p>
    </section>
  );
}

function AccountStepHeader({
  pendingTool,
  selectedAccountLabel,
}: {
  pendingTool: PendingSurveyTool;
  selectedAccountLabel: string;
}) {
  return (
    <section className="grid min-w-0 max-w-full gap-4 rounded-[1.6rem] border border-[#c4e7ff] bg-[#f3fbff] p-4 text-sm md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[#00658b]/70">
            Toegang en beheer
          </p>
          <h2 className="mt-1 break-words text-xl font-extrabold text-[#00658b]">
            {pendingTool.toolName}
          </h2>
          <p className="mt-2 max-w-2xl leading-6 text-[#40484e]">
            Het belangrijkste verschil is wie het account beheert. Bij
            persoonlijke accounts heeft de organisatie minder grip op
            contracten, logging en bewaartermijnen.
          </p>
        </div>
        <span className="rounded-full border border-[#00658b]/20 bg-white px-3 py-1 text-xs font-extrabold text-[#00658b]">
          {selectedAccountLabel}
        </span>
      </div>

      <SurveySummaryGrid
        className="border-white/70 bg-white/70"
        columnsClassName="md:grid-cols-3"
      >
        <SurveySummaryItem
          detail={getOptionLabels(useCaseOptions, pendingTool.useCaseCodes ?? [])}
          label="Toepassingen"
          value={`${pendingTool.useCaseCodes?.length ?? 0} gekozen`}
        />
        <SurveySummaryItem
          detail={
            pendingTool.contextCodes?.length
              ? getOptionLabels(contextOptions, pendingTool.contextCodes)
              : "Niet van toepassing"
          }
          label="Context"
          value={
            pendingTool.contextCodes?.length
              ? `${pendingTool.contextCodes.length} opgeslagen`
              : "Overgeslagen"
          }
        />
        <SurveySummaryItem
          label="Account"
          value={selectedAccountLabel || "Nog kiezen"}
        />
      </SurveySummaryGrid>
    </section>
  );
}

function AccountMatrix({
  isDisabled = false,
  onChange,
  selectedCode,
  validationError,
}: {
  isDisabled?: boolean;
  onChange: (code: string) => void;
  selectedCode: string;
  validationError?: string;
}) {
  return (
    <section
      className={`grid min-w-0 max-w-full gap-4 rounded-[1.35rem] border bg-white/75 p-4 shadow-[0_4px_14px_rgba(0,101,139,0.035)] ${
        validationError ? "border-red-300" : "border-white/80"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 break-words font-bold text-[#00658b]">
            Accountstatus
          </h3>
          <RequiredBadge />
        </div>
        <p className="mt-1 break-words text-sm leading-6 text-[#40484e]">
          Kies de kolom die het best past bij hoe je deze tool gebruikt.
        </p>
        {validationError ? (
          <p className="mt-2 text-sm font-semibold text-red-700">
            {validationError}
          </p>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-3 md:grid-cols-4">
        {ACCOUNT_MATRIX_OPTIONS.map((option) => (
          <label
            className={`relative grid cursor-pointer gap-3 rounded-2xl border px-4 py-4 text-center transition hover:-translate-y-0.5 hover:border-[#00658b] hover:shadow-[0_4px_12px_rgba(0,101,139,0.06)] ${
              selectedCode === option.code
                ? "border-[#00658b] bg-[#f3fbff] shadow-[0_4px_18px_rgba(0,101,139,0.08)]"
                : "border-[#bfc7cf] bg-white"
            } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
            key={option.code}
          >
            <span className="text-xs font-bold uppercase tracking-wide text-[#6993aa]">
              {option.eyebrow}
            </span>
            <span className="mx-auto grid h-8 w-8 place-items-center rounded-full border-2 border-[#bfc7cf] bg-white">
              <span
                className={`h-3 w-3 rounded-full ${
                  selectedCode === option.code ? "bg-[#00658b]" : "bg-transparent"
                }`}
              />
            </span>
            <span className="break-words text-sm font-extrabold text-[#181c1e]">
              {option.label}
            </span>
            <span className="break-words text-xs leading-5 text-[#40484e]">
              {option.description}
            </span>
            <input
              checked={selectedCode === option.code}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              disabled={isDisabled}
              name="account_type"
              onChange={() => onChange(option.code)}
              type="radio"
              value={option.code}
            />
          </label>
        ))}
      </div>
    </section>
  );
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
