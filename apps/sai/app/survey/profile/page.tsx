"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  RunIdCard,
  SurveyFooterActions,
  SurveyQuestionBlock,
  SurveyStepLayout,
  SurveySummaryGrid,
  SurveySummaryItem,
  ValidationMessage,
} from "@/components/survey-ui";
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

type ProfileValidationErrors = Partial<
  Record<
    | "departmentCode"
    | "departmentOtherText"
    | "aiFrequencyCode"
    | "noAiReasonCode",
    string
  >
>;

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
  const [validationErrors, setValidationErrors] =
    useState<ProfileValidationErrors>({});

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

    setError(null);
    setValidationErrors({});

    const nextValidationErrors = validateProfileForm({
      aiFrequencyCode,
      departmentOtherText,
      noAiReasonCode,
      selectedVakgebied,
    });

    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors);
      setError("Controleer de gemarkeerde profielvragen voordat je doorgaat.");
      return;
    }

    setIsSaving(true);

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
      <EmptySurveyState>
        Start eerst een scan zodat de respondent session state beschikbaar is.
      </EmptySurveyState>
    );
  }

  return (
    <SurveyStepLayout
      completedSteps={completedSteps}
      currentStep="profile"
      eyebrow="Jouw profiel"
      intro="Kies kort je werkcontext en hoe je AI nu gebruikt. We vragen alleen wat nodig is om de scan goed te duiden."
      maxWidthClassName="max-w-2xl"
      title="Eerst kort je werkcontext en AI-gebruik"
    >

          <ProfileAnswerSummary
            departmentLabel={getOptionLabel(
              departmentOptions,
              selectedVakgebied,
            )}
            frequencyLabel={getOptionLabel(aiFrequencyOptions, aiFrequencyCode)}
            optionalAnswersCount={countOptionalProfileAnswers([
              dataAwarenessCode,
              anonymizationBehaviorCode,
              browserExtensionUsageCode,
              automationUsageCode,
              aiPolicyAwarenessCode,
              aiSkillLevelCode,
              processingOutputCode,
              futureUsecasesText,
            ])}
          />

          <form
            className="grid gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <SurveyQuestionBlock
              error={
                validationErrors.departmentCode ??
                validationErrors.departmentOtherText
              }
              helpText="Kies het domein dat het beste aansluit bij jouw rol of expertise."
              required
              title="Binnen welk vakgebied ben je voornamelijk actief?"
            >
              <div className="grid gap-2 md:grid-cols-2">
                {departmentOptions.map((option: SurveyOption) => (
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:shadow-[0_4px_12px_rgba(0,101,139,0.06)] ${
                      selectedVakgebied === option.code
                        ? "border-[#00658b] bg-[#f1f4f6]"
                        : "border-[#bfc7cf] bg-white"
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
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#181c1e]">
                        {option.label}
                      </span>
                      {option.description ? (
                        <span className="mt-1 block break-words text-xs leading-5 text-[#40484e]">
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
                    className="h-11 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
                    onChange={(event) =>
                      setDepartmentOtherText(event.target.value)
                    }
                    value={departmentOtherText}
                  />
                  {validationErrors.departmentOtherText ? (
                    <span className="text-xs font-medium text-red-700">
                      {validationErrors.departmentOtherText}
                    </span>
                  ) : null}
                </label>
              ) : null}
            </SurveyQuestionBlock>

            <SurveyQuestionBlock
              error={
                validationErrors.aiFrequencyCode ??
                validationErrors.noAiReasonCode
              }
              helpText="Frequentie is een exposure-signaal in de V8.1-methodiek."
              required
              title="Hoe vaak gebruik je AI-tools voor je werk?"
            >
              <SelectField
                label="AI-gebruik frequentie"
                onChange={setAiFrequencyCode}
                options={aiFrequencyOptions}
                required
                value={aiFrequencyCode}
              />
              {aiFrequencyCode === "never" ? (
                <SelectField
                  allowEmpty
                  label="Belangrijkste reden"
                  onChange={setNoAiReasonCode}
                  options={noAiReasonOptions}
                  required
                  value={noAiReasonCode}
                />
              ) : null}
            </SurveyQuestionBlock>

            <SurveyQuestionBlock
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
            </SurveyQuestionBlock>

            <SurveyQuestionBlock
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
            </SurveyQuestionBlock>

            <SurveyQuestionBlock
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
            </SurveyQuestionBlock>

            <SurveyQuestionBlock
              helpText="Vrije tekst is optioneel. Vul geen namen of gevoelige persoonsgegevens in."
              title="Welke werkzaamheden lenen zich volgens jou goed voor AI-ondersteuning?"
            >
              <textarea
                className="min-h-28 w-full min-w-0 rounded-xl border border-[#bfc7cf] bg-white px-3 py-2 text-sm outline-none focus:border-[#00658b]"
                onChange={(event) => setFutureUsecasesText(event.target.value)}
                placeholder="Bijvoorbeeld: conceptteksten, samenvatten, analyseren..."
                value={futureUsecasesText}
              />
            </SurveyQuestionBlock>

            {error ? (
              <ValidationMessage>{error}</ValidationMessage>
            ) : null}

            <RunIdCard runId={sessionView.runId} />

            <SurveyFooterActions backHref="/survey">
              <PrimarySurveyButton
                disabled={isSaving || !selectedVakgebied || !aiFrequencyCode}
                isBusy={isSaving}
                type="submit"
              >
                {isSaving ? "Opslaan..." : "Verder"}
              </PrimarySurveyButton>
            </SurveyFooterActions>
          </form>
    </SurveyStepLayout>
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

function validateProfileForm({
  aiFrequencyCode,
  departmentOtherText,
  noAiReasonCode,
  selectedVakgebied,
}: {
  aiFrequencyCode: string;
  departmentOtherText: string;
  noAiReasonCode: string;
  selectedVakgebied: string;
}): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};

  if (!selectedVakgebied) {
    errors.departmentCode = "Kies een vakgebied.";
  }

  if (selectedVakgebied === "anders" && !departmentOtherText.trim()) {
    errors.departmentOtherText = "Vul jouw vakgebied in.";
  }

  if (!aiFrequencyCode) {
    errors.aiFrequencyCode = "Kies hoe vaak je AI-tools gebruikt.";
  }

  if (aiFrequencyCode === "never" && !noAiReasonCode) {
    errors.noAiReasonCode = "Kies waarom je AI nog niet gebruikt.";
  }

  return errors;
}

function getOptionLabel(options: SurveyOption[], code: string) {
  return options.find((option) => option.code === code)?.label ?? "Niet gekozen";
}

function countOptionalProfileAnswers(values: string[]) {
  return values.filter((value) => value.trim().length > 0).length;
}

function ProfileAnswerSummary({
  departmentLabel,
  frequencyLabel,
  optionalAnswersCount,
}: {
  departmentLabel: string;
  frequencyLabel: string;
  optionalAnswersCount: number;
}) {
  return (
    <SurveySummaryGrid className="mb-6">
      <SurveySummaryItem label="Vakgebied" value={departmentLabel} />
      <SurveySummaryItem label="AI-gebruik" value={frequencyLabel} />
      <SurveySummaryItem
        label="Aanvullend"
        value={`${optionalAnswersCount} ingevuld`}
      />
    </SurveySummaryGrid>
  );
}

function SelectField({
  allowEmpty = false,
  label,
  onChange,
  options,
  required = false,
  value,
}: {
  allowEmpty?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: SurveyOption[];
  required?: boolean;
  value: string;
}) {
  return (
    <label className="grid min-w-0 max-w-full gap-2 text-sm font-semibold text-[#181c1e]">
      <span>
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </span>
      <select
        className="h-11 w-full min-w-0 max-w-full rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
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
