"use client";

import { useMemo, useState } from "react";
import {
  completeSurveyRun,
  saveProfile,
  saveTool,
  saveToolAccount,
  saveToolUseCase,
  saveToolUseCaseContext,
  startSurveyRun,
} from "@/lib/sai-rpc/client";
import type {
  RpcError,
  RpcResult,
  SmokeFlowIds,
  SurveySession,
} from "@/lib/sai-rpc/types";

const DEFAULT_WAVE_TOKEN = "sai-smoke-wave-token";

const PROFILE_PAYLOAD = {
  department_code: "it_data_development",
  ai_frequency_code: "weekly",
  future_usecases_text: "Frontend smoke test",
};

const TOOL_PAYLOAD = {
  tool_code: "chatgpt",
  tool_name: "ChatGPT",
  is_custom: false,
  catalog_beheerstatus_code: "newly_discovered",
};

type StepKey =
  | "start"
  | "profile"
  | "tool"
  | "useCase"
  | "context"
  | "account"
  | "complete"
  | "postCompleteFailure";

type StepState = {
  status: "idle" | "running" | "ok" | "error";
  message: string;
};

type StepStates = Record<StepKey, StepState>;

const INITIAL_STEPS: StepStates = {
  start: { status: "idle", message: "Waiting" },
  profile: { status: "idle", message: "Waiting" },
  tool: { status: "idle", message: "Waiting" },
  useCase: { status: "idle", message: "Waiting" },
  context: { status: "idle", message: "Waiting" },
  account: { status: "idle", message: "Waiting" },
  complete: { status: "idle", message: "Waiting" },
  postCompleteFailure: { status: "idle", message: "Waiting" },
};

