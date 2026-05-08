"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SurveyProgress } from "@/components/survey-progress";
import {
  EmptySurveyState,
  RpcStepRow,
  RunIdCard,
  SurveySummaryGrid,
  SurveySummaryItem,
  ValidationMessage,
} from "@/components/survey-ui";
import { completeSurveyRun, saveProfile } from "@/lib/sai-rpc/client";
import {
  clearSurveySession,
  markSurveyStepCompleted,
  readSurveySession,
  type StoredSurveyTool,
  updateSurveyCurrentStep,
} from "@/lib/sai-rpc/session";
import type { RpcError, SurveySession } from "@/lib/sai-rpc/types";
import {
  canAccessSurveyStep,
  getResumeStep,
  type SurveyStepId,
} from "@/lib/sai-survey/flow";

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
  message: "Wacht op complete_survey_run",
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
      setError("Geen actieve respondent session gevonden. Start de scan opnieuw.");
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
      message: "Wacht op complete_survey_run",
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
      message: "Run afgerond; token hoort nu opgebrand te zijn",
    });
    setTokenCheckStep({
      status: "running",
      message: "Controleert of dezelfde token wordt geweigerd",
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
          message: "Respondent token is gesloten na afronden",
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
      message: "Unexpected success: token was still accepted after completion.",
    });
    setError("Token burn check failed: old token was still accepted.");
    setIsCompleting(false);
  }

  if (isFinished) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7fafc] px-6 text-[#181c1e]">
        <section className="grid w-full max-w-xl gap-5 rounded-[2rem] border border-white/70 bg-white/90 p-6 text-center shadow-[0_8px_40px_rgba(0,101,139,0.06)] md:p-8">
          <p className="mb-2 text-sm font-semibold text-[#6993aa]">
            Scan afgerond
          </p>
          <h1 className="text-2xl font-bold text-[#00658b]">
            Bedankt voor je input
          </h1>
          <p className="text-sm leading-6 text-[#40484e]">
            De respondent session is lokaal gewist en de token is gesloten. Je
            kunt deze scan niet per ongeluk nogmaals wijzigen.
          </p>
          <SurveySummaryGrid columnsClassName="md:grid-cols-2">
            <SurveySummaryItem
              label="Run"
              value={runId ? shortRunId(runId) : "Afgerond"}
            />
            <SurveySummaryItem
              label="Tools"
              value={`${savedTools.length} geregistreerd`}
              detail={savedTools.map((tool) => tool.toolName).join(", ")}
            />
          </SurveySummaryGrid>
          <p className="rounded-xl border border-[#c4e7ff] bg-[#f3fbff] px-3 py-2 text-sm font-semibold text-[#00658b]">
            Respondent token is gesloten na afronden.
          </p>
        </section>
      </main>
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
    <main className="min-h-screen bg-[#f7fafc] px-6 py-8 text-[#181c1e]">
      <section className="mx-auto grid w-full max-w-2xl gap-6">
        <header>
          <p className="text-sm font-semibold text-[#6993aa]">Laatste stap</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#00658b]">
            Scan afronden
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#40484e]">
            Afronden sluit de survey run en brandt de submission token op. De
            token wordt niet getoond.
          </p>
        </header>

        <SurveyProgress
          completedSteps={completedSteps}
          currentStep="complete"
        />

        <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_8px_40px_rgba(0,101,139,0.06)]">
          <div className="mb-6">
            <RunIdCard runId={runId} />
          </div>

          <SurveySummaryGrid className="mb-6" columnsClassName="md:grid-cols-3">
            <SurveySummaryItem label="Status" value="Klaar om af te ronden" />
            <SurveySummaryItem
              label="Tools"
              value={`${savedTools.length} geregistreerd`}
            />
            <SurveySummaryItem label="Token" value="Verborgen" />
          </SurveySummaryGrid>

          <SavedToolsSummary savedTools={savedTools} />

          {error ? (
            <div className="mb-6">
              <ValidationMessage>{error}</ValidationMessage>
            </div>
          ) : null}

          <section className="mb-6 grid gap-3">
            <RpcStepRow label="complete_survey_run" state={completeStep} />
            <RpcStepRow label="token-burn check" state={tokenCheckStep} />
          </section>

          <div className="flex items-center justify-between gap-3 border-t border-[#bfc7cf]/30 pt-6">
            <a
              className="inline-flex h-11 items-center rounded-full border border-[#bfc7cf] px-6 text-sm font-bold text-[#40484e]"
              href="/survey/tools"
            >
              Vorige
            </a>
            <button
              className="inline-flex h-11 items-center rounded-full bg-[#00658b] px-7 text-sm font-bold text-white shadow-lg transition hover:bg-[#004c6a] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCompleting || savedTools.length === 0}
              aria-busy={isCompleting}
              onClick={() => {
                void handleCompleteSurvey();
              }}
              type="button"
            >
              {isCompleting ? "Afronden..." : "Scan afronden"}
            </button>
          </div>
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
    <section className="mb-6 grid gap-3 rounded-2xl border border-[#bfc7cf]/50 bg-white/80 p-4 text-sm">
      <div>
        <h2 className="font-bold text-[#00658b]">Geregistreerde tools</h2>
        <p className="mt-1 text-[#40484e]">
          Controleer kort of je minimaal je belangrijkste AI-tools hebt
          toegevoegd.
        </p>
      </div>
      {savedTools.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#bfc7cf] bg-white px-4 py-3 text-[#40484e]">
          Er staat nog geen opgeslagen tool in deze respondent session.
        </p>
      ) : (
        <div className="grid gap-2">
          {savedTools.map((tool, index) => (
            <article
              className="rounded-xl border border-[#bfc7cf]/60 bg-white px-4 py-3"
              key={tool.surveyToolId}
            >
              <p className="font-bold text-[#181c1e]">
                {index + 1}. {tool.toolName}
              </p>
              <p className="mt-1 text-[#40484e]">
                Usecases: {tool.useCaseCodes.join(", ")}
              </p>
              <p className="mt-1 text-[#40484e]">
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

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}

function shortRunId(runId: string) {
  return `${runId.slice(0, 8)}...${runId.slice(-4)}`;
}
