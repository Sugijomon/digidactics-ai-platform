"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  saveTool,
  saveToolAccount,
  saveToolUseCase,
  saveToolUseCaseContext,
} from "@/lib/sai-rpc/client";
import {
  readSurveySession,
  updateSurveyCurrentStep,
  updateSurveySession,
} from "@/lib/sai-rpc/session";
import type { RpcError, RpcResult, SurveySession } from "@/lib/sai-rpc/types";

type StepKey = "tool" | "useCase" | "context" | "account";

type StepState = {
  status: "idle" | "running" | "ok" | "error";
  message: string;
};

type StepStates = Record<StepKey, StepState>;

const INITIAL_STEPS: StepStates = {
  tool: { status: "idle", message: "Wacht op opslaan" },
  useCase: { status: "idle", message: "Wacht op toolregistratie" },
  context: { status: "idle", message: "Wacht op use case" },
  account: { status: "idle", message: "Wacht op toolregistratie" },
};

const CHATGPT_TOOL_PAYLOAD = {
  tool_code: "chatgpt",
  tool_name: "ChatGPT",
  is_custom: false,
  catalog_beheerstatus_code: "newly_discovered",
};

export default function SurveyToolsPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(
    null,
  );
  const [runId, setRunId] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepStates>(INITIAL_STEPS);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      updateSurveyCurrentStep("tools");
      setSurveySession({
        runId: storedSession.runId,
        submissionToken: storedSession.submissionToken,
      });
      setRunId(storedSession.runId);
    });
  }, []);

  async function handleSaveToolFlow() {
    if (!surveySession) {
      setError("Geen actieve respondent session gevonden. Start de scan opnieuw.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSteps(INITIAL_STEPS);

    const toolResult = await runStep(
      "tool",
      () => saveTool(surveySession, CHATGPT_TOOL_PAYLOAD),
      "ChatGPT opgeslagen",
    );
    if (!toolResult.ok) return finishWithError(toolResult.error);

    updateSurveySession({ surveyToolId: toolResult.data });

    const useCaseResult = await runStep(
      "useCase",
      () => saveToolUseCase(surveySession, toolResult.data, "drafting"),
      "Use case drafting opgeslagen",
    );
    if (!useCaseResult.ok) return finishWithError(useCaseResult.error);

    updateSurveySession({ surveyToolUseCaseId: useCaseResult.data });

    const contextResult = await runStep(
      "context",
      () =>
        saveToolUseCaseContext(surveySession, useCaseResult.data, [
          "internal_work",
        ]),
      "Context internal_work opgeslagen",
    );
    if (!contextResult.ok) return finishWithError(contextResult.error);

    const accountResult = await runStep(
      "account",
      () => saveToolAccount(surveySession, toolResult.data, "personal_free"),
      "Account personal_free opgeslagen",
    );
    if (!accountResult.ok) return finishWithError(accountResult.error);

    updateSurveyCurrentStep("complete");
    router.push("/survey/complete");
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

  if (!runId) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7fafc] px-6 text-[#181c1e]">
        <section className="max-w-md rounded-2xl border border-[#bfc7cf]/50 bg-white p-6 text-center shadow-sm">
          <h1 className="mb-2 text-2xl font-bold">Geen actieve scan</h1>
          <p className="mb-5 text-sm leading-6 text-[#40484e]">
            Start eerst een scan en sla de profielstap op voordat je een tool
            registreert.
          </p>
          <a
            className="inline-flex h-11 items-center rounded-full bg-[#004c6a] px-6 text-sm font-bold text-white"
            href="/survey"
          >
            Terug naar start
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7fafc] px-6 py-8 text-[#181c1e]">
      <section className="mx-auto grid w-full max-w-4xl gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#6993aa]">Stap 2 van 5</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#00658b]">
              Mijn AI gereedschapskist
            </h1>
          </div>
          <span className="rounded-full border border-[#bfc7cf]/60 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#40484e]">
            Vertrouwelijk
          </span>
        </header>

        <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_8px_40px_rgba(0,101,139,0.06)] md:p-8">
          <div className="mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#00658b]/70">
              Toolregistratie
            </p>
            <h2 className="text-2xl font-extrabold leading-tight text-[#00658b]">
              Welke AI-tool gebruik je in je dagelijkse werk?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#40484e]">
              Voor deze minimale slice registreren we ChatGPT met een vaste
              toepassing, context en accounttype.
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-[#00658b] bg-[#c4e7ff]/35 p-4">
            <label className="flex items-center gap-4">
              <input
                checked
                className="h-5 w-5 accent-[#00658b]"
                name="tool"
                readOnly
                type="radio"
              />
              <div>
                <p className="font-bold text-[#181c1e]">ChatGPT</p>
                <p className="text-sm text-[#40484e]">
                  Toepassing: drafting · Context: internal_work · Account:
                  personal_free
                </p>
              </div>
            </label>
          </div>

          {error ? (
            <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <section className="mb-6 grid gap-3">
            <StepRow label="save_tool" state={steps.tool} />
            <StepRow label="save_tool_use_case" state={steps.useCase} />
            <StepRow
              label="save_tool_use_case_context"
              state={steps.context}
            />
            <StepRow label="save_tool_account" state={steps.account} />
          </section>

          <section className="mb-6 rounded-2xl border border-[#bfc7cf]/50 bg-white/80 p-4 text-sm">
            <p>
              <span className="font-semibold">Run ID:</span>{" "}
              <span className="font-mono">{runId}</span>
            </p>
            <p className="mt-2 text-[#40484e]">
              Submission token blijft alleen in respondent session state.
            </p>
          </section>

          <div className="flex items-center justify-between gap-3 border-t border-[#bfc7cf]/30 pt-6">
            <a
              className="inline-flex h-11 items-center rounded-full border border-[#bfc7cf] px-6 text-sm font-bold text-[#40484e]"
              href="/survey/profile"
            >
              Vorige
            </a>
            <button
              className="inline-flex h-11 items-center rounded-full bg-[#00658b] px-7 text-sm font-bold text-white shadow-lg transition hover:bg-[#004c6a] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() => {
                void handleSaveToolFlow();
              }}
              type="button"
            >
              {isSaving ? "Opslaan..." : "Tool opslaan en verder"}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

function StepRow({ label, state }: { label: string; state: StepState }) {
  return (
    <div className="grid gap-2 rounded-xl border border-[#bfc7cf]/50 bg-white px-4 py-3 sm:grid-cols-[220px_90px_1fr] sm:items-center">
      <span className="font-mono text-sm font-semibold text-[#181c1e]">
        {label}
      </span>
      <span
        className="w-max rounded-full border border-[#bfc7cf]/60 px-2.5 py-1 text-xs font-semibold text-[#40484e]"
        data-status={state.status}
      >
        {state.status}
      </span>
      <span className="break-words text-sm text-[#40484e]">{state.message}</span>
    </div>
  );
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