export default function DevRpcPage() {
  const [waveToken, setWaveToken] = useState(DEFAULT_WAVE_TOKEN);
  const [session, setSession] = useState<SurveySession | null>(null);
  const [ids, setIds] = useState<SmokeFlowIds>({
    runId: null,
    surveyToolId: null,
    surveyToolUseCaseId: null,
  });
  const [steps, setSteps] = useState<StepStates>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);

  const maskedToken = useMemo(
    () => (session ? maskToken(session.submissionToken) : "Not started"),
    [session],
  );

  async function runStep<T>(
    key: StepKey,
    action: () => Promise<RpcResult<T>>,
    onSuccess?: (data: T) => void,
    successMessage = "OK",
  ) {
    setStep(key, "running", "Running");
    const result = await action();

    if (!result.ok) {
      setStep(key, "error", formatError(result.error));
      return result;
    }

    onSuccess?.(result.data);
    setStep(key, "ok", successMessage);
    return result;
  }

  async function handleStart() {
    const result = await runStep(
      "start",
      () => startSurveyRun(waveToken.trim()),
      (startedSession) => {
        setSession(startedSession);
        setIds({
          runId: startedSession.runId,
          surveyToolId: null,
          surveyToolUseCaseId: null,
        });
      },
      "Run started",
    );

    return result.ok ? result.data : null;
  }

  async function handleSaveProfile(activeSession = session) {
    if (!activeSession) {
      return missingDependency("profile", "Start a survey run first.");
    }

    return runStep(
      "profile",
      () => saveProfile(activeSession, PROFILE_PAYLOAD),
      undefined,
      "Profile saved",
    );
  }

  async function handleSaveTool(activeSession = session) {
    if (!activeSession) {
      return missingDependency("tool", "Start a survey run first.");
    }

    return runStep(
      "tool",
      () => saveTool(activeSession, TOOL_PAYLOAD),
      (surveyToolId) => {
        setIds((current) => ({ ...current, surveyToolId }));
      },
      "Tool saved",
    );
  }

  async function handleSaveUseCase(
    activeSession = session,
    activeSurveyToolId = ids.surveyToolId,
  ) {
    if (!activeSession || !activeSurveyToolId) {
      return missingDependency("useCase", "Save a tool first.");
    }

    return runStep(
      "useCase",
      () => saveToolUseCase(activeSession, activeSurveyToolId, "drafting"),
      (surveyToolUseCaseId) => {
        setIds((current) => ({ ...current, surveyToolUseCaseId }));
      },
      "Use case saved",
    );
  }

  async function handleSaveContext(
    activeSession = session,
    activeSurveyToolUseCaseId = ids.surveyToolUseCaseId,
  ) {
    if (!activeSession || !activeSurveyToolUseCaseId) {
      return missingDependency("context", "Save a use case first.");
    }

    return runStep(
      "context",
      () =>
        saveToolUseCaseContext(activeSession, activeSurveyToolUseCaseId, [
          "internal_work",
        ]),
      undefined,
      "Context saved",
    );
  }

  async function handleSaveAccount(
    activeSession = session,
    activeSurveyToolId = ids.surveyToolId,
  ) {
    if (!activeSession || !activeSurveyToolId) {
      return missingDependency("account", "Save a tool first.");
    }

    return runStep(
      "account",
      () => saveToolAccount(activeSession, activeSurveyToolId, "personal_free"),
      undefined,
      "Account saved",
    );
  }

  async function handleComplete(activeSession = session) {
    if (!activeSession) {
      return missingDependency("complete", "Start a survey run first.");
    }

    return runStep(
      "complete",
      () => completeSurveyRun(activeSession),
      undefined,
      "Run completed and token burned",
    );
  }

  async function handlePostCompletionFailure(activeSession = session) {
    if (!activeSession) {
      return missingDependency(
        "postCompleteFailure",
        "Complete a survey run first.",
      );
    }

    setStep("postCompleteFailure", "running", "Running");
    const result = await saveProfile(activeSession, {
      ...PROFILE_PAYLOAD,
      future_usecases_text: "This write should fail after completion",
    });

    if (!result.ok && result.error.code === "invalid_token_or_run_closed") {
      setStep(
        "postCompleteFailure",
        "ok",
        "Expected failure: invalid_token_or_run_closed",
      );
      return result;
    }

    if (!result.ok) {
      setStep("postCompleteFailure", "error", formatError(result.error));
      return result;
    }

    setStep(
      "postCompleteFailure",
      "error",
      "Unexpected success: token was still accepted after completion.",
    );
    return result;
  }

  async function handleRunAll() {
    setIsRunning(true);
    setSteps(INITIAL_STEPS);
    setSession(null);
    setIds({ runId: null, surveyToolId: null, surveyToolUseCaseId: null });

    try {
      const startedSession = await handleStart();
      if (!startedSession) return;

      const profileResult = await handleSaveProfile(startedSession);
      if (!profileResult.ok) return;

      const toolResult = await handleSaveTool(startedSession);
      if (!toolResult.ok) return;

      const useCaseResult = await handleSaveUseCase(
        startedSession,
        toolResult.data,
      );
      if (!useCaseResult.ok) return;

      const contextResult = await handleSaveContext(
        startedSession,
        useCaseResult.data,
      );
      if (!contextResult.ok) return;

      const accountResult = await handleSaveAccount(
        startedSession,
        toolResult.data,
      );
      if (!accountResult.ok) return;

      const completeResult = await handleComplete(startedSession);
      if (!completeResult.ok) return;

      await handlePostCompletionFailure(startedSession);
    } finally {
      setIsRunning(false);
    }
  }

  function missingDependency(step: StepKey, message: string): RpcResult<null> {
    setStep(step, "error", message);

    return {
      ok: false,
      error: {
        code: "unexpected_response",
        message,
      },
    };
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500">Dev</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          SAI Respondent RPC Smoke Flow
        </h1>
      </header>

      <section className="grid gap-4 rounded-lg border border-zinc-200 p-5">
        <label className="grid gap-2 text-sm font-medium">
          Wave token
          <input
            className="h-11 rounded-md border border-zinc-300 px-3 font-mono text-sm"
            value={waveToken}
            onChange={(event) => setWaveToken(event.target.value)}
          />
        </label>

        <div className="grid gap-2 text-sm text-zinc-700">
          <p>
            <span className="font-medium text-zinc-950">Run ID:</span>{" "}
            <span className="font-mono">{ids.runId ?? "Not started"}</span>
          </p>
          <p>
            <span className="font-medium text-zinc-950">Submission token:</span>{" "}
            <span className="font-mono">{maskedToken}</span>
          </p>
          <p>
            <span className="font-medium text-zinc-950">Survey tool ID:</span>{" "}
            <span className="font-mono">
              {ids.surveyToolId ?? "Not saved"}
            </span>
          </p>
          <p>
            <span className="font-medium text-zinc-950">
              Survey tool use case ID:
            </span>{" "}
            <span className="font-mono">
              {ids.surveyToolUseCaseId ?? "Not saved"}
            </span>
          </p>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <button
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={isRunning}
          onClick={handleRunAll}
          type="button"
        >
          Run full flow
        </button>
        <button
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={isRunning}
          onClick={() => {
            setSteps(INITIAL_STEPS);
            setSession(null);
            setIds({
              runId: null,
              surveyToolId: null,
              surveyToolUseCaseId: null,
            });
          }}
          type="button"
        >
          Reset page state
        </button>
      </section>

      <section className="grid gap-3">
        <StepCard
          label="1. start_survey_run"
          onClick={handleStart}
          state={steps.start}
        />
        <StepCard
          label="2. save_profile"
          onClick={() => void handleSaveProfile()}
          state={steps.profile}
        />
        <StepCard
          label="3. save_tool"
          onClick={() => void handleSaveTool()}
          state={steps.tool}
        />
        <StepCard
          label="4. save_tool_use_case"
          onClick={() => void handleSaveUseCase()}
          state={steps.useCase}
        />
        <StepCard
          label="5. save_tool_use_case_context"
          onClick={() => void handleSaveContext()}
          state={steps.context}
        />
        <StepCard
          label="6. save_tool_account"
          onClick={() => void handleSaveAccount()}
          state={steps.account}
        />
        <StepCard
          label="7. complete_survey_run"
          onClick={() => void handleComplete()}
          state={steps.complete}
        />
        <StepCard
          label="8. verify burned token"
          onClick={() => void handlePostCompletionFailure()}
          state={steps.postCompleteFailure}
        />
      </section>
    </main>
  );
}

function StepCard({
  label,
  onClick,
  state,
}: {
  label: string;
  onClick: () => void;
  state: StepState;
}) {
  return (
    <article className="grid gap-3 rounded-lg border border-zinc-200 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <h2 className="font-medium text-zinc-950">{label}</h2>
        <p className="mt-1 break-words font-mono text-sm text-zinc-600">
          {state.message}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="rounded-full border px-3 py-1 text-xs font-medium"
          data-status={state.status}
        >
          {state.status}
        </span>
        <button
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium"
          onClick={onClick}
          type="button"
        >
          Run
        </button>
      </div>
    </article>
  );
}

function maskToken(token: string) {
  if (token.length <= 12) {
    return "********";
  }

  return `${token.slice(0, 6)}...${token.slice(-6)}`;
}

function formatError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
