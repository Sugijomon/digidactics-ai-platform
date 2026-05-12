"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PrimarySurveyButton,
  SurveyGlassCard,
  SurveyPageShell,
  ValidationMessage,
} from "@/components/survey-ui";
import { startSurveyRun } from "@/lib/sai-rpc/client";
import {
  readSurveySession,
  storeSurveySession,
  type StoredSurveySession,
} from "@/lib/sai-rpc/session";
import type { RpcError } from "@/lib/sai-rpc/types";
import { getResumeStep, surveySteps } from "@/lib/sai-survey/flow";

const DEFAULT_WAVE_TOKEN = "sai-smoke-wave-token";

type ResumeSurveyView = {
  completedCount: number;
  href: string;
  savedToolCount: number;
  startedAtLabel: string;
  stepLabel: string;
  totalSteps: number;
};

export default function SurveyStartPage() {
  const router = useRouter();
  const [waveToken, setWaveToken] = useState(DEFAULT_WAVE_TOKEN);
  const [resumeSurvey, setResumeSurvey] = useState<ResumeSurveyView | null>(
    null,
  );
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (storedSession) {
        setResumeSurvey(getResumeSurveyView(storedSession));
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
    <SurveyPageShell badge="Intern Onderzoek" maxWidthClassName="max-w-4xl">
      <div className="flex min-h-[calc(100vh-9rem)] min-w-0 flex-col justify-center py-6">
        <div className="mx-auto mb-10 min-w-0 max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e5c687] bg-[#faf5e8] px-3.5 py-1.5 text-xs font-bold text-[#ca8a04] shadow-sm">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#ca8a04]" />
            Scan is open
          </div>

          <h1 className="mb-4 max-w-full break-words text-[2rem] font-extrabold leading-tight text-[#00658b] sm:text-4xl md:text-5xl">
            Breng{" "}
            <span className="bg-gradient-to-r from-[#00658b] to-[#396379] bg-clip-text text-transparent">
              jouw AI-gebruik
            </span>{" "}
            veilig in kaart
          </h1>
          <p className="mx-auto max-w-xl break-words text-base leading-7 text-[#40484e] md:text-lg">
            AI-tools bieden kansen, maar roepen ook vragen op over
            dataveiligheid. Met deze korte scan brengen we in kaart welke tools
            we gebruiken, zodat we veilige faciliteiten, licenties en
            ondersteuning goed kunnen regelen.
          </p>
        </div>

        <div className="mb-10 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
          <IntroCard
            accent="primary"
            title="Wat levert het op?"
            text="Gerichter investeren in zakelijke AI-licenties en passende trainingen."
          />
          <IntroCard
            accent="green"
            title="Privacy & Veiligheid"
            text="Inzicht in datastromen helpt datalekken via onbeveiligde tools voorkomen."
          />
          <IntroCard
            accent="secondary"
            title="Bouw mee"
            text="Jouw feedback bepaalt welke AI-tools en werkwijzen ondersteuning nodig hebben."
          />
        </div>

        <details className="mx-auto mb-10 w-full max-w-full rounded-[1.25rem] border border-[#bfc7cf]/50 bg-white p-1 shadow-sm md:max-w-2xl">
          <summary className="flex cursor-pointer items-center gap-3 rounded-xl p-3 text-sm font-bold text-[#181c1e] hover:bg-[#f1f4f6]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ebeef0] text-[#40484e]">
              i
            </span>
            Jouw privacy is gewaarborgd
          </summary>
          <div className="space-y-3 px-4 pb-4 pt-2 text-sm leading-6 text-[#40484e]">
            <p>
              Geen controle, maar inzicht. Het doel is niet om te kijken wie wat
              doet, maar om te begrijpen wat de organisatie nodig heeft.
            </p>
            <p>
              Resultaten worden op groepsniveau geanalyseerd. Aan het einde kun
              je vrijwillig kiezen of je wilt meedenken als AI-ambassadeur.
            </p>
          </div>
        </details>

        <SurveyGlassCard className="mx-auto grid w-full max-w-full gap-4 p-5 md:max-w-xl md:p-6">
          <label className="grid gap-2 text-sm font-semibold text-[#181c1e]">
            Toegangscode
            <input
              className="h-11 rounded-xl border border-[#bfc7cf] bg-white px-3 font-mono text-sm outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
              value={waveToken}
              onChange={(event) => setWaveToken(event.target.value)}
            />
          </label>

          {error ? <ValidationMessage>{error}</ValidationMessage> : null}

          <PrimarySurveyButton
            disabled={isStarting || !waveToken.trim()}
            isBusy={isStarting}
            onClick={handleStartSurvey}
          >
            {isStarting ? "Scan starten..." : "Start de scan"}
          </PrimarySurveyButton>
          {resumeSurvey ? (
            <ResumeSurveyCard resumeSurvey={resumeSurvey} />
          ) : null}
          <p className="text-center text-xs font-medium text-[#40484e]">
            Duurt ca. 8-10 minuten - Anoniem - Veilig opgeslagen
          </p>
        </SurveyGlassCard>
      </div>

      <footer className="py-6 text-center text-xs font-semibold uppercase tracking-widest text-[#6993aa]">
        Powered by Projectgroep AI
      </footer>
    </SurveyPageShell>
  );
}

