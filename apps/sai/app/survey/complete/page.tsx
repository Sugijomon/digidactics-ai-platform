"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  RpcStepRow,
  RunIdCard,
  SecondarySurveyButton,
  SurveyFooterActions,
  SurveyPageShell,
  SurveyStepLayout,
  SurveySummaryGrid,
  SurveySummaryItem,
  TechnicalStatus,
  ValidationMessage,
} from "@/components/survey-ui";
import { completeSurveyRun, saveProfile } from "@/lib/sai-rpc/client";
import {
  clearSurveySession,
  markSurveyStepCompleted,
  readSurveySession,
  storeSurveyGuardNotice,
  type StoredSurveyTool,
  updateSurveyCurrentStep,
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

const INITIAL_COMPLETE_STEP: StepState = {
  status: "idle",
  message: "Wacht op afronden",
};

const INITIAL_TOKEN_CHECK_STEP: StepState = {
  status: "idle",
  message: "Wacht op afronden",
};

export default function SurveyCompletePage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(
    null,
  );
  const [runId, setRunId] = useState<string | null>(null);
  const [completeStep, setCompleteStep] = useState<StepState>(
    INITIAL_COMPLETE_STEP,
  );
  const [tokenCheckStep, setTokenCheckStep] = useState<StepState>(
    INITIAL_TOKEN_CHECK_STEP,
  );
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [savedTools, setSavedTools] = useState<StoredSurveyTool[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      if (!canAccessSurveyStep(storedSession, "complete")) {
        storeSurveyGuardNotice(
          "Registreer minimaal een tool voordat je de scan afrondt.",
        );
        router.replace(getResumeStep(storedSession).href);
        return;
      }

      updateSurveyCurrentStep("complete");
      setSurveySession({
        runId: storedSession.runId,
        submissionToken: storedSession.submissionToken,
      });
      setRunId(storedSession.runId);
      setCompletedSteps(storedSession.completedSteps ?? []);
      setSavedTools(storedSession.savedTools ?? []);
    });
  }, [router]);

  async function handleCompleteSurvey() {
    if (!surveySession) {
      setError("Geen actieve scan gevonden. Start de scan opnieuw.");
      return;
    }

    if (savedTools.length === 0) {
      setError("Registreer minimaal een AI-tool voordat je de scan afrondt.");
      return;
    }

    setIsCompleting(true);
    setError(null);
    setCompleteStep({ status: "running", message: "Run afronden" });
    setTokenCheckStep({
      status: "idle",
      message: "Wacht op afronden",
    });

    const completeResult = await completeSurveyRun(surveySession);

    if (!completeResult.ok) {
      setCompleteStep({
        status: "error",
        message: formatRpcError(completeResult.error),
      });
      setError(formatRpcError(completeResult.error));
      setIsCompleting(false);
      return;
    }

    setCompleteStep({
      status: "ok",
      message: "Scan afgerond; sessie wordt gesloten",
    });
    setTokenCheckStep({
      status: "running",
      message: "Controleert of de sessie gesloten is",
    });

    const burnCheckResult = await saveProfile(surveySession, {
      department_code: "it_data_development",
      ai_frequency_code: "weekly",
      future_usecases_text: "Token burn check after completion",
    });

    if (!burnCheckResult.ok) {
      if (burnCheckResult.error.code === "invalid_token_or_run_closed") {
        setTokenCheckStep({
          status: "ok",
          message: "Sessie is gesloten na afronden",
        });
        markSurveyStepCompleted("complete");
        clearSurveySession();
        setSurveySession(null);
        setIsFinished(true);
        setIsCompleting(false);
        return;
      }

      setTokenCheckStep({
        status: "error",
        message: formatRpcError(burnCheckResult.error),
      });
      setError(formatRpcError(burnCheckResult.error));
      setIsCompleting(false);
      return;
    }

    setTokenCheckStep({
      status: "error",
      message: "Onverwacht resultaat: sessie accepteerde nog wijzigingen.",
    });
    setError("De afsluitcontrole faalde: de sessie accepteerde nog wijzigingen.");
    setIsCompleting(false);
  }

  if (isFinished) {
    return (
      <SurveyPageShell maxWidthClassName="max-w-2xl">
        <section className="grid min-w-0 max-w-full gap-5 rounded-[2rem] border border-white/70 bg-white/90 p-6 text-center shadow-[0_8px_40px_rgba(0,101,139,0.06)] md:p-8">
          <div className="min-w-0">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#6993aa]">
              Scan afgerond
            </p>
            <h1 className="break-words text-2xl font-extrabold text-[#00658b]">
              Bedankt voor je input
            </h1>
            <p className="mx-auto mt-2 max-w-lg break-words text-sm leading-6 text-[#40484e]">
              Je antwoorden zijn veilig ontvangen. De lokale scansessie is
              gewist en deze scan kan niet per ongeluk nogmaals gewijzigd
              worden.
            </p>
          </div>
          <SurveySummaryGrid columnsClassName="md:grid-cols-3">
            <SurveySummaryItem
              label="Run"
              value={runId ? shortRunId(runId) : "Afgerond"}
            />
            <SurveySummaryItem
              detail={savedTools.map((tool) => tool.toolName).join(", ")}
              label="Tools"
              value={`${savedTools.length} geregistreerd`}
            />
            <SurveySummaryItem label="Sessie" value="Gesloten" />
          </SurveySummaryGrid>
          <CompletionAssurance />
        </section>
      </SurveyPageShell>
    );
  }

  if (!runId) {
    return (
      <EmptySurveyState>
        Start eerst een scan voordat je de respondent-flow afrondt.
      </EmptySurveyState>
    );
  }

  return (
    <SurveyStepLayout
      completedSteps={completedSteps}
      currentStep="complete"
      eyebrow="Laatste stap"
      intro="Rond je scan af. Daarna wordt deze sessie gesloten en kun je je antwoorden niet per ongeluk nog aanpassen."
      maxWidthClassName="max-w-4xl"
      title="Scan afronden"
    >
      <div className="grid min-w-0 gap-6">
        <CompletionOverview savedTools={savedTools} />

        <SavedToolsSummary savedTools={savedTools} />

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        <TechnicalStatus summary="Afsluitcontrole">
          <RpcStepRow label="complete_survey_run" state={completeStep} />
          <RpcStepRow label="token-burn check" state={tokenCheckStep} />
        </TechnicalStatus>

        <RunIdCard runId={runId} />

        <SurveyFooterActions backHref="/survey/accounts">
          <SecondarySurveyButton
            disabled={isCompleting}
            onClick={() => router.push("/survey/tools")}
          >
            Nog een tool toevoegen
          </SecondarySurveyButton>
          <PrimarySurveyButton
            disabled={isCompleting || savedTools.length === 0}
            isBusy={isCompleting}
            onClick={() => {
              void handleCompleteSurvey();
            }}
          >
            {isCompleting ? "Afronden..." : "Scan afronden"}
          </PrimarySurveyButton>
        </SurveyFooterActions>
      </div>
    </SurveyStepLayout>
  );
}

