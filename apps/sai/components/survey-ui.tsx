import type { ReactNode } from "react";
import type { SurveyStepId } from "@/lib/sai-survey/flow";
import { SurveyProgress } from "@/components/survey-progress";

export type RpcStepState = {
  status: "idle" | "running" | "ok" | "error";
  message: string;
};

export function RequiredBadge() {
  return (
    <span className="rounded-full border border-[#bfc7cf]/60 bg-white px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide text-[#40484e]">
      Verplicht
    </span>
  );
}

export function SurveyPageShell({
  badge = "Vertrouwelijk & anoniem",
  children,
  maxWidthClassName = "max-w-4xl",
}: {
  badge?: string;
  children: ReactNode;
  maxWidthClassName?: string;
}) {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f7fafc] text-[#181c1e]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-44 -top-44 h-[38rem] w-[38rem] rounded-full bg-[#7dd0ff]/30 blur-[80px]" />
        <div className="absolute -bottom-48 -right-40 h-[34rem] w-[34rem] rounded-full bg-[#bae6ff]/35 blur-[90px]" />
      </div>
      <section
        className={`mx-auto grid min-w-0 w-[calc(100vw-2rem)] ${maxWidthClassName} gap-6 py-6 sm:w-[calc(100vw-3rem)] md:py-8`}
      >
        <SurveyBrandHeader badge={badge} />
        {children}
      </section>
    </main>
  );
}

export function SurveyBrandHeader({ badge }: { badge: string }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#00658b] text-white shadow-sm">
          <span className="text-2xl font-black leading-none">S</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-extrabold leading-tight tracking-tight text-[#181c1e]">
            Shadow AI Scan
          </p>
          <p className="text-[13px] font-medium tracking-wide text-[#6993aa]">
            Veilig innoveren met AI
          </p>
        </div>
      </div>
      <span className="hidden shrink-0 rounded-full border border-[#bfc7cf]/50 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#40484e] shadow-sm backdrop-blur sm:inline-flex">
        {badge}
      </span>
    </header>
  );
}

export function SurveyStepLayout({
  children,
  completedSteps,
  currentStep,
  eyebrow,
  intro,
  maxWidthClassName = "max-w-4xl",
  title,
}: {
  children: ReactNode;
  completedSteps: SurveyStepId[];
  currentStep: SurveyStepId;
  eyebrow: string;
  intro: string;
  maxWidthClassName?: string;
  title: string;
}) {
  return (
    <SurveyPageShell maxWidthClassName={maxWidthClassName}>
      <SurveyProgress completedSteps={completedSteps} currentStep={currentStep} />
      <SurveyGlassCard>
        <SurveyCardIntro eyebrow={eyebrow} intro={intro} title={title} />
        {children}
      </SurveyGlassCard>
    </SurveyPageShell>
  );
}

export function SurveyGlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_8px_40px_rgba(0,101,139,0.06)] backdrop-blur md:p-8 ${className}`}
    >
      {children}
    </section>
  );
}

export function SurveyCardIntro({
  eyebrow,
  intro,
  title,
}: {
  eyebrow: string;
  intro: string;
  title: string;
}) {
  return (
    <div className="mb-7">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#00658b]/70">
        {eyebrow}
      </p>
      <h1 className="text-2xl font-extrabold leading-tight text-[#00658b] md:text-[1.7rem]">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#40484e]">
        {intro}
      </p>
    </div>
  );
}

export function SurveyFooterActions({
  backHref,
  children,
}: {
  backHref: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[#bfc7cf]/30 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <a
        className="inline-flex h-11 items-center justify-center rounded-full border border-[#bfc7cf] px-6 text-sm font-bold text-[#40484e] transition hover:border-[#00658b] hover:text-[#00658b]"
        href={backHref}
      >
        Vorige
      </a>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {children}
      </div>
    </div>
  );
}

export function PrimarySurveyButton({
  children,
  disabled = false,
  isBusy = false,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  isBusy?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      aria-busy={isBusy}
      className="inline-flex h-12 items-center justify-center rounded-full bg-[#00658b] px-8 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#004c6a] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

export function SecondarySurveyButton({
  children,
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className="inline-flex h-12 items-center justify-center rounded-full border border-[#00658b] bg-white px-8 text-sm font-extrabold text-[#00658b] transition hover:bg-[#c4e7ff]/30 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function OptionCard({
  children,
  isDisabled = false,
  isSelected = false,
}: {
  children: ReactNode;
  isDisabled?: boolean;
  isSelected?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:shadow-[0_4px_12px_rgba(0,101,139,0.06)] ${
        isSelected
          ? "border-[#00658b] bg-[#f1f4f6] shadow-[0_4px_18px_rgba(0,101,139,0.08)]"
          : "border-[#bfc7cf] bg-white"
      } ${isDisabled ? "cursor-not-allowed opacity-55" : ""}`}
    >
      {children}
    </label>
  );
}

