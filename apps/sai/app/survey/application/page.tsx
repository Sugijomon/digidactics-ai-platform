"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { SurveyCheckboxGroup, SurveyRadioGroup } from "@/components/survey-choice-groups";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  SecondarySurveyButton,
  SurveyQuestionBlock,
  SurveyStepLayout,
  SurveySummaryGrid,
  SurveySummaryItem,
  ValidationMessage,
} from "@/components/survey-ui";
import { ToolLogo } from "@/components/tool-logo";
import { saveSurveyApplication } from "@/lib/sai-rpc/client";
import {
  markSurveyStepCompleted,
  readSurveySession,
  storeSurveyGuardNotice,
  updateSurveyCurrentStep,
  updateSurveySession,
  type PendingSurveyTool,
} from "@/lib/sai-rpc/session";
import type {
  RpcError,
  SurveySession,
} from "@/lib/sai-rpc/types";
import {
  canAccessSurveyStep,
  getResumeStep,
  type SurveyStepId,
} from "@/lib/sai-survey/flow";
import {
  aiTransparencyOptions,
  aiVisibilityOptions,
  applicationAccountEnvironmentOptions,
  applicationFrequencyOptions,
  conditionNeedOptions,
  controlReworkOptions,
  dataTypeOptions,
  deviationAuthorityOptions,
  escalationRouteAwarenessOptions,
  nearMissSignalOptions,
  netEffectOptions,
  outputControlOptions,
  outputDestinationOptions,
  peopleImpactOptions,
  shareabilityOptions,
  supportNeedOptions,
  type SurveyOption,
  toolOptions,
  useCaseOptions,
  valueBeneficiaryOptions,
  valueEvidenceOptions,
  valueTypeOptions,
} from "@/lib/sai-survey/options";

const EXCLUSIVE_DATA_CODES = new Set(["none", "niets", "unsure", "onzeker"]);
const EXCLUSIVE_NEAR_MISS_CODES = new Set(["none", "prefer_not_to_answer"]);
const PEOPLE_IMPACT_CODES_WITH_DECISION_CONTEXT = new Set([
  "customers_or_clients",
  "employees_or_candidates",
  "important_decision",
]);
const APPLICATION_SECTION_COUNT = 5;
const applicationSectionLabels = [
  "Praktijkvoorbeeld",
  "Datastroom",
  "Mensimpact",
  "Waarde",
  "Afronding",
];

