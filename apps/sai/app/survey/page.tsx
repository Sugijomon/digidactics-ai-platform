"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { startSurveyRun } from "@/lib/sai-rpc/client";
import { readSurveySession, storeSurveySession } from "@/lib/sai-rpc/session";
import type { RpcError } from "@/lib/sai-rpc/types";
import { getResumeStep } from "@/lib/sai-survey/flow";

const DEFAULT_WAVE_TOKEN = "sai-smoke-wave-token";

export default function SurveyStartPage() {
  const router = useRouter();
  const [waveToken, setWaveToken] = useState(DEFAULT_WAVE_TOKEN);
  const [resumeHref, setResumeHref] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (storedSession) {
        setResumeHref(getResumeStep(storedSession).href);
      }
    });
  }, []);

  async function handleStartSurvey() {
    setIsStarting(true);
    setError(null);

    const result = await startSurveyRun(waveToken.trim());

    if (!result.ok) {
      setError(formatRpcError(result.error));
      setIsStarting(false);
      return;
    }

    storeSurveySession(result.data, "profile");
    router.push("/survey/profile");
  }

  return (
    <main className="min-h-screen bg-[#f7fafc] text-[#181c1e]">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-5">
        <header className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#00658b] text-2xl font-bold text-white shadow-sm">
              S
            </div>
            <div>
              <p className="text-2xl font-extrabold tracking-tight text-[#181c1e]">
                Shadow AI Scan
              </p>
              <p className="text-sm font-medium text-[#6993aa]">
                Veilig innoveren met AI
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[#bfc7cf]/60 bg-white px-3 py-1.5 text-xs font-semibold text-[#40484e] shadow-sm">
            Intern Onderzoek
          </span>
        </header>

        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full border border-[#e5c687] bg-[#faf5e8] px-3.5 py-1.5 text-xs font-bold text-[#ca8a04] shadow-sm">
              Scan is open voor de smoke-test wave
            </div>

            <h1 className="mb-4 text-4xl font-extrabold leading-tight text-[#00658b] md:text-5xl">
              Breng jouw AI-gebruik veilig in kaart
            </h1>
            <p className="mx-auto max-w-xl text-base leading-7 text-[#40484e] md:text-lg">
              Met deze korte scan inventariseren we welke AI-tools binnen de
              organisatie worden gebruikt. Jouw input helpt om veilige
              faciliteiten, licenties en ondersteuning goed te regelen.
            </p>
          </div>

          <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            <IntroCard
              color="#00658b"
              title="Wat levert het op?"
              text="Gerichter investeren in zakelijke AI-licenties en passende trainingen."
            />
            <IntroCard
              color="#527a1b"
              title="Privacy & Veiligheid"
              text="Inzicht in datastromen helpt datalekken via onbeveiligde tools voorkomen."
            />
            <IntroCard
              color="#396379"
              title="Bouw mee"
              text="Jouw feedback bepaalt welke AI-tools en werkwijzen ondersteuning nodig hebben."
            />
          </div>

          <details className="mx-auto mb-10 w-full max-w-2xl rounded-2xl border border-[#bfc7cf]/50 bg-white p-1 shadow-sm">
            <summary className="flex cursor-pointer items-center gap-3 rounded-xl p-3 text-sm font-bold text-[#181c1e] hover:bg-[#f1f4f6]">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ebeef0] text-[#40484e]">
                i
              </span>
              Jouw privacy is gewaarborgd
            </summary>
            <div className="space-y-3 px-4 pb-4 pt-2 text-sm leading-6 text-[#40484e]">
              <p>
                Geen controle, maar inzicht. Het doel is niet om te kijken wie
                wat doet, maar om te begrijpen wat de organisatie nodig heeft.
              </p>
              <p>
                Resultaten worden op groepsniveau geanalyseerd. Aan het einde
                kun je vrijwillig kiezen of je wilt meedenken als
                AI-ambassadeur.
              </p>
            </div>
          </details>

          <div className="mx-auto grid w-full max-w-xl gap-4 rounded-2xl border border-[#bfc7cf]/50 bg-white p-5 shadow-sm">
            <label className="grid gap-2 text-sm font-semibold text-[#181c1e]">
              Wave token
              <input
                className="h-11 rounded-lg border border-[#bfc7cf] px-3 font-mono text-sm outline-none focus:border-[#00658b]"
                value={waveToken}
                onChange={(event) => setWaveToken(event.target.value)}
              />
            </label>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#004c6a] px-8 text-base font-bold text-white shadow-lg transition hover:bg-[#003d55] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isStarting || !waveToken.trim()}
              onClick={handleStartSurvey}
              type="button"
            >
              {isStarting ? "Scan starten..." : "Start de scan"}
            </button>
            {resumeHref ? (
              <a
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#00658b] bg-white px-6 text-sm font-bold text-[#00658b] transition hover:bg-[#c4e7ff]/30"
                href={resumeHref}
              >
                Hervat actieve scan
              </a>
            ) : null}
            <p className="text-center text-xs font-medium text-[#40484e]">
              Duurt ca. 8-10 minuten · Anoniem · Geen verplichte velden
            </p>
          </div>
        </div>

        <footer className="py-6 text-center text-xs font-semibold uppercase tracking-widest text-[#6993aa]">
          Powered by Projectgroep AI
        </footer>
      </section>
    </main>
  );
}

function IntroCard({
  color,
  title,
  text,
}: {
  color: string;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-white bg-white/90 p-5 shadow-sm">
      <div
        className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#c4e7ff] font-bold"
        style={{ color }}
      >
        +
      </div>
      <h2 className="mb-1.5 font-bold" style={{ color }}>
        {title}
      </h2>
      <p className="text-sm leading-6 text-[#40484e]">{text}</p>
    </article>
  );
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
