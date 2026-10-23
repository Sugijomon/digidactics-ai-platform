"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  Building2,
  Check,
  Eye,
  LockKeyhole,
  Mail,
  Plus,
  RefreshCw,
  Upload,
  Users,
} from "lucide-react";
import type {
  ActivationMetrics,
  ActivationOrgContext,
  ProgressSummary,
} from "../_lib/dashboard-data";

type InviteMode = "Iedereen" | "Selectie" | "Herinnering";
type ParticipantStatus = "Afgerond" | "Verzonden" | "Herinnering";

type Participant = {
  department: string;
  email: string;
  invitedAt: string;
  name: string;
  status: ParticipantStatus;
};

type OrgForm = {
  disclosureEnd: string;
  disclosureStart: string;
  dpoEmail: string;
  dpoName: string;
  dpoPhone: string;
  employeeCount: string;
  organizationName: string;
  sector: string;
};

const ACTIVATION_PARTICIPANTS: Participant[] = [];
const EMPTY_INVITATION_MESSAGE = "";

export function ActivationDashboardClient({
  metrics,
  orgContext,
  progress,
}: {
  metrics: ActivationMetrics;
  orgContext: ActivationOrgContext;
  progress: ProgressSummary;
}) {
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [inviteMode, setInviteMode] = useState<InviteMode>("Iedereen");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    department: "",
    email: "",
    invitedAt: "",
    name: "",
    status: "",
  });
  const [orgForm, setOrgForm] = useState({
    disclosureEnd: toDateInput(metrics.latestWaveEndsAt) ?? "",
    disclosureStart: toDateInput(metrics.latestWaveStartsAt) ?? "",
    dpoEmail: orgContext.dpoEmail,
    dpoName: orgContext.dpoName,
    dpoPhone: orgContext.dpoPhone,
    employeeCount: orgContext.employeeCount > 0 ? String(orgContext.employeeCount) : "",
    organizationName: orgContext.organizationName,
    sector: orgContext.sector,
  });
  const [template, setTemplate] = useState({
    message: EMPTY_INVITATION_MESSAGE,
    signature: "",
    subject: "",
  });

  const filteredParticipants = ACTIVATION_PARTICIPANTS.filter((participant) => {
    const nameMatch = participant.name
      .toLowerCase()
      .includes(filters.name.toLowerCase());
    const emailMatch = participant.email
      .toLowerCase()
      .includes(filters.email.toLowerCase());
    const departmentMatch =
      !filters.department || participant.department === filters.department;
    const statusMatch = !filters.status || participant.status === filters.status;
    const invitedMatch = participant.invitedAt
      .toLowerCase()
      .includes(filters.invitedAt.toLowerCase());

    return nameMatch && emailMatch && departmentMatch && statusMatch && invitedMatch;
  });
  const participantDepartments = Array.from(
    new Set(ACTIVATION_PARTICIPANTS.map((participant) => participant.department)),
  );
  const allVisibleSelected =
    filteredParticipants.length > 0 &&
    filteredParticipants.every((participant) => selectedRows.includes(participant.email));
  const notResponded = Math.max(metrics.invitedRuns - metrics.completedRuns, 0);
  const responseRows = progress.departments
    .slice(0, 8)
    .map(([code, count]) => [formatCode(code), count] as [string, number]);
  const responseTotal = progress.totalCompleted;

  function toggleVisibleRows() {
    if (allVisibleSelected) {
      setSelectedRows((current) =>
        current.filter(
          (email) =>
            !filteredParticipants.some((participant) => participant.email === email),
        ),
      );
      return;
    }

    setSelectedRows((current) =>
      Array.from(
        new Set([
          ...current,
          ...filteredParticipants.map((participant) => participant.email),
        ]),
      ),
    );
  }

  return (
    <section className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-[#2a3439]">
          Activatie
        </h1>
        <p className="mt-1 max-w-5xl text-sm font-medium leading-6 text-[#566166]">
          Beheer de uitnodigingslijst, volg de responsgraad en bekijk de verdeling van
          deelname per vakgebied. Individuele deelnemers worden niet getoond in de
          rapportage.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.8)] md:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
          <KpiCard helper="Survey-sessies" label="Gestart" value={metrics.startedRuns} />
          <KpiCard
            helper="Totaal ontvangen reacties"
            label="Afgerond"
            value={metrics.completedRuns}
          />
          <KpiCard
            accent="#5C9E1A"
            helper=""
            label="Responsgraad"
            progress={metrics.responseRate}
            suffix="%"
            value={metrics.responseRate}
          />
          <KpiCard helper="Gestart maar niet afgerond" label="Nog open" value={notResponded} />
          <KpiCard
            accent="#D08212"
            helper="Scanrondes met status open"
            label="Actieve rondes"
            value={metrics.activeWaves}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#dbe3ec] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
        <div className="p-8">
          <SectionTitle
            icon={<Building2 className="h-7 w-7" />}
            subtitle="Deze gegevens zijn bekend bij RouteAI en worden gebruikt voor uw organisatieprofiel. U kunt deze hier wijzigen indien de bedrijfsgegevens of de hoofdverantwoordelijke veranderen."
            title="Organisatie"
          />
          <div className="mt-8 grid items-stretch gap-4 lg:grid-cols-3">
            <OrgCard
              fields={[
                ["Organisatie", "organizationName", "text"],
                ["Sector", "sector", "select"],
                ["Aantal medewerkers", "employeeCount", "number"],
              ]}
              form={orgForm}
              isEditing={isEditingOrg}
              onChange={(key, value) =>
                setOrgForm((current) => ({ ...current, [key]: value }))
              }
              subtitle="Organisatienaam, sector en omvang"
              title="Organisatiecontext"
            />
            <OrgCard
              fields={[
                ["Naam", "dpoName", "text"],
                ["Emailadres", "dpoEmail", "email"],
                ["Telefoonnummer (optioneel)", "dpoPhone", "text"],
              ]}
              form={orgForm}
              isEditing={isEditingOrg}
              onChange={(key, value) =>
                setOrgForm((current) => ({ ...current, [key]: value }))
              }
              subtitle="Contactpersoon binnen uw organisatie"
              title="AI-verantwoordelijke"
            />
            <OrgCard
              badge={metrics.latestWaveStatus === "active" ? "Open" : "Concept"}
              fields={[
                ["Start activatieperiode", "disclosureStart", "date"],
                ["Einde activatieperiode", "disclosureEnd", "date"],
              ]}
              form={orgForm}
              isEditing={isEditingOrg}
              meta={[
                ["Scanronde", metrics.latestWaveName],
                ["Status", metrics.latestWaveStatus === "active" ? "Open" : "Concept"],
              ]}
              metaPosition="after"
              onChange={(key, value) =>
                setOrgForm((current) => ({ ...current, [key]: value }))
              }
              subtitle="Periode instellen en versie-informatie."
              title="Activatieperiode"
            />
            <div className="flex justify-end gap-3 lg:col-start-3">
              <button
                className="min-w-[120px] flex-1 rounded-lg border border-sky-200 bg-sky-50 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-sky-100 lg:flex-none"
                onClick={() => setIsEditingOrg(true)}
                type="button"
              >
                Aanpassen
              </button>
              <button
                className="min-w-[120px] flex-1 rounded-lg bg-[#0E5A75] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0A4B61] lg:flex-none"
                onClick={() => setIsEditingOrg(false)}
                type="button"
              >
                Opslaan
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-[#dbe3ec] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
        <div className="border-b border-slate-100 p-6">
          <SectionTitle
            icon={<Users className="h-7 w-7" />}
            subtitle="Uitnodigingsbeheer wordt pas getoond wanneer er een duurzame roster- of invitebron aan de scanronde is gekoppeld."
            title="Medewerkers"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton disabled icon={<Plus className="h-4 w-4" />}>
              Medewerker toevoegen
            </ActionButton>
            <ActionButton disabled icon={<Upload className="h-4 w-4" />}>
              Bulk uploaden
            </ActionButton>
          </div>
        </div>
        <div className="w-full overflow-hidden">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[56px]" />
              <col className="w-[170px]" />
              <col className="w-[250px]" />
              <col className="w-[150px]" />
              <col className="w-[160px]" />
              <col className="w-[150px]" />
            </colgroup>
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 shadow-[0_12px_18px_-18px_rgba(15,23,42,.22)]">
              <tr>
                <th className="border-b border-slate-100 py-3 pl-4 pr-2">
                  <input
                    checked={allVisibleSelected}
                    className="h-5 w-5 rounded-md border-2 border-sky-500 text-sky-500 focus:ring-sky-500"
                    onChange={toggleVisibleRows}
                    type="checkbox"
                  />
                </th>
                <FilterHead
                  placeholder="Naam"
                  value={filters.name}
                  onChange={(value) => setFilters((current) => ({ ...current, name: value }))}
                />
                <FilterHead
                  placeholder="E-mail"
                  value={filters.email}
                  onChange={(value) => setFilters((current) => ({ ...current, email: value }))}
                />
                <th className="border-b border-slate-100 px-2 py-3">
                  <FilterSelect
                    options={participantDepartments}
                    placeholder="Afdeling"
                    value={filters.department}
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, department: value }))
                    }
                  />
                </th>
                <th className="border-b border-slate-100 px-2 py-3">
                  <FilterSelect
                    options={["Afgerond", "Verzonden", "Herinnering"]}
                    placeholder="Status"
                    value={filters.status}
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, status: value }))
                    }
                  />
                </th>
                <FilterHead
                  className="pl-2 pr-4"
                  placeholder="Uitgenodigd op"
                  value={filters.invitedAt}
                  onChange={(value) =>
                    setFilters((current) => ({ ...current, invitedAt: value }))
                  }
                />
              </tr>
            </thead>
          </table>
          <div className="max-h-[420px] overflow-y-auto overflow-x-hidden pr-2 [scrollbar-gutter:stable]">
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[56px]" />
                <col className="w-[170px]" />
                <col className="w-[250px]" />
                <col className="w-[150px]" />
                <col className="w-[160px]" />
                <col className="w-[150px]" />
              </colgroup>
              <tbody className="divide-y divide-slate-50">
                {filteredParticipants.map((participant) => (
                  <tr
                    className="transition-colors hover:bg-indigo-50/30"
                    key={participant.email}
                  >
                    <td className="px-4 py-3">
                      <input
                        checked={selectedRows.includes(participant.email)}
                        className="h-5 w-5 rounded-md border border-sky-500 text-sky-500 focus:ring-sky-500"
                        onChange={() =>
                          setSelectedRows((current) =>
                            current.includes(participant.email)
                              ? current.filter((email) => email !== participant.email)
                              : [...current, participant.email],
                          )
                        }
                        type="checkbox"
                      />
                    </td>
                    <td className="py-3 pl-2 pr-4">
                      <p className="text-xs font-bold text-slate-800">
                        {participant.name}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {participant.email}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600">
                      {participant.department}
                    </td>
                    <td className="px-4 py-3">
                      <ParticipantStatusPill status={participant.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {participant.invitedAt}
                    </td>
                  </tr>
                ))}
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td
                      className="px-6 py-10 text-center text-sm font-medium text-slate-500"
                      colSpan={6}
                    >
                      Nog geen uitnodigingslijst gekoppeld.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 bg-white px-6 py-3 text-xs font-medium text-slate-500">
            {selectedRows.length} geselecteerd · {filteredParticipants.length} zichtbaar
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="relative z-10 mb-6">
          <SectionTitle
            icon={<Mail className="h-7 w-7" />}
            subtitle="Pas de uitnodiging aan die naar medewerkers wordt verstuurd. Ambassadeurs melden zich alleen vrijwillig aan in de survey; inhoudelijke antwoorden blijven anoniem."
            title="Uitnodigingen maken & versturen"
          />
        </div>
        <div className="relative z-10 grid items-start gap-4 lg:grid-cols-3 lg:items-end">
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
            <div className="space-y-5">
              <FieldLabel>Onderwerpregel</FieldLabel>
              <input
                className="w-full rounded-lg border border-sky-400 bg-white p-3 text-sm font-medium outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                onChange={(event) =>
                  setTemplate((current) => ({ ...current, subject: event.target.value }))
                }
                type="text"
                value={template.subject}
              />
              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <FieldLabel>Berichttekst</FieldLabel>
                  <button
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
                    onClick={() =>
                      setTemplate((current) => ({
                        ...current,
                        message: EMPTY_INVITATION_MESSAGE,
                      }))
                    }
                    type="button"
                  >
                    <RefreshCw className="h-[18px] w-[18px]" />
                    Herstel standaard
                  </button>
                </div>
                <textarea
                  className="min-h-[220px] w-full rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed outline-none focus:ring-1 focus:ring-[#0E5A75]"
                  onChange={(event) =>
                    setTemplate((current) => ({ ...current, message: event.target.value }))
                  }
                  spellCheck={false}
                  value={template.message}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {["[voornaam]", "[manager_naam]", "[org_name]", "[deadline]", "[dpo_email]"].map(
                  (token) => (
                    <span
                      className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                      key={token}
                    >
                      {token}
                    </span>
                  ),
                )}
              </div>
            </div>
            <div className="mt-6 border-t border-slate-50 pt-6">
              <FieldLabel>Ondertekening</FieldLabel>
              <div className="mt-2 flex flex-col items-end gap-3 sm:flex-row">
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium outline-none focus:ring-1 focus:ring-[#0E5A75] sm:flex-1"
                  onChange={(event) =>
                    setTemplate((current) => ({
                      ...current,
                      signature: event.target.value,
                    }))
                  }
                  type="text"
                  value={template.signature}
                />
                <div className="flex gap-3">
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    onClick={() => setPreviewOpen((current) => !current)}
                    type="button"
                  >
                    <Eye className="h-[18px] w-[18px]" />
                    Preview
                  </button>
                  <button
                    className="rounded-lg bg-slate-300 px-4 py-3 text-sm font-semibold text-white shadow-sm"
                    disabled
                    type="button"
                  >
                    Template opslaan
                  </button>
                </div>
              </div>
              {previewOpen ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  <p className="font-bold text-slate-900">{template.subject}</p>
                  <p className="mt-3 whitespace-pre-line">{template.message}</p>
                  <p className="mt-3 font-semibold">{template.signature}</p>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex h-fit flex-col rounded-xl border border-slate-200 bg-slate-50 p-6 lg:self-end">
            <div className="mb-4 text-center">
              <p className="mb-2 text-[13px] font-bold uppercase text-slate-800">
                Uitnodigingen versturen
              </p>
              <p className="text-[14px] font-bold leading-tight text-slate-700">
                De magic link en startknop worden automatisch toegevoegd. Naamniveau
                blijft beperkt tot uitnodigingsbeheer.
              </p>
            </div>
            <div className="space-y-3">
              {(["Iedereen", "Selectie", "Herinnering"] as InviteMode[]).map((mode) => (
                <button
                  aria-pressed={inviteMode === mode}
                  className={`w-full rounded-lg border py-3 text-sm font-semibold transition-colors ${
                    inviteMode === mode
                      ? "border-[#0E5A75] bg-[#BFE7FF] text-[#0E5A75] shadow-sm"
                      : "border-slate-200 bg-white text-slate-400 hover:bg-slate-100"
                  }`}
                  key={mode}
                  onClick={() => setInviteMode(mode)}
                  disabled
                  type="button"
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="pt-5">
              <button
                className="w-full rounded-lg bg-slate-300 py-3 text-sm font-bold text-white shadow-md"
                disabled
                type="button"
              >
                Verstuur uitnodigingen
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 font-headline text-lg font-bold">Tijdlijn</h2>
          <div className="relative space-y-6 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-slate-200">
            <TimelineItem
              active={Boolean(metrics.latestWaveStartsAt)}
              icon={<Check className="h-3.5 w-3.5" />}
              label="Scanronde gestart"
              text={formatDutchDateTime(metrics.latestWaveStartsAt)}
            />
            <TimelineItem
              active={metrics.completedRuns > 0}
              icon={<Check className="h-3.5 w-3.5" />}
              label="Reacties ontvangen"
              text={`${metrics.completedRuns} afgerond`}
            />
            <TimelineItem
              icon={<Mail className="h-3.5 w-3.5" />}
              label="Open survey-sessies"
              primary={notResponded > 0}
              text={`${notResponded} nog open`}
            />
            <TimelineItem
              disabled={!metrics.latestWaveEndsAt}
              icon={<LockKeyhole className="h-3.5 w-3.5" />}
              label="Scanronde eindigt"
              text={formatDutchDateTime(metrics.latestWaveEndsAt)}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#dbe3ec] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)] lg:col-span-2">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-headline text-xl font-bold text-[#2a3439]">
                Respons per vakgebied
              </h2>
              <p className="mt-1 text-xs text-[#566166]">
                Zelfgerapporteerd vakgebied door respondenten · n={responseTotal}
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-[#BFE7FF] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[#0E5A75]">
              Verdeling
            </span>
          </div>
          <div className="space-y-3">
            {responseRows.map(([label, count], index) => {
              const percentage =
                responseTotal > 0 ? Math.round((count / responseTotal) * 100) : 0;
              const barWidth =
                responseRows[0]?.[1] && responseRows[0][1] > 0
                  ? Math.round((count / responseRows[0][1]) * 100)
                  : 0;

              return (
                <div
                  className="grid items-center gap-4 rounded-2xl bg-slate-50 px-4 py-3 md:grid-cols-[190px_minmax(0,1fr)_112px]"
                  key={label}
                >
                  <span className="text-sm font-bold text-slate-800">{label}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full"
                      style={{
                        background: index < 2 ? "#0E5A75" : index < 4 ? "#5C9E1A" : index < 6 ? "#F59E0B" : "#94A3B8",
                        width: `${barWidth}%`,
                      }}
                    />
                  </div>
                  <span className="text-right text-sm font-bold text-slate-800">
                    {count}{" "}
                    <span className="text-xs font-semibold text-slate-500">
                      · {percentage}%
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="mt-auto pt-2 pb-4">
        <div className="border-t border-slate-200/60 pt-4">
          <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-slate-400">
            Review- en juridische signalen zijn indicatief en gebaseerd op
            zelfrapportage. Menselijk oordeel blijft leidend.
          </p>
        </div>
      </footer>
    </section>
  );
}

function KpiCard({
  accent = "#2a3439",
  actionLabel,
  helper,
  label,
  progress,
  suffix = "",
  value,
}: {
  accent?: string;
  actionLabel?: string;
  helper?: string;
  label: string;
  progress?: number;
  suffix?: string;
  value: number;
}) {
  return (
    <article className="rounded-[14px] border border-[rgba(193,201,207,.25)] bg-white p-4 text-center shadow-[0_8px_24px_rgba(26,32,44,.06)] md:p-5">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-tight text-[#566166]">
        {label}
      </p>
      <h3
        className="font-headline text-[clamp(1.75rem,2.2vw,2.25rem)] font-extrabold leading-tight tabular-nums"
        style={{ color: accent }}
      >
        {value}
        {suffix}
      </h3>
      {typeof progress === "number" ? (
        <div className="mt-2 h-[5px] w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-[#5C9E1A]"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      ) : null}
      {actionLabel ? (
        <button
          className="mt-1 block min-h-[2.5em] w-full text-[10px] font-semibold text-[#0E5A75] hover:underline"
          type="button"
        >
          {actionLabel}
        </button>
      ) : (
        <p className="mt-1 flex min-h-[2.5em] items-start justify-center text-center text-[10px] font-medium text-[#566166]">
          {helper}
        </p>
      )}
    </article>
  );
}

function SectionTitle({
  icon,
  subtitle,
  title,
}: {
  icon: ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 shrink-0 text-sky-500">{icon}</span>
      <div className="min-w-0 flex-1">
        <h2 className="font-headline text-xl font-bold text-[#2a3439]">{title}</h2>
        <p className="mt-1 text-sm text-[#566166]">{subtitle}</p>
      </div>
    </div>
  );
}

function OrgCard({
  badge,
  fields,
  form,
  isEditing,
  meta,
  metaPosition = "before",
  onChange,
  subtitle,
  title,
}: {
  badge?: string;
  fields: [string, keyof OrgForm, string][];
  form: OrgForm;
  isEditing: boolean;
  meta?: [string, string][];
  metaPosition?: "after" | "before";
  onChange: (key: keyof OrgForm, value: string) => void;
  subtitle: string;
  title: string;
}) {
  const metaBlock = meta ? (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
      {meta.map(([label, value]) => (
        <div key={label}>
          <p className="mb-0.5 text-[10px] text-slate-400">{label}</p>
          {label === "Status" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {badge ?? value}
            </span>
          ) : (
            <p className="text-[12px] font-semibold text-slate-700">{value}</p>
          )}
        </div>
      ))}
    </div>
  ) : null;

  return (
    <article className="flex min-h-full flex-col rounded-[14px] border border-slate-300 bg-white p-[18px]">
      <h3 className="font-headline text-xl font-bold leading-tight text-slate-800">
        {title}
      </h3>
      <p className="mt-1.5 mb-5 text-[13px] text-slate-500">{subtitle}</p>
      {metaPosition === "before" ? (
        <div className={metaBlock ? "mb-5 border-b border-slate-100 pb-4" : ""}>
          {metaBlock}
        </div>
      ) : null}
      <div className="flex-1 space-y-4">
        {fields.map(([label, key, type]) => (
          <div key={key}>
            <label className="mb-2 block text-[11px] font-extrabold uppercase text-slate-500">
              {label}
            </label>
            {isEditing ? (
              type === "select" ? (
                <select
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                  onChange={(event) => onChange(key, event.target.value)}
                  value={form[key]}
                >
                  <option value="">Niet ingesteld</option>
                  {[
                    "Financial Services",
                    "Healthcare",
                    "Technology",
                    "Manufacturing",
                    "Publieke sector",
                  ].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                  min={key === "disclosureEnd" ? form.disclosureStart : undefined}
                  onChange={(event) => onChange(key, event.target.value)}
                  type={type}
                  value={form[key]}
                />
              )
            ) : (
              <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800">
                {formatOrgFieldValue(form[key], type)}
              </div>
            )}
          </div>
        ))}
      </div>
      {metaPosition === "after" ? <div className="mt-4">{metaBlock}</div> : null}
    </article>
  );
}

function ActionButton({
  children,
  disabled = false,
  icon,
}: {
  children: ReactNode;
  disabled?: boolean;
  icon: ReactNode;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold transition-all ${
        disabled
          ? "cursor-not-allowed bg-slate-100 text-slate-400"
          : "bg-white text-slate-700 hover:bg-slate-50"
      }`}
      disabled={disabled}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="block text-[11px] font-bold uppercase text-slate-500">
      {children}
    </label>
  );
}

function FilterHead({
  className = "px-2",
  onChange,
  placeholder,
  value,
}: {
  className?: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <th className={`border-b border-slate-100 py-3 ${className}`}>
      <input
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </th>
  );
}

function FilterSelect({
  onChange,
  options,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  value: string;
}) {
  return (
    <select
      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function ParticipantStatusPill({ status }: { status: ParticipantStatus }) {
  const styles = {
    Afgerond: "bg-[#E6F4CF] text-[#4D7800]",
    Herinnering: "bg-[#EEF4FA] text-[#6B7C93]",
    Verzonden: "bg-[#FFF1CC] text-[#C77700]",
  }[status];
  const dot = {
    Afgerond: "bg-[#4D7800]",
    Herinnering: "bg-[#94A3B8]",
    Verzonden: "bg-[#F59E0B]",
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${styles}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

function TimelineItem({
  active,
  disabled,
  icon,
  label,
  primary,
  text,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  primary?: boolean;
  text: string;
}) {
  return (
    <div className={`relative pl-8 ${disabled ? "opacity-40" : ""}`}>
      <div
        className={`absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-white ${
          primary
            ? "bg-[#0E5A75] ring-4 ring-sky-100"
            : active
              ? "bg-[#3e6a00]"
              : "bg-slate-300"
        }`}
      >
        {icon}
      </div>
      <p className={`text-xs font-bold ${primary ? "text-[#0E5A75]" : ""}`}>{label}</p>
      <p className="text-[10px] font-medium text-slate-500">{text}</p>
    </div>
  );
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : null;
}

function formatCode(code: string | null | undefined) {
  if (!code) return "Onbekend";

  return code
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDutchDate(value: string) {
  if (!value) return "";

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatOrgFieldValue(value: string, type: string) {
  if (!value) return "Niet ingesteld";
  return type === "date" ? formatDutchDate(value) : value;
}

function formatDutchDateTime(value: string | null) {
  if (!value) return "Nog niet gepland";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