function IntroCard({
  accent,
  title,
  text,
}: {
  accent: "primary" | "green" | "secondary";
  title: string;
  text: string;
}) {
  const styles = {
    primary: {
      color: "#00658b",
      background: "#c4e7ff",
      icon: "!",
    },
    green: {
      color: "#527a1b",
      background: "#eef7e1",
      icon: "OK",
    },
    secondary: {
      color: "#396379",
      background: "#bae6ff",
      icon: "+",
    },
  }[accent];

  return (
    <article className="min-w-0 rounded-[1.25rem] border border-white/80 bg-white/85 p-5 shadow-[0_4px_20px_rgba(0,101,139,0.04)] backdrop-blur transition duration-300 hover:-translate-y-1">
      <div
        className="mb-3 grid h-10 w-10 place-items-center rounded-xl font-extrabold"
        style={{ backgroundColor: styles.background, color: styles.color }}
      >
        {styles.icon}
      </div>
      <h2 className="mb-1.5 font-bold" style={{ color: styles.color }}>
        {title}
      </h2>
      <p className="break-words text-sm leading-6 text-[#40484e]">{text}</p>
    </article>
  );
}

function formatRpcError(error: RpcError) {
  if (error.code === "invalid_or_closed_wave") {
    return "Deze toegangscode is niet actief of verlopen. Controleer de code of vraag een nieuwe toegangscode aan.";
  }

  if (error.code === "missing_supabase_env") {
    return "De scan kan lokaal niet starten omdat de Supabase instellingen ontbreken.";
  }

  return [error.code, error.message].filter(Boolean).join(": ");
}

function ResumeSurveyCard({
  resumeSurvey,
}: {
  resumeSurvey: ResumeSurveyView;
}) {
  return (
    <section className="grid gap-3 rounded-2xl border border-[#c4e7ff] bg-[#f3fbff] p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[#00658b]/70">
            Actieve scan gevonden
          </p>
          <h2 className="mt-1 break-words text-base font-extrabold text-[#00658b]">
            Verder bij {resumeSurvey.stepLabel}
          </h2>
        </div>
        <span className="rounded-full border border-[#00658b]/20 bg-white px-3 py-1 text-xs font-extrabold text-[#00658b]">
          {resumeSurvey.completedCount}/{resumeSurvey.totalSteps} klaar
        </span>
      </div>
      <div className="grid gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-medium text-[#40484e] sm:grid-cols-2">
        <p>{resumeSurvey.savedToolCount} tools opgeslagen</p>
        <p>Gestart: {resumeSurvey.startedAtLabel}</p>
      </div>
      <a
        className="inline-flex h-11 items-center justify-center rounded-full border border-[#00658b] bg-white px-6 text-sm font-bold text-[#00658b] transition hover:bg-[#c4e7ff]/30"
        href={resumeSurvey.href}
      >
        Hervat actieve scan
      </a>
    </section>
  );
}

function getResumeSurveyView(
  storedSession: StoredSurveySession,
): ResumeSurveyView {
  const resumeStep = getResumeStep(storedSession);

  return {
    completedCount: storedSession.completedSteps?.length ?? 0,
    href: resumeStep.href,
    savedToolCount: storedSession.savedTools?.length ?? 0,
    startedAtLabel: formatStartedAt(storedSession.startedAt),
    stepLabel: resumeStep.label,
    totalSteps: surveySteps.length,
  };
}

function formatStartedAt(startedAt: string) {
  const date = new Date(startedAt);

  if (Number.isNaN(date.getTime())) {
    return "onbekend";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(date);
}
