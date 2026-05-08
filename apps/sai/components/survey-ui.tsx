import type { ReactNode } from "react";

export type RpcStepState = {
  status: "idle" | "running" | "ok" | "error";
  message: string;
};

export function RequiredBadge() {
  return (
    <span className="rounded-full border border-[#bfc7cf]/60 bg-white px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-[#40484e]">
      Verplicht
    </span>
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
      className={`grid gap-4 rounded-2xl border bg-white/70 p-4 ${
        isInvalid || error ? "border-red-300" : "border-[#bfc7cf]/50"
      }`}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-[#00658b]">{title}</h3>
          {required ? <RequiredBadge /> : null}
        </div>
        <p className="mt-1 text-sm leading-6 text-[#40484e]">{helpText}</p>
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
      className={`grid gap-3 rounded-2xl border border-[#c4e7ff] bg-[#f3fbff] p-4 text-sm ${columnsClassName} ${className}`}
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
        <p className="mt-1 truncate text-xs font-medium text-[#40484e]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function RunIdCard({ runId }: { runId: string }) {
  return (
    <section className="rounded-2xl border border-[#bfc7cf]/50 bg-white/80 p-4 text-sm">
      <p>
        <span className="font-semibold">Run ID:</span>{" "}
        <span className="font-mono">{runId}</span>
      </p>
      <p className="mt-2 text-[#40484e]">
        Submission token blijft alleen in respondent session state.
      </p>
    </section>
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
    <main className="grid min-h-screen place-items-center bg-[#f7fafc] px-6 text-[#181c1e]">
      <section className="max-w-md rounded-2xl border border-[#bfc7cf]/50 bg-white p-6 text-center shadow-sm">
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
