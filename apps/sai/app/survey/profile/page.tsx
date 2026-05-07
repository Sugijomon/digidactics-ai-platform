"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SurveyProgress } from "@/components/survey-progress";
import { saveProfile } from "@/lib/sai-rpc/client";
import {
  markSurveyStepCompleted,
  readSurveySession,
  updateSurveyCurrentStep,
} from "@/lib/sai-rpc/session";
import type { SurveyStepId } from "@/lib/sai-survey/flow";
import {
  aiFrequencyOptions,
  aiPolicyAwarenessOptions,
  aiSkillLevelOptions,
  anonymizationBehaviorOptions,
  automationUsageOptions,
  browserExtensionUsageOptions,
  dataAwarenessOptions,
  departmentOptions,
  noAiReasonOptions,
  processingOutputOptions,
  type SurveyOption,
} from "@/lib/sai-survey/options";
import type {
  RpcError,
  SaveProfilePayload,
  SurveySession,
} from "@/lib/sai-rpc/types";

type ProfileSessionView = {
  runId: string;
  startedAt: string;
};

export default function SurveyProfilePage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(
    null,
  );
  const [sessionView, setSessionView] = useState<ProfileSessionView | null>(
    null,
  );
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [selectedVakgebied, setSelectedVakgebied] =
    useState("it_data_development");
  const [departmentOtherText, setDepartmentOtherText] = useState("");
  const [aiFrequencyCode, setAiFrequencyCode] = useState("weekly");
  const [noAiReasonCode, setNoAiReasonCode] = useState("");
  const [dataAwarenessCode, setDataAwarenessCode] = useState("");
  const [anonymizationBehaviorCode, setAnonymizationBehaviorCode] =
    useState("");
  const [browserExtensionUsageCode, setBrowserExtensionUsageCode] =
    useState("");
  const [automationUsageCode, setAutomationUsageCode] = useState("");
  const [aiPolicyAwarenessCode, setAiPolicyAwarenessCode] = useState("");
  const [aiSkillLevelCode, setAiSkillLevelCode] = useState("");
  const [processingOutputCode, setProcessingOutputCode] = useState("");
  const [futureUsecasesText, setFutureUsecasesText] = useState("");
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
      setCompletedSteps(surveySession.completedSteps ?? []);
    });
  }, []);

  async function handleSubmit() {
    if (!surveySession) {
      setError("Geen actieve respondent session gevonden. Start de scan opnieuw.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload: SaveProfilePayload = {
      department_code: selectedVakgebied,
      ai_frequency_code: aiFrequencyCode,
      future_usecases_text: futureUsecasesText,
    };

    addOptionalProfileField(
      payload,
      "department_other_text",
      selectedVakgebied === "anders" ? departmentOtherText : "",
    );
    addOptionalProfileField(
      payload,
      "no_ai_reason_code",
      aiFrequencyCode === "never" ? noAiReasonCode : "",
    );
    addOptionalProfileField(
      payload,
      "data_awareness_code",
      dataAwarenessCode,
    );
    addOptionalProfileField(
      payload,
      "anonymization_behavior_code",
      anonymizationBehaviorCode,
    );
    addOptionalProfileField(
      payload,
      "browser_extension_usage_code",
      browserExtensionUsageCode,
    );
    addOptionalProfileField(
      payload,
      "automation_usage_code",
      automationUsageCode,
    );
    addOptionalProfileField(
      payload,
      "ai_policy_awareness_code",
      aiPolicyAwarenessCode,
    );
    addOptionalProfileField(payload, "ai_skill_level_code", aiSkillLevelCode);
    addOptionalProfileField(
      payload,
      "processing_output_code",
      processingOutputCode,
    );

    const result = await saveProfile(surveySession, payload);

    if (!result.ok) {
      setError(formatRpcError(result.error));
      setIsSaving(false);
      return;
    }

    markSurveyStepCompleted("profile");
    updateSurveyCurrentStep("motivations");
    router.push("/survey/motivations");
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

        <SurveyProgress
          completedSteps={completedSteps}
          currentStep="profile"
        />

        <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_8px_40px_rgba(0,101,139,0.06)] md:p-9">
          <div className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#00658b]/70">
              Jouw profiel
            </p>
            <h2 className="text-2xl font-extrabold leading-tight text-[#00658b]">
              Eerst kort je werkcontext en AI-gebruik
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#40484e]">
              Deze vragen horen bij het `save_profile` contract. Je antwoorden
              worden als codes opgeslagen, niet als directe persoonsgegevens.
            </p>
          </div>

          <form
            className="grid gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <QuestionBlock
              helpText="Kies het domein dat het beste aansluit bij jouw rol of expertise."
              title="Binnen welk vakgebied ben je voornamelijk actief?"
            >
              <div className="grid gap-2">
                {departmentOptions.map((option: SurveyOption) => (
                  <label
                    className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:bg-[#c4e7ff]/20 ${
                      selectedVakgebied === option.code
                        ? "border-[#00658b] bg-[#c4e7ff]/40"
                        : "border-[#bfc7cf] bg-white/70"
                    } ${option.disabled ? "cursor-not-allowed opacity-60" : ""}`}
                    key={option.code}
                  >
                    <input
                      checked={selectedVakgebied === option.code}
                      className="mt-0.5 h-5 w-5 accent-[#00658b]"
                      disabled={option.disabled}
                      name="department_code"
                      onChange={() => setSelectedVakgebied(option.code)}
                      type="radio"
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
              {selectedVakgebied === "anders" ? (
                <label className="mt-3 grid gap-2 text-sm font-semibold text-[#181c1e]">
                  Vul jouw vakgebied in
                  <input
                    className="h-11 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm outline-none focus:border-[#00658b]"
                    onChange={(event) =>
                      setDepartmentOtherText(event.target.value)
                    }
                    value={departmentOtherText}
                  />
                </label>
              ) : null}
            </QuestionBlock>

            <QuestionBlock
              helpText="Frequentie is een exposure-signaal in de V8.1-methodiek."
              title="Hoe vaak gebruik je AI-tools voor je werk?"
            >
              <SelectField
                label="AI-gebruik frequentie"
                onChange={setAiFrequencyCode}
                options={aiFrequencyOptions}
                value={aiFrequencyCode}
              />
              {aiFrequencyCode === "never" ? (
                <SelectField
                  allowEmpty
                  label="Belangrijkste reden"
                  onChange={setNoAiReasonCode}
                  options={noAiReasonOptions}
                  value={noAiReasonCode}
                />
              ) : null}
            </QuestionBlock>

            <QuestionBlock
              helpText="Deze signalen helpen later bij bewustwording en datahygiëne."
              title="Hoe ga je om met data in AI-tools?"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  allowEmpty
                  label="Bewustzijn over data-opslag"
                  onChange={setDataAwarenessCode}
                  options={dataAwarenessOptions}
                  value={dataAwarenessCode}
                />
                <SelectField
                  allowEmpty
                  label="Anonimiseren van informatie"
                  onChange={setAnonymizationBehaviorCode}
                  options={anonymizationBehaviorOptions}
                  value={anonymizationBehaviorCode}
                />
              </div>
            </QuestionBlock>

            <QuestionBlock
              helpText="Browserextensies en agents zijn additieve exposure-signalen in V8.1."
              title="Gebruik je extensies of automatisering?"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  allowEmpty
                  label="AI-browserextensies"
                  onChange={setBrowserExtensionUsageCode}
                  options={browserExtensionUsageOptions}
                  value={browserExtensionUsageCode}
                />
                <SelectField
                  allowEmpty
                  label="AI-agents of automatisering"
                  onChange={setAutomationUsageCode}
                  options={automationUsageOptions}
                  value={automationUsageCode}
                />
              </div>
            </QuestionBlock>

            <QuestionBlock
              helpText="Deze antwoorden voeden de latere AI-literacy en governance-readiness analyse."
              title="Spelregels, vaardigheid en output"
            >
              <div className="grid gap-4">
                <SelectField
                  allowEmpty
                  label="Bekendheid met AI-spelregels"
                  onChange={setAiPolicyAwarenessCode}
                  options={aiPolicyAwarenessOptions}
                  value={aiPolicyAwarenessCode}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    allowEmpty
                    label="Eigen AI-vaardigheid"
                    onChange={setAiSkillLevelCode}
                    options={aiSkillLevelOptions}
                    value={aiSkillLevelCode}
                  />
                  <SelectField
                    allowEmpty
                    label="Hoe verwerk je AI-output?"
                    onChange={setProcessingOutputCode}
                    options={processingOutputOptions}
                    value={processingOutputCode}
                  />
                </div>
              </div>
            </QuestionBlock>

            <QuestionBlock
              helpText="Vrije tekst is optioneel. Vul geen namen of gevoelige persoonsgegevens in."
              title="Welke werkzaamheden lenen zich volgens jou goed voor AI-ondersteuning?"
            >
              <textarea
                className="min-h-28 rounded-xl border border-[#bfc7cf] bg-white px-3 py-2 text-sm outline-none focus:border-[#00658b]"
                onChange={(event) => setFutureUsecasesText(event.target.value)}
                placeholder="Bijvoorbeeld: conceptteksten, samenvatten, analyseren..."
                value={futureUsecasesText}
              />
            </QuestionBlock>

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
                disabled={isSaving || !selectedVakgebied || !aiFrequencyCode}
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

type OptionalProfileKey = Exclude<
  keyof SaveProfilePayload,
  "department_code" | "ai_frequency_code" | "future_usecases_text"
>;

function addOptionalProfileField(
  payload: SaveProfilePayload,
  key: OptionalProfileKey,
  value: string,
) {
  const normalizedValue = value.trim();

  if (normalizedValue) {
    payload[key] = normalizedValue;
  }
}

function QuestionBlock({
  children,
  helpText,
  title,
}: {
  children: React.ReactNode;
  helpText: string;
  title: string;
}) {
  return (
    <section className="grid gap-4 rounded-2xl border border-[#bfc7cf]/50 bg-white/70 p-4">
      <div>
        <h3 className="font-bold text-[#00658b]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-[#40484e]">{helpText}</p>
      </div>
      {children}
    </section>
  );
}

function SelectField({
  allowEmpty = false,
  label,
  onChange,
  options,
  value,
}: {
  allowEmpty?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: SurveyOption[];
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#181c1e]">
      {label}
      <select
        className="h-11 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm outline-none focus:border-[#00658b]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {allowEmpty ? <option value="">Nog niet invullen</option> : null}
        {options.map((option) => (
          <option
            disabled={option.disabled}
            key={option.code}
            value={option.code}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