function CompletionOverview({
  savedTools,
}: {
  savedTools: StoredSurveyTool[];
}) {
  const accountTypes = new Set(savedTools.map((tool) => tool.accountTypeCode));
  const toolsWithContext = savedTools.filter(
    (tool) => tool.contextCodes.length > 0,
  ).length;

  return (
    <section className="grid min-w-0 max-w-full gap-4 rounded-[1.6rem] border border-[#c4e7ff] bg-[#f3fbff] p-4 text-sm md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[#00658b]/70">
            Klaar voor afsluiten
          </p>
          <h2 className="mt-1 break-words text-xl font-extrabold text-[#00658b]">
            Controleer je toolregistratie
          </h2>
          <p className="mt-2 max-w-2xl break-words leading-6 text-[#40484e]">
            Na afronden wordt de respondentensessie gesloten en verdwijnt de
            lokale sessiesleutel uit deze browser.
          </p>
        </div>
        <span className="rounded-full border border-[#00658b]/20 bg-white px-3 py-1 text-xs font-extrabold text-[#00658b]">
          {savedTools.length} tool{savedTools.length === 1 ? "" : "s"}
        </span>
      </div>

      <SurveySummaryGrid
        className="border-white/70 bg-white/70"
        columnsClassName="md:grid-cols-3"
      >
        <SurveySummaryItem
          label="Geregistreerd"
          value={`${savedTools.length} tool${savedTools.length === 1 ? "" : "s"}`}
        />
        <SurveySummaryItem
          label="Accountstatus"
          value={`${accountTypes.size} type${accountTypes.size === 1 ? "" : "s"}`}
        />
        <SurveySummaryItem
          label="Context"
          value={
            toolsWithContext > 0
              ? `${toolsWithContext} met context`
              : "Niet van toepassing"
          }
        />
      </SurveySummaryGrid>
    </section>
  );
}

