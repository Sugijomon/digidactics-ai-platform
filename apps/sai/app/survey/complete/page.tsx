"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  RpcStepRow,
  RunIdCard,
  SurveyFooterActions,
  SurveyPageShell,
  SurveyStepLayout,
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
      <SurveyPageShell maxWidthClassName="max-w-2xl">
        <section className="grid gap-5 rounded-[2rem] border border-white/70 bg-white/90 p-6 text-center shadow-[0_8px_40px_rgba(0,101,139,0.06)] md:p-8">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#6993aa]">
              Scan afgerond
            </p>
            <h1 className="text-2xl font-extrabold text-[#00658b]">
              Bedankt voor je input
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#40484e]">
              De respondent session is lokaal gewist en de token is gesloten.
              Je kunt deze scan niet per ongeluk nogmaals wijzigen.
            </p>
          </div>
          <SurveySummaryGrid columnsClassName="md:grid-cols-2">
            <SurveySummaryItem
              label="Run"
              value={runId ? shortRunId(runId) : "Afgerond"}
            />
            <SurveySummaryItem
              detail={savedTools.map((tool) => tool.toolName).join(", ")}
              label="Tools"
              value={`${savedTools.length} geregistreerd`}
            />
          </SurveySummaryGrid>
          <p className="rounded-xl border border-[#c4e7ff] bg-[#f3fbff] px-3 py-2 text-sm font-semibold text-[#00658b]">
            Respondent token is gesloten na afronden.
          </p>
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
      maxWidthClassName="max-w-2xl"
      title="Scan afronden"
    >
      <div className="grid gap-6">
        <RunIdCard runId={runId} />

        <SurveySummaryGrid columnsClassName="md:grid-cols-3">
          <SurveySummaryItem label="Status" value="Klaar om af te ronden" />
          <SurveySummaryItem
            label="Tools"
            value={`${savedTools.length} geregistreerd`}
          />
          <SurveySummaryItem label="Token" value="Verborgen" />
        </SurveySummaryGrid>

        <SavedToolsSummary savedTools={savedTools} />

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        <section className="grid gap-3">
          <RpcStepRow label="complete_survey_run" state={completeStep} />
          <RpcStepRow label="token-burn check" state={tokenCheckStep} />
        </section>

        <SurveyFooterActions backHref="/survey/tools">
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
