"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SurveyProgress } from "@/components/survey-progress";
import { saveMotivations } from "@/lib/sai-rpc/client";
import {
  markSurveyStepCompleted,
  readSurveySession,
  updateSurveyCurrentStep,
} from "@/lib/sai-rpc/session";
import type { RpcError, SurveySession } from "@/lib/sai-rpc/types";
import {
  canAccessSurveyStep,
  getResumeStep,
  type SurveyStepId,
} from "@/lib/sai-survey/flow";
import {
  motivationOptions,
  type SurveyOption,
} from "@/lib/sai-survey/options";

export default function SurveyMotivationsPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(
    null,
  );
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [selectedMotivations, setSelectedMotivations] = useState([
    "tijdswinst",
    "kwaliteitsverbetering",
  ]);
  const [otherText, setOtherText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      if (!canAccessSurveyStep(storedSession, "motivations")) {
        router.replace(getResumeStep(storedSession).href);
        return;
      }

      updateSurveyCurrentStep("motivations");
      setSurveySession({
        runId: storedSession.runId,
        submissionToken: storedSession.submissionToken,
      });
      setRunId(storedSession.runId);
      setCompletedSteps(storedSession.completedSteps ?? []);
    });
  }, [router]);

  async function handleSaveMotivations() {
    if (!surveySession) {
      setError("Geen actieve respondent session gevonden. Start de scan opnieuw.");
      return;
    }

    if (selectedMotivations.length === 0) {
      setError("Kies minimaal een motivatie voordat je doorgaat.");
      return;
    }

    if (selectedMotivations.includes("anders") && !otherText.trim()) {
      setError("Vul kort in wat je andere motivatie is.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await saveMotivations(
      surveySession,
      selectedMotivations.map((code) => ({
        code,
        other_text: code === "anders" ? otherText : undefined,
      })),
    );

    if (!result.ok) {
      setError(formatRpcError(result.error));
      setIsSaving(false);
      return;
    }

    markSurveyStepCompleted("motivations");
    updateSurveyCurrentStep("data");
    router.push("/survey/data");
  }

  if (!runId) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7fafc] px-6 text-[#181c1e]">
        <section className="max-w-md rounded-2xl border border-[#bfc7cf]/50 bg-white p-6 text-center shadow-sm">
          <h1 className="mb-2 text-2xl font-bold">Geen actieve scan</h1>
          <p className="mb-5 text-sm leading-6 text-[#40484e]">
            Start eerst een scan en sla de profielstap op voordat je motivaties
            invult.
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
            <p className="text-sm font-semibold text-[#6993aa]">Stap 2 van 6</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#00658b]">
              Motivatie
            </h1>
          </div>
          <span className="rounded-full border border-[#bfc7cf]/60 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#40484e]">
            Vertrouwelijk
          </span>
        </header>

        <SurveyProgress
          completedSteps={completedSteps}
          currentStep="motivations"
        />

        <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_8px_40px_rgba(0,101,139,0.06)] md:p-8">
          <div className="mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#00658b]/70">
              Gebruikssignaal
            </p>
            <h2 className="text-2xl font-extrabold leading-tight text-[#00658b]">
              Waarom gebruik je AI-tools in je werk?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#40484e]">
              Kies een of meer motivaties. Deze stap schrijft via
              `save_motivations` en toont je submission token niet.
            </p>
          </div>

          <form
            className="grid gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveMotivations();
            }}
          >
            <MotivationGroup
              onChange={setSelectedMotivations}
              options={motivationOptions}
              selectedCodes={selectedMotivations}
            />

            {selectedMotivations.includes("anders") ? (
              <label className="grid gap-2 text-sm font-semibold text-[#181c1e]">
                Andere motivatie
                <input
                  className="h-11 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
                  onChange={(event) => setOtherText(event.target.value)}
                  placeholder="Bijvoorbeeld: verplicht vanuit project of klantvraag"
                  type="text"
                  value={otherText}
                />
              </label>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <section className="rounded-2xl border border-[#bfc7cf]/50 bg-white/80 p-4 text-sm">
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
                type="submit"
              >
                {isSaving ? "Opslaan..." : "Verder"}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}

function MotivationGroup({
  onChange,
  options,
  selectedCodes,
}: {
  onChange: (codes: string[]) => void;
  options: SurveyOption[];
  selectedCodes: string[];
}) {
  function toggleCode(code: string) {
    onChange(
      selectedCodes.includes(code)
        ? selectedCodes.filter((selectedCode) => selectedCode !== code)
        : [...selectedCodes, code],
    );
  }

  return (
    <section className="grid gap-4 rounded-2xl border border-[#bfc7cf]/50 bg-white/70 p-4">
      <div>
        <h3 className="font-bold text-[#00658b]">
          Motivaties <span className="text-red-600">*</span>
        </h3>
        <p className="mt-1 text-sm leading-6 text-[#40484e]">
          Meerdere antwoorden zijn mogelijk.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {options.map((option) => (
          <label
            className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:bg-[#c4e7ff]/20 ${
              selectedCodes.includes(option.code)
                ? "border-[#00658b] bg-[#c4e7ff]/40"
                : "border-[#bfc7cf] bg-white/70"
            }`}
            key={option.code}
          >
            <input
              checked={selectedCodes.includes(option.code)}
              className="mt-0.5 h-5 w-5 accent-[#00658b]"
              onChange={() => toggleCode(option.code)}
              type="checkbox"
              value={option.code}
            />
            <span>
              <span className="block text-sm font-semibold text-[#181c1e]">
                {option.label}
              </span>
              {option.description ? (
                <span className="mt-1 block text-xs leading-5 text-[#40484e]">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
