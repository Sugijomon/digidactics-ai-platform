"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  SurveyFooterActions,
  SurveyPageShell,
  SurveyStepLayout,
  SurveySummaryGrid,
  SurveySummaryItem,
  ValidationMessage,
} from "@/components/survey-ui";
import { completeSurveyRun, setAmbassadorOptIn } from "@/lib/sai-rpc/client";
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

export default function SurveyCompletePage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(
    null,
  );
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [savedTools, setSavedTools] = useState<StoredSurveyTool[]>([]);
  const [noToolsExitPath, setNoToolsExitPath] = useState(false);
  const [ambassadorChoice, setAmbassadorChoice] = useState<"ja" | "nee" | null>(
    null,
  );
  const [ambassadorEmail, setAmbassadorEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailSaveMessage, setEmailSaveMessage] = useState("");
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
          "We hebben je teruggezet naar de eerstvolgende open stap.",
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
      setNoToolsExitPath(Boolean(storedSession.noToolsExitPath));
    });
  }, [router]);

  async function handleCompleteSurvey() {
    if (!surveySession) {
      setError("Geen actieve scan gevonden. Start de scan opnieuw.");
      return;
    }

    if (savedTools.length === 0 && !noToolsExitPath) {
      setError("Registreer minimaal een AI-tool voordat je de scan afrondt.");
      return;
    }

    if (!ambassadorChoice) {
      setError("Kies of je wilt meedenken als AI-ambassadeur.");
      return;
    }

    if (ambassadorChoice === "ja" && !isValidEmail(ambassadorEmail)) {
      setError("Vul een geldig e-mailadres in voor de ambassadeur opt-in.");
      return;
    }

    if (ambassadorChoice === "ja" && !emailSaved) {
      setError("Sla je e-mailadres eerst op voordat je de scan afrondt.");
      return;
    }

    setIsCompleting(true);
    setError(null);

    if (ambassadorChoice === "ja") {
      const optInResult = await setAmbassadorOptIn(
        surveySession,
        ambassadorEmail,
      );

      if (!optInResult.ok) {
        setError(formatRpcError(optInResult.error));
        setIsCompleting(false);
        return;
      }
    }

    const completeResult = await completeSurveyRun(surveySession);

    if (!completeResult.ok) {
      setError(formatRpcError(completeResult.error));
      setIsCompleting(false);
      return;
    }

    markSurveyStepCompleted("complete");
    clearSurveySession();
    setSurveySession(null);
    setIsFinished(true);
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
              value={
                noToolsExitPath
                  ? "Geen tools gebruikt"
                  : `${savedTools.length} geregistreerd`
              }
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
      eyebrow="Afronding"
      intro="Je antwoorden zijn bijna klaar om veilig en anoniem opgeslagen te worden. Je kunt vrijwillig aangeven of je wilt meedenken over AI binnen de organisatie."
      maxWidthClassName="max-w-3xl"
      title="Bedankt voor je deelname"
    >
      <div className="grid min-w-0 gap-6">
        <CompletionOverview
          noToolsExitPath={noToolsExitPath}
          savedTools={savedTools}
        />

        <AmbassadorOptIn
          choice={ambassadorChoice}
          email={ambassadorEmail}
          emailSaved={emailSaved}
          isDisabled={isCompleting}
          onChoiceChange={(choice) => {
            setAmbassadorChoice(choice);
            setError(null);
          }}
          onEmailChange={(email) => {
            setAmbassadorEmail(email);
            setEmailSaved(false);
            setEmailSaveMessage("");
          }}
          onSaveEmail={() => {
            const isValid = isValidEmail(ambassadorEmail);
            setEmailSaved(isValid);
            setEmailSaveMessage(
              isValid
                ? "Fijn dat je wilt meedenken! Je e-mailadres is succesvol geregistreerd."
                : "Vul een geldig e-mailadres in.",
            );
          }}
          saveMessage={emailSaveMessage}
        />

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        <SurveyFooterActions backHref="/survey/future">
          <PrimarySurveyButton
            disabled={isCompleting || (savedTools.length === 0 && !noToolsExitPath)}
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
  noToolsExitPath,
  savedTools,
}: {
  noToolsExitPath: boolean;
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
            {noToolsExitPath
              ? "Je hebt aangegeven dat je nu geen AI-tools gebruikt"
              : "Controleer je toolregistratie"}
          </h2>
          <p className="mt-2 max-w-2xl break-words leading-6 text-[#40484e]">
            {noToolsExitPath
              ? "Na afronden wordt de respondentensessie gesloten en nemen we je antwoorden mee in het groepsbeeld."
              : "Na afronden wordt de respondentensessie gesloten en verdwijnt de lokale sessiesleutel uit deze browser."}
          </p>
        </div>
        <span className="rounded-full border border-[#00658b]/20 bg-white px-3 py-1 text-xs font-extrabold text-[#00658b]">
          {noToolsExitPath
            ? "Geen tools"
            : `${savedTools.length} tool${savedTools.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <SurveySummaryGrid
        className="border-white/70 bg-white/70"
        columnsClassName="md:grid-cols-3"
      >
        <SurveySummaryItem
          label="Geregistreerd"
          value={
            noToolsExitPath
              ? "Geen tools"
              : `${savedTools.length} tool${savedTools.length === 1 ? "" : "s"}`
          }
        />
        <SurveySummaryItem
          label="Accountstatus"
          value={
            noToolsExitPath
              ? "Niet van toepassing"
              : `${accountTypes.size} type${accountTypes.size === 1 ? "" : "s"}`
          }
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

function AmbassadorOptIn({
  choice,
  email,
  emailSaved,
  isDisabled,
  onChoiceChange,
  onEmailChange,
  onSaveEmail,
  saveMessage,
}: {
  choice: "ja" | "nee" | null;
  email: string;
  emailSaved: boolean;
  isDisabled: boolean;
  onChoiceChange: (choice: "ja" | "nee") => void;
  onEmailChange: (email: string) => void;
  onSaveEmail: () => void;
  saveMessage: string;
}) {
  return (
    <section className="grid gap-4 rounded-[1.6rem] border border-[#c4e7ff] bg-[#f3fbff] p-5 text-sm">
      <div>
        <h2 className="text-xl font-extrabold text-[#00658b]">
          Wil je meedenken als AI-ambassadeur?
        </h2>
        <p className="mt-2 leading-6 text-[#40484e]">
          Dit is vrijwillig. Alleen als je ja kiest, bewaren we je e-mailadres
          apart van de anonieme scanantwoorden.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className={`h-12 rounded-full border px-5 text-sm font-extrabold transition ${
            choice === "ja"
              ? "border-[#00658b] bg-[#00658b] text-white"
              : "border-[#cfe8f7] bg-white text-[#0b5f81] hover:bg-[#eef8ff]"
          }`}
          disabled={isDisabled}
          onClick={() => onChoiceChange("ja")}
          type="button"
        >
          Ja, lijkt me leuk
        </button>
        <button
          className={`h-12 rounded-full border px-5 text-sm font-extrabold transition ${
            choice === "nee"
              ? "border-[#00658b] bg-[#00658b] text-white"
              : "border-[#bfc7cf] bg-white text-[#40484e] hover:bg-[#f1f4f6]"
          }`}
          disabled={isDisabled}
          onClick={() => onChoiceChange("nee")}
          type="button"
        >
          Nee, liever niet
        </button>
      </div>

      {choice === "ja" ? (
        <div className="grid gap-2 rounded-2xl border border-white/80 bg-white p-4">
          <label className="grid gap-2 font-semibold text-[#181c1e]">
            E-mailadres
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="h-11 min-w-0 flex-1 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
                disabled={isDisabled}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="naam@organisatie.nl"
                type="email"
                value={email}
              />
              <button
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#00658b] px-5 text-sm font-extrabold text-white disabled:opacity-50"
                disabled={isDisabled || !isValidEmail(email)}
                onClick={onSaveEmail}
                type="button"
              >
                Opslaan
              </button>
            </div>
          </label>
          {saveMessage ? (
            <p
              className={`text-xs font-bold ${
                emailSaved ? "text-[#527a1b]" : "text-[#00658b]"
              }`}
            >
              {saveMessage}
            </p>
          ) : null}
        </div>
      ) : null}
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

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function shortRunId(runId: string) {
  return `${runId.slice(0, 8)}...${runId.slice(-4)}`;
}