export default function SurveyApplicationPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(null);
  const [pendingTools, setPendingTools] = useState<PendingSurveyTool[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [selectedToolId, setSelectedToolId] = useState("");
  const [selectedUseCaseId, setSelectedUseCaseId] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [applicationFrequencyCode, setApplicationFrequencyCode] = useState("");
  const [accountEnvironmentCode, setAccountEnvironmentCode] = useState("");
  const [outputDestinationCode, setOutputDestinationCode] = useState("");
  const [outputControlCode, setOutputControlCode] = useState("");
  const [deviationAuthorityCode, setDeviationAuthorityCode] = useState("");
  const [peopleImpactCode, setPeopleImpactCode] = useState("");
  const [aiVisibilityCode, setAiVisibilityCode] = useState("");
  const [transparencyCode, setTransparencyCode] = useState("");
  const [beneficiaryCode, setBeneficiaryCode] = useState("");
  const [netEffectCode, setNetEffectCode] = useState("");
  const [controlReworkCode, setControlReworkCode] = useState("");
  const [shareabilityCode, setShareabilityCode] = useState("");
  const [valueEvidenceCode, setValueEvidenceCode] = useState("");
  const [escalationRouteAwarenessCode, setEscalationRouteAwarenessCode] =
    useState("");
  const [dataTypeCodes, setDataTypeCodes] = useState<string[]>([]);
  const [valueTypeCodes, setValueTypeCodes] = useState<string[]>([]);
  const [conditionNeedCodes, setConditionNeedCodes] = useState<string[]>([]);
  const [nearMissSignalCodes, setNearMissSignalCodes] = useState<string[]>([]);
  const [supportNeedCodes, setSupportNeedCodes] = useState<string[]>([]);
  const [applicationSectionIndex, setApplicationSectionIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTool = useMemo(
    () =>
      pendingTools.find((tool) => tool.surveyToolId === selectedToolId) ??
      pendingTools[0],
    [pendingTools, selectedToolId],
  );

  const selectedToolUseCases = useMemo(
    () => getToolUseCaseChoices(selectedTool),
    [selectedTool],
  );
  const shouldAskDeviationAuthority =
    PEOPLE_IMPACT_CODES_WITH_DECISION_CONTEXT.has(peopleImpactCode);
  const taskPrivacyWarning = getTaskPrivacyWarning(taskDescription);
  const missingRequiredQuestions = getMissingRequiredQuestions();

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      if (!canAccessSurveyStep(storedSession, "application")) {
        storeSurveyGuardNotice(
          "We hebben je teruggezet naar de eerstvolgende open stap.",
        );
        router.replace(getResumeStep(storedSession).href);
        return;
      }

      const nextPendingTools =
        storedSession.pendingTools ??
        (storedSession.pendingTool ? [storedSession.pendingTool] : []);

      if (nextPendingTools.length === 0) {
        storeSurveyGuardNotice(
          "Kies eerst minimaal een tool voordat je een toepassing verdiept.",
        );
        router.replace("/survey/tools");
        return;
      }

      const firstTool = nextPendingTools[0];
      const firstUseCaseId = firstTool?.surveyToolUseCaseIds?.[0] ?? "";

      updateSurveyCurrentStep("application");
      setSurveySession({
        methodVersion: storedSession.methodVersion,
        productCode: storedSession.productCode,
        runId: storedSession.runId,
        submissionToken: storedSession.submissionToken,
      });
      setPendingTools(nextPendingTools);
      setRunId(storedSession.runId);
      setCompletedSteps(storedSession.completedSteps ?? []);
      setSelectedToolId(firstTool?.surveyToolId ?? "");
      setSelectedUseCaseId(firstUseCaseId);
    });
  }, [router]);

  async function handleSaveApplication() {
    if (!surveySession || !selectedTool) {
      setError("Geen actieve AI-Foto toepassing gevonden. Kies eerst een tool.");
      return;
    }

    if (!isFormComplete()) {
      const missing = getMissingRequiredQuestions();

      setApplicationSectionIndex(missing[0]?.sectionIndex ?? applicationSectionIndex);
      setError(formatMissingQuestions(missing));
      return;
    }

    setIsSaving(true);
    setError(null);

    const applicationResult = await saveSurveyApplication(surveySession, {
      account_environment_code: accountEnvironmentCode,
      application_frequency_code: applicationFrequencyCode,
      beneficiary_code: beneficiaryCode,
      condition_need_codes: conditionNeedCodes,
      control_rework_code: controlReworkCode,
      data_type_codes: dataTypeCodes,
      depth_rank: "primary",
      deviation_authority_code: shouldAskDeviationAuthority
        ? deviationAuthorityCode
        : "not_applicable",
      escalation_route_awareness_code: escalationRouteAwarenessCode,
      near_miss_signal_codes: nearMissSignalCodes,
      net_effect_code: netEffectCode,
      output_control_code: outputControlCode,
      output_destination_code: outputDestinationCode,
      people_impact_code: peopleImpactCode,
      ai_visibility_code: aiVisibilityCode,
      shareability_code: shareabilityCode,
      skill_responses: [],
      support_need_codes: supportNeedCodes,
      survey_tool_id: selectedTool.surveyToolId,
      survey_tool_use_case_id: selectedUseCaseId || undefined,
      task_description_limited: taskDescription.trim(),
      transparency_code: transparencyCode,
      value_evidence_code: valueEvidenceCode,
      value_type_codes: valueTypeCodes,
    });

    if (!applicationResult.ok) {
      finishWithError(applicationResult.error);
      return;
    }

    markSurveyStepCompleted("application");
    updateSurveySession({ aiFotoApplicationDataTypeCodes: dataTypeCodes });
    updateSurveyCurrentStep("data");
    setIsSaving(false);
    router.push("/survey/data");
  }

  function handleSelectApplicationTool(toolId: string) {
    const nextTool = pendingTools.find((tool) => tool.surveyToolId === toolId);

    setSelectedToolId(toolId);
    setSelectedUseCaseId(nextTool?.surveyToolUseCaseIds?.[0] ?? "");
  }

  function handleNextSection() {
    if (!isApplicationSectionComplete(applicationSectionIndex)) {
      setError(
        formatMissingQuestions(getMissingRequiredQuestions(applicationSectionIndex)),
      );
      return;
    }

    setError(null);
    setApplicationSectionIndex((current) =>
      Math.min(current + 1, APPLICATION_SECTION_COUNT - 1),
    );
  }

  function handlePreviousSection() {
    setError(null);
    setApplicationSectionIndex((current) => Math.max(current - 1, 0));
  }

  function isApplicationSectionComplete(sectionIndex: number) {
    return getMissingRequiredQuestions(sectionIndex).length === 0;
  }

  function isFormComplete() {
    return getMissingRequiredQuestions().length === 0;
  }

  function getMissingRequiredQuestions(sectionIndex?: number) {
    const missing: Array<{ sectionIndex: number; label: string }> = [];

    if (!selectedTool) {
      missing.push({ label: "kies een tool uit je selectie", sectionIndex: 0 });
    }

    if (!taskDescription.trim()) {
      missing.push({
        label: "beschrijf kort wat je concreet met deze tool doet",
        sectionIndex: 0,
      });
    }

    if (!applicationFrequencyCode) {
      missing.push({
        label: "hoe vaak je deze concrete toepassing gebruikt",
        sectionIndex: 0,
      });
    }

    if (!accountEnvironmentCode) {
      missing.push({
        label: "in welke account- of werkomgeving dit gebeurt",
        sectionIndex: 1,
      });
    }

    if (!outputDestinationCode) {
      missing.push({ label: "waar de output naartoe gaat", sectionIndex: 1 });
    }

    if (!outputControlCode) {
      missing.push({ label: "hoe de output wordt gecontroleerd", sectionIndex: 1 });
    }

    if (dataTypeCodes.length === 0) {
      missing.push({
        label: "welke data in deze concrete toepassing gaat",
        sectionIndex: 1,
      });
    }

    if (!peopleImpactCode) {
      missing.push({
        label: "of de uitkomst gevolgen kan hebben voor een persoon",
        sectionIndex: 2,
      });
    }

    if (shouldAskDeviationAuthority && !deviationAuthorityCode) {
      missing.push({
        label: "of een mens makkelijk kan afwijken van het AI-advies",
        sectionIndex: 2,
      });
    }

    if (valueTypeCodes.length === 0) {
      missing.push({ label: "wat deze toepassing oplevert", sectionIndex: 3 });
    }

    if (!beneficiaryCode) {
      missing.push({
        label: "voor wie de meeste waarde ontstaat",
        sectionIndex: 3,
      });
    }

    if (!netEffectCode) {
      missing.push({ label: "wat het netto effect is", sectionIndex: 3 });
    }

    if (!controlReworkCode) {
      missing.push({
        label: "hoeveel controle of herstelwerk dit vraagt",
        sectionIndex: 3,
      });
    }

    if (!valueEvidenceCode) {
      missing.push({
        label: "waar je het effect aan merkt",
        sectionIndex: 3,
      });
    }

    return typeof sectionIndex === "number"
      ? missing.filter((item) => item.sectionIndex === sectionIndex)
      : missing;
  }

  function finishWithError(rpcError: RpcError) {
    setError(formatRpcError(rpcError));
    setIsSaving(false);
  }

  if (!runId || !selectedTool) {
    return (
      <EmptySurveyState href="/survey/tools" linkLabel="Naar toolkeuze">
        Kies eerst minimaal een tool voordat je een concrete AI-Foto toepassing
        verdiept.
      </EmptySurveyState>
    );
  }

  return (
    <SurveyStepLayout
      completedSteps={completedSteps}
      currentStep="application"
      eyebrow="AI-Foto verdieping"
      intro="Kies een concrete toepassing en beschrijf die in algemene termen. We gebruiken dit alleen als signalering voor waarde, aandachtspunten en vervolgbesluiten."
      maxWidthClassName="max-w-5xl"
      title="Welke concrete AI-toepassing wil je kort in kaart brengen?"
    >
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSaveApplication();
        }}
      >
        <ApplicationSectionProgress
          currentIndex={applicationSectionIndex}
          missingQuestions={missingRequiredQuestions}
        />

        {applicationSectionIndex === 0 ? (
          <>
            <ApplicationPicker
              isDisabled={isSaving}
              onSelectTool={handleSelectApplicationTool}
              onSelectUseCase={setSelectedUseCaseId}
              pendingTools={pendingTools}
              selectedToolId={selectedToolId}
              selectedUseCaseId={selectedUseCaseId}
              useCaseChoices={selectedToolUseCases}
            />

            <SurveyQuestionBlock
              helpText="Schrijf in algemene termen. Gebruik bijvoorbeeld 'concept e-mail opstellen voor een klant' in plaats van namen, dossiernummers of klantdetails."
              required
              title="Wat doe je concreet met deze tool?"
            >
              <textarea
                className="min-h-28 w-full rounded-xl border border-[#bfc7cf] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
                disabled={isSaving}
                maxLength={500}
                onChange={(event) => setTaskDescription(event.target.value)}
                placeholder="Bijvoorbeeld: concept klantmail maken, offertes samenvatten, intakevragen structureren..."
                value={taskDescription}
              />
              <p className="text-right text-xs font-medium text-[#6993aa]">
                {taskDescription.length} / 500
              </p>
              {taskPrivacyWarning ? (
                <ValidationMessage>{taskPrivacyWarning}</ValidationMessage>
              ) : null}
            </SurveyQuestionBlock>

            <SurveyRadioGroup
              compact
              helpText="Het gaat hier om dit praktijkvoorbeeld, niet om je totale AI-gebruik."
              isDisabled={isSaving}
              label="Hoe vaak gebruik je deze concrete toepassing?"
              name="application_frequency"
              onChange={setApplicationFrequencyCode}
              options={applicationFrequencyOptions}
              selectedCode={applicationFrequencyCode}
            />
          </>
        ) : null}

        {applicationSectionIndex === 1 ? (
          <>
            <ApplicationFlowDiagram
              accountEnvironmentCode={accountEnvironmentCode}
              dataTypeCodes={dataTypeCodes}
              outputControlCode={outputControlCode}
              outputDestinationCode={outputDestinationCode}
              selectedToolName={selectedTool.toolName}
            />

            <SurveyCheckboxGroup
              compact
              helpText="Kies alle datatypes die specifiek bij dit praktijkvoorbeeld horen."
              isDisabled={isSaving}
              label="Welke data gaat erin?"
              onChange={(codes) =>
                setDataTypeCodes(applyExclusiveCodes(codes, EXCLUSIVE_DATA_CODES))
              }
              options={getApplicationDataOptions()}
              selectedCodes={dataTypeCodes}
            />

            <section className="grid gap-4 lg:grid-cols-2">
              <SurveyRadioGroup
                compact
                helpText=""
                isDisabled={isSaving}
                label="In welke account- of werkomgeving gebeurt dit?"
                name="application_account_environment"
                onChange={setAccountEnvironmentCode}
                options={applicationAccountEnvironmentOptions}
                selectedCode={accountEnvironmentCode}
              />
              <SurveyRadioGroup
                compact
                helpText=""
                isDisabled={isSaving}
                label="Waar gaat de output naartoe?"
                name="output_destination"
                onChange={setOutputDestinationCode}
                options={outputDestinationOptions}
                selectedCode={outputDestinationCode}
              />
              <SurveyRadioGroup
                compact
                helpText=""
                isDisabled={isSaving}
                label="Hoe wordt de output gecontroleerd?"
                name="output_control"
                onChange={setOutputControlCode}
                options={outputControlOptions}
                selectedCode={outputControlCode}
              />
            </section>
          </>
        ) : null}

        {applicationSectionIndex === 2 ? (
          <>
            <section className="grid gap-4 lg:grid-cols-2">
              <SurveyRadioGroup
                compact
                helpText=""
                isDisabled={isSaving}
                label="Heeft de uitkomst gevolgen voor een klant, collega of andere persoon?"
                name="people_impact"
                onChange={setPeopleImpactCode}
                options={peopleImpactOptions}
                selectedCode={peopleImpactCode}
              />
              {shouldAskDeviationAuthority ? (
                <SurveyRadioGroup
                  compact
                  helpText=""
                  isDisabled={isSaving}
                  label="Wordt het AI-advies altijd gevolgd, of kan een mens er makkelijk van afwijken?"
                  name="deviation_authority"
                  onChange={setDeviationAuthorityCode}
                  options={deviationAuthorityOptions}
                  selectedCode={deviationAuthorityCode}
                />
              ) : (
                <InfoPanel title="Menselijke beoordeling">
                  Als de toepassing geen zichtbare invloed op personen heeft,
                  hoeven we hier geen extra afwijkingsvraag te stellen.
                </InfoPanel>
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <SurveyRadioGroup
                compact
                helpText=""
                isDisabled={isSaving}
                label="Is zichtbaar dat AI is gebruikt?"
                name="ai_visibility"
                onChange={setAiVisibilityCode}
                options={aiVisibilityOptions}
                selectedCode={aiVisibilityCode}
              />
              <SurveyRadioGroup
                compact
                helpText="Dit gaat over je eigen inschatting van de afspraken rond melden of vermelden."
                isDisabled={isSaving}
                label="Weet je wanneer je gebruik van AI zou moeten melden bij je organisatie?"
                name="ai_transparency"
                onChange={setTransparencyCode}
                options={aiTransparencyOptions}
                selectedCode={transparencyCode}
              />
              <SurveyRadioGroup
                compact
                helpText=""
                isDisabled={isSaving}
                label="Weet je waar je twijfel of incidenten kunt melden?"
                name="escalation_route_awareness"
                onChange={setEscalationRouteAwarenessCode}
                options={escalationRouteAwarenessOptions}
                selectedCode={escalationRouteAwarenessCode}
              />
            </section>
          </>
        ) : null}

        {applicationSectionIndex === 3 ? (
          <>
            <section className="grid gap-4 lg:grid-cols-2">
              <SurveyCheckboxGroup
                compact
                helpText="Kies wat dit praktijkvoorbeeld oplevert. Dit voedt de Waardekaart."
                isDisabled={isSaving}
                label="Wat levert deze toepassing op?"
                onChange={setValueTypeCodes}
                options={valueTypeOptions}
                selectedCodes={valueTypeCodes}
              />
              <SurveyRadioGroup
                compact
                helpText=""
                isDisabled={isSaving}
                label="Voor wie ontstaat de meeste waarde?"
                name="value_beneficiary"
                onChange={setBeneficiaryCode}
                options={valueBeneficiaryOptions}
                selectedCode={beneficiaryCode}
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <SurveyRadioGroup
                compact
                helpText=""
                isDisabled={isSaving}
                label="Wat is het netto effect?"
                name="net_effect"
                onChange={setNetEffectCode}
                options={netEffectOptions}
                selectedCode={netEffectCode}
              />
              <SurveyRadioGroup
                compact
                helpText="Dit maakt tijdwinst of kwaliteitswinst beter interpreteerbaar."
                isDisabled={isSaving}
                label="Hoeveel controle of herstelwerk vraagt dit?"
                name="control_rework"
                onChange={setControlReworkCode}
                options={controlReworkOptions}
                selectedCode={controlReworkCode}
              />
              <SurveyRadioGroup
                compact
                helpText="Dit bepaalt of het waardesignaal voorlopig gesteld of aannemelijk is."
                isDisabled={isSaving}
                label="Waar merk je dat aan?"
                name="value_evidence"
                onChange={setValueEvidenceCode}
                options={valueEvidenceOptions}
                selectedCode={valueEvidenceCode}
              />
            </section>
          </>
        ) : null}

        {applicationSectionIndex === 4 ? (
          <>
            <ApplicationSummaryCard
              accountEnvironmentCode={accountEnvironmentCode}
              dataTypeCodes={dataTypeCodes}
              netEffectCode={netEffectCode}
              outputControlCode={outputControlCode}
              outputDestinationCode={outputDestinationCode}
              selectedToolName={selectedTool.toolName}
              taskDescription={taskDescription}
              valueTypeCodes={valueTypeCodes}
            />

            <section className="grid gap-4 lg:grid-cols-2">
              <SurveyCheckboxGroup
                compact
                helpText="Optioneel: wat moet geregeld zijn voordat collega's dit ook goed kunnen doen?"
                isDisabled={isSaving}
                label="Voorwaarden voor breder gebruik"
                onChange={setConditionNeedCodes}
                options={conditionNeedOptions}
                selectedCodes={conditionNeedCodes}
              />
              <SurveyRadioGroup
                compact
                helpText="Optioneel. Kies gerust 'weet ik niet'."
                isDisabled={isSaving}
                label="Is dit deelbaar met collega's?"
                name="shareability"
                onChange={setShareabilityCode}
                options={shareabilityOptions}
                selectedCode={shareabilityCode}
              />
            </section>

            <PrivacyNotice />

            <section className="grid gap-4 lg:grid-cols-2">
              <SurveyCheckboxGroup
                compact
                helpText="Optioneel. Dit helpt om problemen vroeg te herkennen."
                isDisabled={isSaving}
                label="Is er weleens iets misgegaan of bijna misgegaan?"
                onChange={(codes) =>
                  setNearMissSignalCodes(
                    applyExclusiveCodes(codes, EXCLUSIVE_NEAR_MISS_CODES),
                  )
                }
                options={nearMissSignalOptions}
                selectedCodes={nearMissSignalCodes}
              />
              <SurveyCheckboxGroup
                compact
                helpText="Optioneel: welke ondersteuning helpt om deze toepassing beter te gebruiken?"
                isDisabled={isSaving}
                label="Benodigde ondersteuning"
                onChange={setSupportNeedCodes}
                options={supportNeedOptions}
                selectedCodes={supportNeedCodes}
              />
            </section>
          </>
        ) : null}

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        <ApplicationWizardActions
          isBusy={isSaving}
          isFinalSection={applicationSectionIndex === APPLICATION_SECTION_COUNT - 1}
          isFirstSection={applicationSectionIndex === 0}
          onNext={handleNextSection}
          onPrevious={handlePreviousSection}
        />
      </form>
    </SurveyStepLayout>
  );
}