function CompletionAssurance() {
  return (
    <section className="grid min-w-0 gap-3 text-left text-sm md:grid-cols-3">
      <AssuranceItem label="Ontvangen" text="Je antwoorden zijn opgeslagen." />
      <AssuranceItem label="Gesloten" text="De scansessie is gesloten na afronden." />
      <AssuranceItem label="Gewist" text="De lokale sessiesleutel is verwijderd." />
    </section>
  );
}

function AssuranceItem({ label, text }: { label: string; text: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#c4e7ff] bg-[#f3fbff] px-3 py-3">
      <p className="break-words font-bold text-[#00658b]">{label}</p>
      <p className="mt-1 break-words leading-5 text-[#40484e]">{text}</p>
    </div>
  );
}

function SavedToolsSummary({
  savedTools,
}: {
  savedTools: StoredSurveyTool[];
}) {
  return (
    <section className="mb-6 grid min-w-0 max-w-full gap-3 rounded-2xl border border-[#bfc7cf]/50 bg-white/80 p-4 text-sm">
      <div className="min-w-0">
        <h2 className="break-words font-bold text-[#00658b]">Geregistreerde tools</h2>
        <p className="mt-1 break-words text-[#40484e]">
          Controleer kort of je minimaal je belangrijkste AI-tools hebt
          toegevoegd.
        </p>
      </div>
      {savedTools.length === 0 ? (
        <p className="break-words rounded-xl border border-dashed border-[#bfc7cf] bg-white px-4 py-3 text-[#40484e]">
          Er staat nog geen opgeslagen tool in deze scan.
        </p>
      ) : (
        <div className="grid min-w-0 gap-2">
          {savedTools.map((tool, index) => (
            <article
              className="grid min-w-0 gap-3 rounded-xl border border-[#bfc7cf]/60 bg-white px-4 py-3"
              key={tool.surveyToolId}
            >
              <div className="min-w-0">
                <p className="break-words font-bold text-[#181c1e]">
                  {index + 1}. {tool.toolName}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#6993aa]">
                  {getOptionLabel(accountTypeOptions, tool.accountTypeCode)}
                </p>
              </div>
              <dl className="grid gap-2 md:grid-cols-2">
                <SummaryPair
                  label="Toepassingen"
                  value={getOptionLabels(useCaseOptions, tool.useCaseCodes)}
                />
                <SummaryPair
                  label="Context"
                  value={
                    tool.contextCodes.length
                      ? getOptionLabels(contextOptions, tool.contextCodes)
                      : "Niet van toepassing"
                  }
                />
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-[#f7fafc] px-3 py-2">
      <dt className="text-xs font-bold uppercase tracking-wide text-[#00658b]/70">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-[#40484e]">{value}</dd>
    </div>
  );
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}

function shortRunId(runId: string) {
  return `${runId.slice(0, 8)}...${runId.slice(-4)}`;
}

function getOptionLabels(options: SurveyOption[], codes: string[]) {
  return codes.map((code) => getOptionLabel(options, code)).join(", ");
}

function getOptionLabel(options: SurveyOption[], code: string) {
  return options.find((option) => option.code === code)?.label ?? code;
}
