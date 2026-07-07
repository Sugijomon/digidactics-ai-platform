"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  EmptySurveyState,
  PrimarySurveyButton,
  SurveyFooterActions,
  SurveyStepLayout,
  ValidationMessage,
} from "@/components/survey-ui";
import { ToolLogo } from "@/components/tool-logo";
import { saveProfile, saveToolAccount } from "@/lib/sai-rpc/client";
import {
  markSurveyStepCompleted,
  readSurveySession,
  storeSurveyGuardNotice,
  type PendingSurveyTool,
  type StoredSurveyTool,
  updateSurveyCurrentStep,
  updateSurveySession,
} from "@/lib/sai-rpc/session";
import type { RpcError, SurveySession } from "@/lib/sai-rpc/types";
import {
  canAccessSurveyStep,
  getResumeStep,
  type SurveyStepId,
} from "@/lib/sai-survey/flow";
import {
  automationUsageOptions,
  browserExtensionUsageOptions,
  type SurveyOption,
  toolOptions,
} from "@/lib/sai-survey/options";

const ACCOUNT_COLUMNS = [
  { code: "business_license", label: "Zakelijke licentie" },
  { code: "personal_free", label: "Priveaccount (gratis)" },
  { code: "personal_paid", label: "Priveaccount (betaald)" },
  { code: "both", label: "Beide" },
];

export default function SurveyAccountsPage() {
  const router = useRouter();
  const [surveySession, setSurveySession] = useState<SurveySession | null>(null);
  const [pendingTools, setPendingTools] = useState<PendingSurveyTool[]>([]);
  const [savedTools, setSavedTools] = useState<StoredSurveyTool[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<SurveyStepId[]>([]);
  const [accountByToolId, setAccountByToolId] = useState<Record<string, string>>(
    {},
  );
  const [browserExtensionUsageCode, setBrowserExtensionUsageCode] = useState("");
  const [automationUsageCode, setAutomationUsageCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAccountRowsFilled = useMemo(
    () =>
      pendingTools.length > 0 &&
      pendingTools.every((tool) => Boolean(accountByToolId[tool.surveyToolId])),
    [accountByToolId, pendingTools],
  );

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = readSurveySession();

      if (!storedSession) {
        return;
      }

      if (!canAccessSurveyStep(storedSession, "accounts")) {
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
          "Kies eerst minimaal een tool voordat je accountstatus vastlegt.",
        );
        router.replace("/survey/tools");
        return;
      }

      updateSurveyCurrentStep("accounts");
      setSurveySession({
        runId: storedSession.runId,
        submissionToken: storedSession.submissionToken,
      });
      setPendingTools(nextPendingTools);
      setSavedTools(storedSession.savedTools ?? []);
      setRunId(storedSession.runId);
      setCompletedSteps(storedSession.completedSteps ?? []);
      setAccountByToolId({});
    });
  }, [router]);

  async function handleSaveAccountMatrix() {
    if (!surveySession) {
      setError("Geen actieve scan gevonden. Start de scan opnieuw.");
      return;
    }

    if (!allAccountRowsFilled || !browserExtensionUsageCode || !automationUsageCode) {
      setError("Vul alle account-, extensie- en automatiseringsvragen in.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const nextSavedTools: StoredSurveyTool[] = [...savedTools];

    for (const pendingTool of pendingTools) {
      const accountTypeCode = accountByToolId[pendingTool.surveyToolId];
      const accountResult = await saveToolAccount(
        surveySession,
        pendingTool.surveyToolId,
        accountTypeCode,
      );

      if (!accountResult.ok) {
        finishWithError(accountResult.error);
        return;
      }

      nextSavedTools.push({
        surveyToolId: pendingTool.surveyToolId,
        toolName: pendingTool.toolName,
        useCaseCodes: pendingTool.useCaseCodes ?? [],
        contextCodes: pendingTool.contextCodes ?? [],
        accountTypeCode,
        savedAt: new Date().toISOString(),
      });
    }

    const profileResult = await saveProfile(surveySession, {
      browser_extension_usage_code: browserExtensionUsageCode,
      automation_usage_code: automationUsageCode,
    });

    if (!profileResult.ok) {
      finishWithError(profileResult.error);
      return;
    }

    markSurveyStepCompleted("accounts");
    updateSurveySession({
      currentStep: "literacy",
      pendingTool: undefined,
      pendingTools: [],
      savedTools: nextSavedTools,
    });
    setSavedTools(nextSavedTools);
    setPendingTools([]);
    setIsSaving(false);
    router.push("/survey/literacy");
  }

  function finishWithError(rpcError: RpcError) {
    setError(formatRpcError(rpcError));
    setIsSaving(false);
  }

  if (!runId || pendingTools.length === 0) {
    return (
      <EmptySurveyState href="/survey/tools" linkLabel="Naar toolkeuze">
        Kies eerst minimaal een tool voordat je accountstatus vastlegt.
      </EmptySurveyState>
    );
  }

  return (
    <SurveyStepLayout
      completedSteps={completedSteps}
      currentStep="accounts"
      eyebrow="Toegang & Automatisering"
      intro="Geef per tool aan wie het account beheert. We gebruiken dit om te bepalen waar de organisatie al regie heeft en waar veilige bedrijfslicenties nodig zijn."
      maxWidthClassName="max-w-3xl"
      title="Hoe gebruik je deze tools: via een zakelijke licentie of een priveaccount?"
    >
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSaveAccountMatrix();
        }}
      >
        <AccountMatrix
          accountByToolId={accountByToolId}
          isDisabled={isSaving}
          onChange={(toolId, accountTypeCode) =>
            setAccountByToolId((current) => ({
              ...current,
              [toolId]: accountTypeCode,
            }))
          }
          pendingTools={pendingTools}
        />

        <PrototypeRadioPanel
          helpText=""
          isDisabled={isSaving}
          label="Gebruik je AI-browserextensies die mogelijk meekijken tijdens je werk?"
          name="browser_extensions"
          onChange={setBrowserExtensionUsageCode}
          options={browserExtensionUsageOptions}
          selectedCode={browserExtensionUsageCode}
        />

        <PrototypeRadioPanel
          helpText="Gebruik je tools die zelfstandig taken voor je uitvoeren (zoals AutoGPT, agents in Poe, of gekoppelde AI-workflows via Zapier/Make)?"
          isDisabled={isSaving}
          label="Experimenteer je met AI-agents of automatisering?"
          name="automation_usage"
          onChange={setAutomationUsageCode}
          options={automationUsageOptions}
          selectedCode={automationUsageCode}
        />

        {error ? <ValidationMessage>{error}</ValidationMessage> : null}

        <SurveyFooterActions backHref="/survey/data">
          <PrimarySurveyButton disabled={isSaving} isBusy={isSaving} type="submit">
            {isSaving ? "Opslaan..." : "Volgende stap"}
          </PrimarySurveyButton>
        </SurveyFooterActions>
      </form>
    </SurveyStepLayout>
  );
}

