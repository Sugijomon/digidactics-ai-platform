"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveProfile } from "@/lib/sai-rpc/client";
import {
  readSurveySession,
  updateSurveyCurrentStep,
} from "@/lib/sai-rpc/session";
import type { RpcError, SurveySession } from "@/lib/sai-rpc/types";

type ProfileSessionView = {
  runId: string;
  startedAt: string;
};

const VAKGEBIED_OPTIONS = [
  { code: "it_data_development", label: "IT, data of development" },
  { code: "marketing_communicatie", label: "Marketing of communicatie" },
  { code: "hr_recruitment", label: "HR of recruitment" },
  { code: "finance_legal", label: "Finance of legal" },
  { code: "sales_account", label: "Sales of accountmanagement" },
  { code: "operations", label: "Operations" },
  { code: "directie_management", label: "Directie of management" },
  { code: "anders", label: "Anders" },
];

export default function SurveyProfilePage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(
    null,
  );
  const [sessionView, setSessionView] = useState<ProfileSessionView | null>(
    null,
  );
  const [selectedVakgebied, setSelectedVakgebied] = useState(
    "it_data_development",
  );
  const [aiFrequencyCode, setAiFrequencyCode] = useState("weekly");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const surveySession = readSurveySession();

      if (!surveySession) {
        return;
      }

      updateSurveyCurrentStep("profile");
      setSurveySession({
        runId: surveySession.runId,
        submissionToken: surveySession.submissionToken,
      });
      setSessionView({
        runId: surveySession.runId,
        startedAt: surveySession.startedAt,
      });
    });
  }, []);

  async function handleSubmit() {
    if (!surveySession) {
      setError("Geen actieve respondent session gevonden. Start de scan opnieuw.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await saveProfile(surveySession, {
      department_code: selectedVakgebied,
      ai_frequency_code: aiFrequencyCode,
      future_usecases_text: "Frontend respondent slice",
    });

    if (!result.ok) {
      setError(formatRpcError(result.error));
      setIsSaving(false);
      return;
    }

    updateSurveyCurrentStep("tools");
    router.push("/survey/tools");
  }

  if (!sessionView) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7fafc] px-6 text-[#181c1e]">
        <section className="max-w-md rounded-2xl border border-[#bfc7cf]/50 bg-white p-6 text-center shadow-sm">
          <h1 className="mb-2 text-2xl font-bold">Geen actieve scan</h1>
          <p className="mb-5 text-sm leading-6 text-[#40484e]">
            Start eerst een scan zodat de respondent session state beschikbaar
            is.
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
      <section className="mx-auto grid w-full max-w-2xl gap-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#00658b] text-2xl font-bold text-white shadow-sm">
              S
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Shadow AI Scan
              </h1>
              <p className="text-sm font-medium text-[#6993aa]">
                Veilig innoveren met AI
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[#bfc7cf]/60 bg-white/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#40484e] shadow-sm">
            Vertrouwelijk
          </span>
        </header>

        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-1.5">
            <div className="h-1.5 flex-1 rounded-full bg-[#00658b]" />
            <div className="h-1.5 flex-1 rounded-full bg-[#e5e9eb]" />
            <div className="h-1.5 flex-1 rounded-full bg-[#e5e9eb]" />
            <div className="h-1.5 flex-1 rounded-full bg-[#e5e9eb]" />
            <div className="h-1.5 flex-1 rounded-full bg-[#e5e9eb]" />
          </div>
          <span className="whitespace-nowrap text-xs text-[#40484e]">
            Stap 1 van 5
          </span>
        </div>

        <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_8px_40px_rgba(0,101,139,0.06)] md:p-9">
          <div className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#00658b]/70">
              Jouw werkplek
            </p>
            <h2 className="text-2xl font-extrabold leading-tight text-[#00658b]">
              Binnen welk vakgebied ben je voornamelijk actief?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#40484e]">
              Kies het domein dat het beste aansluit bij jouw rol of expertise,
              ook als je in wisselende projectteams werkt.
            </p>
          </div>

          <form
            className="grid gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="grid gap-2">
              {VAKGEBIED_OPTIONS.map((option) => (
                <label
                  className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:bg-[#c4e7ff]/20 ${
                    selectedVakgebied === option.code
                      ? "border-[#00658b] bg-[#c4e7ff]/40"
                      : "border-[#bfc7cf] bg-white/70"
                  }`}
                  key={option.code}
                >
                  <input
                    checked={selectedVakgebied === option.code}
                    className="h-5 w-5 accent-[#00658b]"
                    name="department_code"
                    onChange={() => setSelectedVakgebied(option.code)}
                    type="radio"
                    value={option.code}
                  />
                  <span className="text-sm font-semibold text-[#181c1e]">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>

            <label className="grid gap-2 text-sm font-semibold text-[#181c1e]">
              AI-gebruik frequentie
              <select
                className="h-11 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm outline-none focus:border-[#00658b]"
                onChange={(event) => setAiFrequencyCode(event.target.value)}
                value={aiFrequencyCode}
              >
                <option value="weekly">Wekelijks</option>
                <option value="daily">Dagelijks</option>
                <option value="monthly">Maandelijks</option>
                <option value="rarely">Zelden</option>
                <option value="never">Nooit</option>
              </select>
            </label>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <section className="rounded-2xl border border-[#bfc7cf]/50 bg-white/80 p-4 text-sm">
              <p>
                <span className="font-semibold">Run ID:</span>{" "}
                <span className="font-mono">{sessionView.runId}</span>
              </p>
              <p className="mt-2 text-[#40484e]">
                Submission token is actief in session state en wordt hier niet
                getoond.
              </p>
            </section>

            <div className="flex items-center justify-between gap-3 border-t border-[#bfc7cf]/30 pt-6">
              <a
                className="inline-flex h-11 items-center rounded-full border border-[#bfc7cf] px-6 text-sm font-bold text-[#40484e]"
                href="/survey"
              >
                Vorige
              </a>
              <button
                className="inline-flex h-11 items-center rounded-full bg-[#00658b] px-7 text-sm font-bold text-white shadow-lg transition hover:bg-[#004c6a] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving || !selectedVakgebied}
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

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