export function ValidationMessage({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
      {children}
    </p>
  );
}

export function SurveyQuestionBlock({
  children,
  error,
  helpText,
  isInvalid = false,
  required = false,
  title,
}: {
  children: ReactNode;
  error?: string;
  helpText: string;
  isInvalid?: boolean;
  required?: boolean;
  title: string;
}) {
  return (
    <section
      className={`grid min-w-0 max-w-full gap-4 rounded-[1.35rem] border bg-white/75 p-4 shadow-[0_4px_14px_rgba(0,101,139,0.035)] ${
        isInvalid || error ? "border-red-300" : "border-white/80"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 break-words font-bold text-[#00658b]">
            {title}
          </h3>
          {required ? <RequiredBadge /> : null}
        </div>
        <p className="mt-1 break-words text-sm leading-6 text-[#40484e]">
          {helpText}
        </p>
      </div>
      {error ? <ValidationMessage>{error}</ValidationMessage> : null}
      {children}
    </section>
  );
}

export function SurveySummaryGrid({
  children,
  columnsClassName = "md:grid-cols-3",
  className = "",
}: {
  children: ReactNode;
  columnsClassName?: string;
  className?: string;
}) {
  return (
    <section
      className={`grid min-w-0 max-w-full gap-3 rounded-2xl border border-[#c4e7ff] bg-[#f3fbff] p-4 text-sm ${columnsClassName} ${className}`}
    >
      {children}
    </section>
  );
}

export function SurveySummaryItem({
  detail,
  label,
  value,
}: {
  detail?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wide text-[#00658b]/70">
        {label}
      </p>
      <p className="mt-1 truncate font-semibold text-[#181c1e]">{value}</p>
      {detail ? (
        <p className="mt-1 break-words text-xs font-medium text-[#40484e]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function RunIdCard({ runId }: { runId: string }) {
  return (
    <section className="min-w-0 max-w-full rounded-2xl border border-[#bfc7cf]/50 bg-white/80 p-4 text-sm">
      <p>
        <span className="font-semibold">Scanreferentie:</span>{" "}
        <span className="break-all font-mono">{runId}</span>
      </p>
      <p className="mt-2 text-[#40484e]">
        De beveiligde sessiesleutel wordt niet getoond.
      </p>
    </section>
  );
}

export function TechnicalStatus({
  children,
  summary = "Technische status",
}: {
  children: ReactNode;
  summary?: string;
}) {
  return (
    <details className="rounded-2xl border border-[#bfc7cf]/45 bg-white/45 p-4 text-sm">
      <summary className="cursor-pointer text-sm font-bold text-[#00658b]">
        {summary}
      </summary>
      <div className="mt-4 grid gap-3">{children}</div>
    </details>
  );
}

export function RpcStepRow({
  label,
  state,
}: {
  label: string;
  state: RpcStepState;
}) {
  return (
    <div className="grid gap-2 rounded-xl border border-[#bfc7cf]/50 bg-white px-4 py-3 sm:grid-cols-[250px_90px_1fr] sm:items-center">
      <span className="font-mono text-sm font-semibold text-[#181c1e]">
        {label}
      </span>
      <span
        className="w-max rounded-full border border-[#bfc7cf]/60 px-2.5 py-1 text-xs font-semibold text-[#40484e]"
        data-status={state.status}
      >
        {state.status}
      </span>
      <span className="break-words text-sm text-[#40484e]">
        {state.message}
      </span>
    </div>
  );
}

export function EmptySurveyState({
  children,
  href = "/survey",
  linkLabel = "Terug naar start",
  title = "Geen actieve scan",
}: {
  children: ReactNode;
  href?: string;
  linkLabel?: string;
  title?: string;
}) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f7fafc] px-6 text-[#181c1e]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-44 -top-44 h-[34rem] w-[34rem] rounded-full bg-[#7dd0ff]/30 blur-[80px]" />
        <div className="absolute -bottom-44 -right-36 h-[30rem] w-[30rem] rounded-full bg-[#bae6ff]/35 blur-[90px]" />
      </div>
      <section className="max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-6 text-center shadow-[0_8px_40px_rgba(0,101,139,0.06)] backdrop-blur">
        <h1 className="mb-2 text-2xl font-bold">{title}</h1>
        <p className="mb-5 text-sm leading-6 text-[#40484e]">{children}</p>
        <a
          className="inline-flex h-11 items-center rounded-full bg-[#004c6a] px-6 text-sm font-bold text-white"
          href={href}
        >
          {linkLabel}
        </a>
      </section>
    </main>
  );
}