function InlineChevron({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 ${className ?? ""}`}
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function AccountMatrix({
  accountByToolId,
  isDisabled,
  onChange,
  pendingTools,
}: {
  accountByToolId: Record<string, string>;
  isDisabled: boolean;
  onChange: (toolId: string, accountTypeCode: string) => void;
  pendingTools: PendingSurveyTool[];
}) {
  return (
    <section className="grid gap-6">
      <details className="group rounded-[1.25rem] border border-[#bfc7cf]/30 bg-[#f1f4f6] p-1 shadow-sm">
        <summary className="flex cursor-pointer items-center gap-2 rounded-xl p-3 transition hover:bg-[#ebeef0]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-[#00658b] shadow-sm">
            i
          </span>
          <span className="flex-1 text-[13px] font-bold text-[#00658b]">
            Jouw data is trainingsmateriaal voor AI
          </span>
          <InlineChevron className="text-[#94a3b8] transition group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4 pt-2 text-[13.5px] leading-relaxed text-[#40484e]">
          <p>
            <strong>Let op:</strong> Het belangrijkste verschil is niet alleen
            gratis versus betaald, maar vooral wie het account beheert. Bij een
            priveaccount heeft de organisatie meestal geen grip op contracten,
            logging of bewaartermijnen. Zeker bij gratis varianten is data vaak
            onderdeel van het verdienmodel.
          </p>
        </div>
      </details>

      <div className="overflow-hidden rounded-[1.25rem] border border-[#bfc7cf] bg-white shadow-[0_4px_20px_rgba(0,101,139,0.03)]">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-[#f1f4f6] text-xs font-semibold text-[#40484e] sm:text-[13px]">
            <tr>
              <th className="w-[32%] border-b border-[#bfc7cf] px-3 py-3">
                Geselecteerde Tool
              </th>
              {ACCOUNT_COLUMNS.map((column) => (
                <th
                  className="border-b border-[#bfc7cf] px-1.5 py-3 text-center leading-tight text-[#181c1e] sm:px-2"
                  key={column.code}
                >
                  <span className="mx-auto block max-w-[8.5rem] whitespace-normal break-words">
                    {column.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pendingTools.map((tool) => (
              <tr className="transition hover:bg-[#c4e7ff]/15" key={tool.surveyToolId}>
                <td className="border-b border-[#ebeef0] px-3 py-3 last:border-b-0">
                  <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                    <ToolLogo
                      sizeClassName="mt-px h-8 w-8 sm:h-9 sm:w-9"
                      tool={getCatalogTool(tool.toolName)}
                    />
                    <div className="min-w-0">
                      <p className="break-words text-[13px] font-bold text-[#181c1e] sm:text-[14.5px]">
                        {tool.toolName}
                      </p>
                      <p className="mt-1 break-words text-[11px] leading-5 text-[#40484e] sm:text-xs">
                        {getOptionLabels(useCaseLabelOptions, tool.useCaseCodes ?? [])}
                      </p>
                    </div>
                  </div>
                </td>
                {ACCOUNT_COLUMNS.map((column) => {
                  const isChecked =
                    accountByToolId[tool.surveyToolId] === column.code;

                  return (
                    <td
                      className="border-b border-[#ebeef0] px-1.5 py-3 text-center sm:px-2"
                      key={column.code}
                    >
                      <label className="inline-grid cursor-pointer place-items-center gap-1">
                        <input
                          checked={isChecked}
                          className="sr-only"
                          disabled={isDisabled}
                          name={`account-${tool.surveyToolId}`}
                          onChange={() => onChange(tool.surveyToolId, column.code)}
                          type="radio"
                          value={column.code}
                        />
                        <span
                          className={`grid h-6 w-6 place-items-center rounded-full border-[3px] bg-white transition sm:h-7 sm:w-7 ${
                            isChecked
                              ? "border-[#00658b]"
                              : "border-[#c2c9d2] hover:border-[#00658b] hover:bg-[#f7fafc]"
                          }`}
                        >
                          <span
                            className={`h-2.5 w-2.5 rounded-full transition sm:h-3 sm:w-3 ${
                              isChecked ? "bg-[#00658b]" : "bg-transparent"
                            }`}
                          />
                        </span>
                        <span className="sr-only">{column.label}</span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PrototypeRadioPanel({
  helpText,
  isDisabled,
  label,
  name,
  onChange,
  options,
  selectedCode,
  validationError,
}: {
  helpText: string;
  isDisabled: boolean;
  label: string;
  name: string;
  onChange: (code: string) => void;
  options: SurveyOption[];
  selectedCode: string;
  validationError?: string;
}) {
  return (
    <fieldset
      aria-invalid={validationError ? true : undefined}
      className="rounded-2xl border border-[#bfc7cf]/45 bg-[#f1f4f6] p-5"
    >
      <legend className="sr-only">{label}</legend>
      <h3 className="mb-1 text-[1.35rem] font-extrabold leading-tight text-[#00658b]">
        {label}
      </h3>
      {helpText ? (
        <p className="mb-3 text-sm leading-6 text-[#40484e]">{helpText}</p>
      ) : null}
      <div className="grid gap-2.5">
        {options.map((option) => {
          const isChecked = selectedCode === option.code;

          return (
            <label
              className={`flex cursor-pointer items-center gap-4 rounded-2xl border-[1.5px] px-5 py-4 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:bg-[#c4e7ff]/20 ${
                isChecked
                  ? "border-[#00658b] bg-[#c4e7ff]/35"
                  : "border-[#bfc7cf] bg-white/70"
              } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
              key={option.code}
            >
              <input
                checked={isChecked}
                className="sr-only"
                disabled={isDisabled}
                name={name}
                onChange={() => onChange(option.code)}
                type="radio"
                value={option.code}
              />
              <span
                className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 bg-white ${
                  isChecked ? "border-[#00658b]" : "border-[#bfc7cf]"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isChecked ? "bg-[#00658b]" : "bg-transparent"
                  }`}
                />
              </span>
              <span className="min-w-0 text-base leading-snug text-[#181c1e]">
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const useCaseLabelOptions: SurveyOption[] = [
  { code: "drafting", label: "Teksten schrijven" },
  { code: "teksten_schrijven", label: "Teksten schrijven of bewerken" },
  { code: "samenvatten_redigeren", label: "Samenvatten en redigeren" },
  { code: "brainstormen", label: "Brainstormen" },
  { code: "informatie_opzoeken", label: "Informatie opzoeken" },
  { code: "vertalen", label: "Vertalen" },
  { code: "klantenservice", label: "Klantenservice" },
  { code: "data_analyseren", label: "Data analyseren" },
  { code: "code_schrijven", label: "Code schrijven" },
  { code: "afbeeldingen_genereren", label: "Afbeeldingen genereren" },
  { code: "presentaties_design", label: "Presentaties en design" },
  { code: "automatisering", label: "Automatisering" },
  { code: "audio_genereren", label: "Audio genereren" },
  { code: "video_genereren", label: "Video genereren" },
  { code: "vergaderingen_notuleren", label: "Vergaderingen notuleren" },
  { code: "workflow_uitvoeren", label: "Workflows uitvoeren" },
  { code: "systemen_aansturen", label: "Systemen aansturen" },
  { code: "taken_automatisch_afhandelen", label: "Taken automatisch afhandelen" },
];

function getOptionLabels(options: SurveyOption[], codes: string[]) {
  return codes.map((code) => options.find((option) => option.code === code)?.label ?? code).join(", ");
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

function formatRpcError(error: RpcError) {
  return [error.code, error.message].filter(Boolean).join(": ");
}