type MissingQuestion = {
  label: string;
  sectionIndex: number;
};

function ApplicationSectionProgress({
  currentIndex,
  missingQuestions,
}: {
  currentIndex: number;
  missingQuestions: MissingQuestion[];
}) {
  return (
    <nav
      aria-label="AI-Foto verdieping voortgang"
      className="grid gap-3 rounded-[1.35rem] border border-[#c4e7ff] bg-[#f3fbff] p-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      {applicationSectionLabels.map((label, index) => {
        const isCurrent = index === currentIndex;
        const isCompleted = index < currentIndex;
        const missingCount = missingQuestions.filter(
          (question) => question.sectionIndex === index,
        ).length;

        return (
          <div
            aria-current={isCurrent ? "step" : undefined}
            className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
              isCurrent
                ? "border-[#00658b] bg-white text-[#00658b] shadow-sm"
                : isCompleted
                  ? "border-[#c4e7ff] bg-white/80 text-[#3e6a00]"
                  : "border-transparent bg-white/45 text-[#6993aa]"
            }`}
            key={label}
          >
            <span className="mr-2 font-mono text-xs">{index + 1}</span>
            {label}
            {missingCount > 0 ? (
              <span className="ml-2 rounded-full bg-[#c4e7ff]/60 px-2 py-0.5 text-[11px] text-[#00658b]">
                {missingCount} open
              </span>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function ApplicationWizardActions({
  isBusy,
  isFinalSection,
  isFirstSection,
  onNext,
  onPrevious,
}: {
  isBusy: boolean;
  isFinalSection: boolean;
  isFirstSection: boolean;
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-4 border-t border-[#bfc7cf]/30 pt-8">
      {isFirstSection ? (
        <a
          className="inline-flex min-h-11 items-center text-sm font-bold text-[#40484e] transition hover:text-[#00658b]"
          href="/survey/tools"
        >
          Vorige
        </a>
      ) : (
        <SecondarySurveyButton disabled={isBusy} onClick={onPrevious}>
          Vorige
        </SecondarySurveyButton>
      )}

      {isFinalSection ? (
        <PrimarySurveyButton key="save-application" disabled={isBusy} isBusy={isBusy} type="submit">
          {isBusy ? "Opslaan..." : "Verder naar data"}
        </PrimarySurveyButton>
      ) : (
        <PrimarySurveyButton key="next-section" disabled={isBusy} onClick={onNext} type="button">
          Volgende stap
        </PrimarySurveyButton>
      )}
    </div>
  );
}

function ApplicationPicker({
  isDisabled,
  onSelectTool,
  onSelectUseCase,
  pendingTools,
  selectedToolId,
  selectedUseCaseId,
  useCaseChoices,
}: {
  isDisabled: boolean;
  onSelectTool: (toolId: string) => void;
  onSelectUseCase: (useCaseId: string) => void;
  pendingTools: PendingSurveyTool[];
  selectedToolId: string;
  selectedUseCaseId: string;
  useCaseChoices: SurveyOption[];
}) {
  const selectedTool = pendingTools.find(
    (tool) => tool.surveyToolId === selectedToolId,
  );

  return (
    <section className="grid gap-4 rounded-[1.6rem] border border-[#c4e7ff] bg-[#f3fbff] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[#00658b]/70">
            Concrete toepassing
          </p>
          <h2 className="mt-1 break-words text-xl font-extrabold text-[#00658b]">
            Verdiep een tool uit je selectie
          </h2>
        </div>
        <span className="rounded-full border border-[#00658b]/20 bg-white px-3 py-1 text-xs font-extrabold text-[#00658b]">
          AI-Foto
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {pendingTools.map((tool) => {
          const isSelected = selectedToolId === tool.surveyToolId;

          return (
            <button
              className={`flex min-w-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[#00658b] ${
                isSelected
                  ? "border-[#00658b] bg-white"
                  : "border-[#bfc7cf] bg-white/70"
              }`}
              disabled={isDisabled}
              key={tool.surveyToolId}
              onClick={() => onSelectTool(tool.surveyToolId)}
              type="button"
            >
              <ToolLogo tool={getCatalogTool(tool.toolName)} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-[#181c1e]">
                  {tool.toolName}
                </span>
                <span className="mt-0.5 block text-xs font-semibold text-[#00658b]">
                  {getUseCaseLabels(tool)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <SurveySummaryGrid columnsClassName="md:grid-cols-2">
        <SurveySummaryItem
          detail={selectedTool ? getUseCaseLabels(selectedTool) : "Nog kiezen"}
          label="Gekozen tool"
          value={selectedTool?.toolName ?? "Nog kiezen"}
        />
        <label className="grid gap-2 text-sm font-semibold text-[#181c1e]">
          Toepassing
          <select
            className="h-11 rounded-xl border border-[#bfc7cf] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#00658b] focus:ring-2 focus:ring-[#c4e7ff]"
            disabled={isDisabled || useCaseChoices.length === 0}
            onChange={(event) => onSelectUseCase(event.target.value)}
            value={selectedUseCaseId}
          >
            {useCaseChoices.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </SurveySummaryGrid>
    </section>
  );
}

function ApplicationFlowDiagram({
  accountEnvironmentCode,
  dataTypeCodes,
  outputControlCode,
  outputDestinationCode,
  selectedToolName,
}: {
  accountEnvironmentCode: string;
  dataTypeCodes: string[];
  outputControlCode: string;
  outputDestinationCode: string;
  selectedToolName: string;
}) {
  const nodes = [
    {
      detail:
        dataTypeCodes.length > 0
          ? dataTypeCodes.map((code) => getOptionLabel(dataTypeOptions, code)).join(", ")
          : "Nog kiezen",
      label: "Data",
    },
    {
      detail: accountEnvironmentCode
        ? getOptionLabel(applicationAccountEnvironmentOptions, accountEnvironmentCode)
        : selectedToolName,
      label: "Tool/omgeving",
    },
    {
      detail: outputDestinationCode
        ? getOptionLabel(outputDestinationOptions, outputDestinationCode)
        : "Nog kiezen",
      label: "Output gaat naar",
    },
    {
      detail: outputControlCode
        ? getOptionLabel(outputControlOptions, outputControlCode)
        : "Nog kiezen",
      label: "Controle door",
    },
  ];

  return (
    <section className="rounded-[1.35rem] border border-[#c4e7ff] bg-[#f3fbff] p-4">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[#00658b]/70">
          Datastroom
        </p>
        <h2 className="mt-1 font-headline text-xl font-extrabold text-[#00658b]">
          Bouw de route van je praktijkvoorbeeld
        </h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        {nodes.map((node, index) => (
          <div className="relative" key={node.label}>
            <div className="grid min-h-28 content-start gap-2 rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
              <span className="text-xs font-extrabold uppercase tracking-wide text-[#6993aa]">
                {node.label}
              </span>
              <span className="line-clamp-3 text-sm font-bold leading-5 text-[#181c1e]">
                {node.detail}
              </span>
            </div>
            {index < nodes.length - 1 ? (
              <span className="pointer-events-none absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-[#c4e7ff] bg-white text-[#00658b] lg:grid">
                {">"}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function ApplicationSummaryCard({
  accountEnvironmentCode,
  dataTypeCodes,
  netEffectCode,
  outputControlCode,
  outputDestinationCode,
  selectedToolName,
  taskDescription,
  valueTypeCodes,
}: {
  accountEnvironmentCode: string;
  dataTypeCodes: string[];
  netEffectCode: string;
  outputControlCode: string;
  outputDestinationCode: string;
  selectedToolName: string;
  taskDescription: string;
  valueTypeCodes: string[];
}) {
  return (
    <section className="rounded-[1.35rem] border border-[#c4e7ff] bg-[#f3fbff] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[#00658b]/70">
        Toepassingskaart-preview
      </p>
      <h2 className="mt-1 break-words font-headline text-xl font-extrabold text-[#00658b]">
        {taskDescription || "Jouw praktijkvoorbeeld"}
      </h2>
      <SurveySummaryGrid columnsClassName="md:grid-cols-2 lg:grid-cols-4">
        <SurveySummaryItem
          detail={getOptionLabel(applicationAccountEnvironmentOptions, accountEnvironmentCode)}
          label="Tool"
          value={selectedToolName}
        />
        <SurveySummaryItem
          detail={dataTypeCodes.length > 0 ? `${dataTypeCodes.length} categorieen` : "Nog niet ingevuld"}
          label="Data"
          value={dataTypeCodes.map((code) => getOptionLabel(dataTypeOptions, code)).join(", ") || "Nog niet ingevuld"}
        />
        <SurveySummaryItem
          detail={getOptionLabel(outputControlOptions, outputControlCode)}
          label="Output"
          value={getOptionLabel(outputDestinationOptions, outputDestinationCode)}
        />
        <SurveySummaryItem
          detail={getOptionLabel(netEffectOptions, netEffectCode)}
          label="Waarde"
          value={valueTypeCodes.map((code) => getOptionLabel(valueTypeOptions, code)).join(", ") || "Nog niet ingevuld"}
        />
      </SurveySummaryGrid>
    </section>
  );
}

function InfoPanel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="grid content-start gap-2 rounded-[1.35rem] border border-white/80 bg-white/70 p-4 shadow-[0_4px_14px_rgba(0,101,139,0.035)]">
      <h3 className="font-headline text-[1.2rem] font-extrabold leading-[1.25] text-[#00658b]">
        {title}
      </h3>
      <p className="text-[14.5px] leading-[1.5] text-[#40484e]">{children}</p>
    </section>
  );
}

function PrivacyNotice() {
  return (
    <aside className="rounded-[1.35rem] border border-[#c4e7ff] bg-[#f3fbff] px-4 py-3 text-sm leading-6 text-[#40484e]">
      <strong className="text-[#00658b]">Goed om te weten:</strong> gevoelige
      antwoorden zoals bijna-mis signalen worden gebruikt om patronen te
      herkennen, niet om individuele medewerkers te beoordelen.
    </aside>
  );
}

function getToolUseCaseChoices(tool: PendingSurveyTool | undefined) {
  if (!tool) {
    return [];
  }

  const ids = tool.surveyToolUseCaseIds ?? [];
  const codes = tool.useCaseCodes ?? [];

  return ids.map((id, index) => {
    const code = codes[index] ?? id;
    const option = useCaseOptions.find((item) => item.code === code);

    return {
      code: id,
      label: option?.label ?? code,
    };
  });
}

function getApplicationDataOptions() {
  return dataTypeOptions.filter((option) =>
    [
      "public_information",
      "internal_emails",
      "internal_documents",
      "customer_data",
      "financial_data",
      "special_personal_data",
      "legal_documents",
      "none",
      "unsure",
    ].includes(option.code),
  );
}

function applyExclusiveCodes(codes: string[], exclusiveCodes: Set<string>) {
  const lastCode = codes.at(-1);

  if (lastCode && exclusiveCodes.has(lastCode)) {
    return [lastCode];
  }

  return codes.filter((code) => !exclusiveCodes.has(code));
}

function getUseCaseLabels(tool: PendingSurveyTool) {
  return (tool.useCaseCodes ?? [])
    .map((code) => useCaseOptions.find((option) => option.code === code)?.label ?? code)
    .join(", ");
}

function getCatalogTool(toolName: string) {
  return (
    toolOptions.find((tool) => tool.name === toolName) ?? {
      id: "custom",
      name: toolName,
      category: "Zelf invullen",
    }
  );
}

function getOptionLabel(options: SurveyOption[], code: string | null | undefined) {
  if (!code) return "Nog niet ingevuld";
  return options.find((option) => option.code === code)?.label ?? code;
}

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}

function formatMissingQuestions(missingQuestions: MissingQuestion[]) {
  if (missingQuestions.length === 0) {
    return "";
  }

  const labels = missingQuestions.map((question) => question.label);

  if (labels.length === 1) {
    return `Vul deze vraag nog in: ${labels[0]}.`;
  }

  return `Vul deze vragen nog in: ${labels.join("; ")}.`;
}

function getTaskPrivacyWarning(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(normalized)) {
    return "Gebruik geen e-mailadressen in dit veld. Beschrijf de taak liever algemeen.";
  }

  if (/\b\d{6,}\b/.test(normalized)) {
    return "Vermijd dossier-, klant- of referentienummers. Een algemene taakomschrijving is genoeg.";
  }

  if (/\b(klant|patient|personeelsnummer|dossier|bsn)\s*[:#-]/i.test(normalized)) {
    return "Laat namen, dossierdetails en andere herleidbare gegevens weg uit de omschrijving.";
  }

  return null;
}
