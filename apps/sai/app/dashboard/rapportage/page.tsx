import type { CSSProperties, ReactNode } from "react";
import {
  DashboardAccessPanel,
  DashboardShell,
  EmptyDashboardState,
  MaterialIcon,
  getDashboardAccess,
} from "@/components/dashboard-shell";
import {
  formatCode,
  getReportSummary,
  type ReportExportRow,
} from "../_lib/dashboard-data";

export default async function ReportsDashboardPage() {
  const access = await getDashboardAccess();

  if (access.kind !== "authorized") {
    return (
      <DashboardShell active="rapportage">
        <DashboardAccessPanel access={access} />
      </DashboardShell>
    );
  }

  const summary = await getReportSummary(access.roleState.orgId);
  const auditCompleteness =
    summary.completedRuns > 0
      ? Math.round((summary.scoredRuns / summary.completedRuns) * 100)
      : 0;
  const shownExports = summary.exports.slice(0, 5);

  return (
    <DashboardShell active="rapportage">
      <div className="space-y-8">
        <header>
          <h1 className="mb-1 font-headline text-3xl font-extrabold tracking-tight text-[#2a3439]">
            Rapportage
          </h1>
          <p className="text-sm font-medium text-[#566166]">
            Genereer exportpakketten, bekijk de rapportgeschiedenis en beheer geplande exports op
            basis van de V8.1 scoreformule.
          </p>
          <MetaBar
            cells={[
              ["Rapportageronde", "Huidige scanronde"],
              ["Status", reportStatusLabel(summary.latestExportStatus)],
              ["Peildatum", new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })],
              ["Snapshot", `${summary.completedRuns} runs`, true],
              ["Scoringversie", "V8.1"],
              ["Verantwoordelijke", "DPO"],
            ]}
          />
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ReportBuilder />
          <aside className="flex flex-col gap-4">
            <AuditPackageCard percent={auditCompleteness} summary={summary} />
            <ScheduledExportsCard />
            <LegalBoundaryCard />
          </aside>
        </section>

        <ExportConfigurationCard />
        <InnovationOpportunitiesCard ambassadorOptIns={summary.ambassadorOptIns} />
        <ReportHistoryCard exports={shownExports} total={summary.exportCount} />

        <footer className="pb-4">
          <div className="flex items-start gap-2 border-t border-[#e2e8f0] pt-4">
            <MaterialIcon className="mt-0.5 text-[14px] text-[#94a3b8]">info</MaterialIcon>
            <p className="text-[11px] leading-relaxed text-[#94a3b8]">
              Review- en juridische signalen zijn indicatief en gebaseerd op zelfrapportage.
              Menselijk oordeel blijft leidend.
            </p>
          </div>
        </footer>
      </div>
    </DashboardShell>
  );
}

function MetaBar({ cells }: { cells: Array<[string, string, boolean?]> }) {
  return (
    <div className="mt-5 flex flex-wrap overflow-hidden rounded-xl border border-[#dbe3ec] bg-white">
      {cells.map(([label, value, mono]) => (
        <div
          className="min-w-[110px] flex-1 border-r border-[#eef2f6] px-[18px] py-3 last:border-r-0"
          key={label}
        >
          <p className="font-headline text-[10px] font-extrabold uppercase leading-none tracking-[.1em] text-[#94a3b8]">
            {label}
          </p>
          <p
            className={`mt-[5px] truncate font-headline text-[13px] font-bold leading-tight text-[#1e293b] ${
              mono ? "font-mono text-[12px]" : ""
            }`}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

function ReportBuilder() {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
      <div className="border-b border-[#eef2f7] px-7 pb-5 pt-6">
        <div className="flex items-start gap-3">
          <ReportIcon className="h-[34px] w-[34px] text-sky-500" name="add_chart" />
          <div>
            <h2 className="font-headline text-xl font-bold text-[#2a3439]">
              Nieuw rapport aanmaken
            </h2>
            <p className="mt-1 text-sm text-[#566166]">
              Kies een sjabloon, periode en exportformaat
            </p>
          </div>
        </div>
      </div>

      <div className="p-7">
        <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
          <div>
            <SectionLabel>Rapportsjabloon</SectionLabel>
            <div className="space-y-2">
              {REPORT_TEMPLATES.map((template, index) => (
                <TemplateCard active={index === 0} key={template.title} template={template} />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <SelectBlock
              icon="calendar"
              label="Periode"
              options={[
                "Huidige scanronde",
                "Afgelopen 30 dagen",
                "Kwartaal tot heden",
                "Jaar tot heden",
                "Aangepaste periode...",
              ]}
            />
            <SelectBlock
              icon="building"
              label="Scope"
              options={[
                "Hele organisatie",
                "HR & Recruitment",
                "Finance & Legal",
                "Marketing",
                "IT & Development",
                "Operations",
                "Sales & Account",
              ]}
            />

            <div>
              <SectionLabel>Exportformaat</SectionLabel>
              <div className="flex gap-2">
                <FormatButton active icon="pdf" label="PDF" />
                <FormatButton icon="csv" label="CSV" />
                <FormatButton icon="table" label="Excel" />
              </div>
            </div>

            <div className="mt-auto pt-2">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0E5A75] p-[13px] font-headline text-[13px] font-bold text-white shadow-sm transition hover:bg-[#142d4a]">
                <ReportIcon className="h-[18px] w-[18px]" name="send" />
                Rapport genereren
              </button>
              <p className="mt-2 text-center text-[10px] text-[#94a3b8]">
                Scores gefixeerd op scoring_config V8.1 · reviewdrempel 40 · min. cel 5
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TemplateCard({
  active,
  template,
}: {
  active?: boolean;
  template: (typeof REPORT_TEMPLATES)[number];
}) {
  return (
    <article
      className={`relative flex cursor-pointer items-start gap-3.5 rounded-xl border-[1.5px] p-4 transition ${
        active
          ? "border-[#0E5A75] bg-[#e8f4fb] shadow-[0_0_0_3px_#dbe3ec]"
          : "border-[#e2e8f0] bg-white hover:border-[#dbe3ec] hover:bg-[#e8f4fb]"
      }`}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
        style={{ background: template.bg, color: template.color }}
      >
        <ReportIcon className="h-[18px] w-[18px]" name={template.icon} />
      </span>
      <div className="flex-1">
        <p className="font-headline text-[13px] font-bold text-[#1e293b]">{template.title}</p>
        <p className="mt-0.5 text-[11px] text-[#64748b]">{template.text}</p>
      </div>
      {active ? (
        <span className="absolute bottom-2.5 right-2.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#0E5A75] text-white">
          <ReportIcon className="h-[11px] w-[11px]" name="check" />
        </span>
      ) : null}
    </article>
  );
}

function SelectBlock({
  icon,
  label,
  options,
}: {
  icon: string;
  label: string;
  options: string[];
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="relative">
        <ReportIcon
          className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[#94a3b8]"
          name={icon}
        />
        <select className="w-full cursor-pointer appearance-none rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-2.5 pl-9 pr-4 text-[13px] font-medium text-[#334155] outline-none transition-colors focus:border-[#0E5A75] focus:ring-2 focus:ring-[#dbe3ec]">
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
      </div>
    </div>
  );
}

function FormatButton({
  active = false,
  icon,
  label,
}: {
  active?: boolean;
  icon: string;
  label: string;
}) {
  return (
    <button
      className={`flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-[10px] border-[1.5px] px-1.5 py-2.5 font-headline text-[11px] font-bold transition ${
        active
          ? "border-[#0E5A75] bg-[#0E5A75] text-white"
          : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#dbe3ec] hover:bg-[#e8f4fb] hover:text-[#0E5A75]"
      }`}
      type="button"
    >
      <ReportIcon className="h-5 w-5" name={icon} />
      {label}
    </button>
  );
}

function AuditPackageCard({
  percent,
  summary,
}: {
  percent: number;
  summary: { reviewItems: number; scoredRuns: number; suppressedCells: number };
}) {
  const items = [
    ["#3e6a00", "Scanronde, status en scoring_config_id", true],
    ["#3e6a00", "Drempels, min. celgrootte en triggercodes", true],
    ["#b45309", `Open reviews met triggercodes (${summary.reviewItems})`, false],
    ["#b45309", `Policy snapshot en rapportagesamenvatting`, false],
  ] as const;

  return (
    <InfoCard>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-headline text-xl font-bold text-[#334155]">Audit package</p>
        <span className="font-mono text-[24px] font-black text-[#0E5A75]">{percent}%</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#e2e8f0]">
        <div className="h-full rounded-full bg-[#0E5A75]" style={{ width: `${percent}%` }} />
      </div>
      <div>
        {items.map(([color, text, done]) => (
          <div className="flex items-center gap-2.5 border-b border-[#e2e8f0] py-2.5 last:border-b-0" key={text}>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
            <span className="text-[11px] text-[#334155]">{text}</span>
            <ReportIcon
              className="ml-auto h-3.5 w-3.5"
              name={done ? "check_circle" : "pending"}
              style={{ color }}
            />
          </div>
        ))}
      </div>
    </InfoCard>
  );
}

function ScheduledExportsCard() {
  return (
    <InfoCard>
      <p className="mb-4 font-headline text-xl font-bold text-[#334155]">Geplande exports</p>
      <div className="space-y-3">
        <ScheduleRow checked detail="Elke maandag 08:00 · PDF" title="Wekelijkse audit" />
        <hr className="border-t border-[#e2e8f0]" />
        <ScheduleRow detail="Eerste van elke maand · CSV" title="Inventaris delta" />
        <hr className="border-t border-[#e2e8f0]" />
        <ScheduleRow checked detail="Elk kwartaal · Audit package" title="Kwartaal governance" />
      </div>
    </InfoCard>
  );
}

function ScheduleRow({
  checked = false,
  detail,
  title,
}: {
  checked?: boolean;
  detail: string;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[13px] font-semibold text-[#334155]">{title}</p>
        <p className="mt-0.5 text-[11px] text-[#94a3b8]">{detail}</p>
      </div>
      <span
        className={`relative h-[22px] w-10 shrink-0 rounded-full ${
          checked ? "bg-[#0E5A75]" : "bg-[#cbd5e1]"
        }`}
      >
        <span
          className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow ${
            checked ? "left-[21px]" : "left-[3px]"
          }`}
        />
      </span>
    </div>
  );
}

function LegalBoundaryCard() {
  return (
    <section className="rounded-2xl border border-[#FECACA] bg-[#fdecea] p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 text-[#b4292d]">
          <MaterialIcon className="text-[16px]">gavel</MaterialIcon>
        </div>
        <p className="font-headline text-xl font-bold text-[#b4292d]">Juridische begrenzing</p>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-[#b4292d]">
        EU AI Act-signalen worden <strong>uitsluitend als potentieel signaal</strong> geëxporteerd.
        De scan levert geen formele AI Act- of AVG-kwalificatie.
      </p>
      <div className="rounded-xl bg-white/60 p-3">
        <p className="mb-1 font-mono text-[10px] font-bold text-[#b4292d]">
          export_label = &quot;potential_signal&quot;
        </p>
        <p className="text-[10px] text-[#b4292d]">
          Altijd samen exporteren met methodologische context en reviewdrempel.
        </p>
      </div>
    </section>
  );
}

function ExportConfigurationCard() {
  return (
    <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ReportIcon className="h-9 w-9 text-sky-500" name="dataset" />
          <div>
            <p className="font-headline text-xl font-bold text-[#334155]">
              Export metadata & configuratie
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Beheer de drempelwaarden en controleer welke metadata met de export meegaat
            </p>
          </div>
        </div>
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5">
          <div className="mb-4">
            <p className="font-headline text-xl font-bold text-[#334155]">
              Drempelwaarden beheerconfiguratie
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Instellingen voor nieuwe berekeningen en scanrondes
            </p>
          </div>
          <ConfigRow label="Reviewdrempel" max={60} min={30} unit="exposure ≥" value={40} />
          <ConfigRow label="Toxic shadow" max={70} min={40} unit="shadow >" value={50} />
          <ConfigRow label="Toxic exposure" max={70} min={40} unit="exposure >" value={50} />
          <ConfigRow label="Min. celgrootte" max={10} min={5} unit="n ≥" value={5} />
          <p className="mt-2.5 rounded-[10px] bg-[#e8f4fb] px-2.5 py-2 text-[10px] leading-[1.45] text-[#0E5A75]">
            Wijzigingen gelden voor nieuwe berekeningen of een nieuwe scanronde; historische
            rapportages blijven gekoppeld aan hun gebruikte configuratie.
          </p>
        </div>

        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-headline text-xl font-bold text-[#334155]">Export data</p>
              <p className="mt-1 text-sm text-slate-500">
                Meegeleverd voor audit en reproduceerbaarheid
              </p>
            </div>
            <Pill tone="blue">Auditcontext</Pill>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <ExportMeta label="Scanronde" value="Huidige scanronde · concept" />
            <ExportMeta mono label="Config" value="scoring_config_id: V8.1" />
            <ExportMeta label="Drempels" value="review 40 · toxic 50/50" />
            <ExportMeta label="Privacy" value="min. celgrootte n ≥ 5" />
            <ExportMeta mono label="Reviewitems" value="review_trigger_codes[]" />
            <ExportMeta label="Scope" value="Hele organisatie" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ConfigRow({
  label,
  max,
  min,
  unit,
  value,
}: {
  label: string;
  max: number;
  min: number;
  unit: string;
  value: number;
}) {
  return (
    <div className="border-b border-[#e2e8f0] py-[9px] last:border-b-0">
      <div className="mb-[7px] flex items-center justify-between gap-2.5">
        <span className="text-[11px] font-semibold text-[#64748b]">{label}</span>
        <span className="min-w-11 text-right font-mono text-[12px] font-bold text-[#0E5A75]">
          {unit} {value}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_54px] items-center gap-2">
        <input
          className="w-full accent-[#0E5A75]"
          defaultValue={value}
          max={max}
          min={min}
          readOnly
          type="range"
        />
        <input
          className="w-[54px] rounded-lg border border-[#e2e8f0] px-1.5 py-1.5 text-center font-mono text-[11px] font-bold text-[#1e293b]"
          defaultValue={value}
          readOnly
          type="number"
        />
      </div>
    </div>
  );
}

function ExportMeta({
  label,
  mono = false,
  value,
}: {
  label: string;
  mono?: boolean;
  value: string;
}) {
  return (
    <div className="border-b border-[#eef2f7] pb-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#94a3b8]">{label}</p>
      <p className={`text-[12px] font-bold text-[#1e293b] ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function InnovationOpportunitiesCard({ ambassadorOptIns }: { ambassadorOptIns: number }) {
  return (
    <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <ReportIcon className="mt-0.5 h-[30px] w-[30px] text-sky-500" name="lightbulb" />
          <div>
            <p className="font-headline text-xl font-bold text-[#2a3439]">Innovatiekansen</p>
            <p className="mt-1 text-sm text-[#566166]">
              Optioneel rapportageblok; geen extra risicoscore
            </p>
          </div>
        </div>
        <Pill tone="green">Samenvatting</Pill>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <OpportunityCard
          text="Automatisering, notuleren en kenniszoeken als kansrijke vervolgstappen."
          title="Toekomstige use-cases"
        />
        <OpportunityCard
          text="Shadow use waar geen goedgekeurd intern alternatief beschikbaar is."
          title="Ontbrekende alternatieven"
        />
        <OpportunityCard
          text={`${ambassadorOptIns} respondenten willen meedenken over beleid, training of pilots.`}
          title="Ambassadeurs-opt-in"
        />
      </div>
    </section>
  );
}

function OpportunityCard({ text, title }: { text: string; title: string }) {
  return (
    <article className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
      <p className="mb-1 font-headline text-sm font-bold text-[#334155]">{title}</p>
      <p className="text-sm leading-snug text-slate-500">{text}</p>
    </article>
  );
}

function ReportHistoryCard({ exports, total }: { exports: ReportExportRow[]; total: number }) {
  const displayTotal = Math.max(total, exports.length);
  const totalPages = Math.max(1, Math.ceil(displayTotal / 5));

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04),0_6px_20px_rgba(0,0,0,.04)]">
      <div className="flex items-center justify-between border-b border-[#eef2f7] px-7 py-4">
        <div className="flex items-start gap-3">
          <ReportIcon className="mt-0.5 h-[30px] w-[30px] text-sky-500" name="history" />
          <div>
            <h3 className="font-headline text-xl font-bold text-[#2a3439]">Rapportgeschiedenis</h3>
            <p className="mt-1 text-sm text-[#566166]">
              {exports.length} van {displayTotal} rapporten - gesorteerd op datum
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <div className="relative">
            <ReportIcon
              className="absolute left-2.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[#94a3b8]"
              name="search"
            />
            <input
              className="w-44 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] py-1.5 pl-8 pr-3 text-[12px] outline-none"
              placeholder="Zoek rapport..."
              readOnly
            />
          </div>
          {["filter", "refresh", "download"].map((icon) => (
            <button className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[#eef2f7]" key={icon}>
              <ReportIcon className="h-[17px] w-[17px] text-[#64748b]" name={icon} />
            </button>
          ))}
        </div>
      </div>

      <div className="hidden grid-cols-[2fr_120px_160px_100px_90px_60px] items-center bg-[#f8fafc] px-6 py-2 md:grid">
        {["Rapportnaam", "Type", "Aangemaakt door", "Datum", "Status", "Actie"].map((label, index) => (
          <span
            className={`text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] ${
              index === 5 ? "text-right" : ""
            }`}
            key={label}
          >
            {label}
          </span>
        ))}
      </div>

      {exports.length > 0 ? (
        <div>
          {exports.map((row, index) => (
            <ReportHistoryRow key={`${row.export_type}-${row.created_at ?? index}`} row={row} />
          ))}
        </div>
      ) : (
        <div className="px-7 py-6">
          <EmptyDashboardState
            text="Er zijn nog geen rapportexports geregistreerd. De pagina toont wel alvast welke exportconfiguratie en auditdekking beschikbaar is."
            title="Nog geen exports"
          />
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[#eef2f7] bg-[#f8fafc] px-7 py-3.5">
        <p className="text-[11px] text-[#94a3b8]">
          {exports.length} van {displayTotal} rapporten weergegeven
        </p>
        <div className="flex items-center gap-2">
          <button className="cursor-not-allowed rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-[11px] font-bold text-[#94a3b8] opacity-50">
            Vorige
          </button>
          <button className="h-7 w-7 rounded-lg bg-[#0E5A75] text-[11px] font-bold text-white">
            1
          </button>
          {totalPages >= 2 ? (
            <button className="h-7 w-7 rounded-lg text-[11px] font-bold text-[#64748b] transition-colors hover:bg-[#eef2f7]">
              2
            </button>
          ) : null}
          {totalPages >= 3 ? (
            <button className="h-7 w-7 rounded-lg text-[11px] font-bold text-[#64748b] transition-colors hover:bg-[#eef2f7]">
              3
            </button>
          ) : null}
          {totalPages > 4 ? (
            <span className="flex h-7 w-7 items-center justify-center text-[11px] text-[#94a3b8]">
              ...
            </span>
          ) : null}
          {totalPages > 3 ? (
            <button className="h-7 w-7 rounded-lg text-[11px] font-bold text-[#64748b] transition-colors hover:bg-[#eef2f7]">
              {totalPages}
            </button>
          ) : null}
          <button className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-[11px] font-bold text-[#334155]">
            Volgende
          </button>
        </div>
      </div>
    </section>
  );
}

function ReportHistoryRow({ row }: { row: ReportExportRow }) {
  const meta = reportTypeMeta(row.export_type);
  const status = exportStatusMeta(row.export_status);

  return (
    <article className="grid cursor-pointer gap-3 border-b border-[#e2e8f0] px-6 py-3 transition hover:bg-[#eef2f7] last:border-b-0 md:grid-cols-[2fr_120px_160px_100px_90px_60px] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: meta.bg, color: meta.color }}
        >
          <ReportIcon className="h-4 w-4" name={meta.icon} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[#1e293b]">{meta.name}</p>
          <p className="mt-0.5 font-mono text-[10px] text-[#94a3b8]">
            {meta.format} · {formatFileSize(row.file_size_bytes)}
          </p>
        </div>
      </div>
      <Pill tone={meta.pillTone}>{meta.type}</Pill>
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f4fb] font-headline text-[9px] font-bold text-[#0E5A75]">
          MJ
        </div>
        <span className="text-[12px] text-[#334155]">DPO-team</span>
      </div>
      <span className="text-[12px] text-[#64748b]">{formatDate(row.created_at)}</span>
      <Pill dotColor={status.dot} tone={status.tone}>{status.label}</Pill>
      <div className="flex justify-end gap-1">
        <button className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-[#e8f4fb]">
          <ReportIcon className="h-[15px] w-[15px] text-[#0E5A75]" name="download" />
        </button>
        <button className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-[#eef2f7]">
          <ReportIcon className="h-[15px] w-[15px] text-[#64748b]" name="external" />
        </button>
      </div>
    </article>
  );
}

function InfoCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 font-headline text-[10px] font-bold uppercase tracking-[.1em] text-[#94a3b8]">
      {children}
    </p>
  );
}

function Pill({
  children,
  dotColor,
  tone,
}: {
  children: ReactNode;
  dotColor?: string;
  tone: "amber" | "blue" | "green" | "grey" | "red";
}) {
  const tones = {
    amber: "bg-[#fff7ed] text-[#b45309]",
    blue: "bg-[#e8f4fb] text-[#0E5A75]",
    green: "bg-[#e6f4cf] text-[#3e6a00]",
    grey: "bg-[#eef2f7] text-[#64748b]",
    red: "bg-[#fdecea] text-[#b4292d]",
  };

  return (
    <span className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-full px-2.5 py-[3px] font-headline text-[10px] font-bold ${tones[tone]}`}>
      {dotColor ? <span className="h-[5px] w-[5px] rounded-full" style={{ background: dotColor }} /> : null}
      {children}
    </span>
  );
}

const REPORT_TEMPLATES = [
  {
    bg: "#e8f4fb",
    color: "#0E5A75",
    icon: "analytics",
    text: "Risico- en governance-KPI's op hoofdlijnen voor directie",
    title: "Management samenvatting",
  },
  {
    bg: "#e6f4cf",
    color: "#3e6a00",
    icon: "hub",
    text: "Gedetailleerde analyse per organisatieonderdeel",
    title: "Afdelingsanalyse",
  },
  {
    bg: "#fff7ed",
    color: "#b45309",
    icon: "verified",
    text: "Aansluiting op regelgeving en gapanalyse",
    title: "Compliance audit",
  },
  {
    bg: "#f5f3ff",
    color: "#5b21b6",
    icon: "inventory",
    text: "Volledig overzicht van gebruikte AI-tools en beleidsstatus",
    title: "Tool inventaris",
  },
  {
    bg: "#fdecea",
    color: "#b4292d",
    icon: "folder",
    text: "KPI's, methodiek, open reviews en DPO-duiding",
    title: "Audit package",
  },
  {
    bg: "#ecfeff",
    color: "#0e7490",
    icon: "rule_folder",
    text: "Export met cluster-ID's en triagevelden",
    title: "Open reviews export",
  },
] as const;

function ReportIcon({
  className,
  name,
  style,
}: {
  className?: string;
  name: string;
  style?: CSSProperties;
}) {
  const common = {
    "aria-hidden": true,
    className,
    fill: "none",
    style,
    viewBox: "0 0 24 24",
  } as const;

  if (name === "add_chart") {
    return <svg {...common}><path d="M4 19h16M7 16V9m5 7V5m5 11v-4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /><path d="M17 4v4M15 6h4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
  }
  if (name === "analytics") return <svg {...common}><path d="M4 19V5m0 14h16M8 15v-4m4 4V8m4 7v-6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
  if (name === "hub") return <svg {...common}><circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" /><circle cx="18" cy="6" r="2.5" stroke="currentColor" strokeWidth="2" /><circle cx="18" cy="18" r="2.5" stroke="currentColor" strokeWidth="2" /><path d="M8.4 11 15.6 7M8.4 13 15.6 17" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
  if (name === "verified") return <svg {...common}><path d="M12 3 18 5v6c0 4-2.4 7.4-6 9-3.6-1.6-6-5-6-9V5l6-2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" /><path d="m9 12 2 2 4-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
  if (name === "inventory") return <svg {...common}><path d="M4 7.5 12 3l8 4.5-8 4.5L4 7.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" /><path d="M4 12.5 12 17l8-4.5M4 17.5 12 22l8-4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
  if (name === "folder") return <svg {...common}><path d="M3 7.5h7l2 2h9v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" /><path d="M8 13h8M9 16h6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
  if (name === "rule_folder") return <svg {...common}><path d="M3 7h7l2 2h9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" /><path d="m8 14 2 2 4-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
  if (name === "calendar") return <svg {...common}><rect height="16" rx="2" stroke="currentColor" strokeWidth="2" width="18" x="3" y="5" /><path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
  if (name === "building") return <svg {...common}><path d="M5 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M3 21h18M9 7h4M9 11h4M9 15h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
  if (name === "pdf") return <svg {...common}><path d="M6 3h8l4 4v14H6V3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" /><path d="M14 3v5h4M8 16h8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
  if (name === "csv") return <svg {...common}><path d="M4 5h16M4 12h16M4 19h16M8 5v14M16 5v14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
  if (name === "table") return <svg {...common}><rect height="16" rx="2" stroke="currentColor" strokeWidth="2" width="18" x="3" y="4" /><path d="M3 10h18M9 4v16" stroke="currentColor" strokeWidth="2" /></svg>;
  if (name === "send") return <svg {...common}><path d="m3 11 18-8-8 18-2-8-8-2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" /></svg>;
  if (name === "check") return <svg {...common}><path d="m6 12 4 4 8-8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" /></svg>;
  if (name === "check_circle") {
    return (
      <svg aria-hidden="true" className={className} fill="none" style={style} viewBox="0 0 24 24">
        <circle cx="12" cy="12" fill="currentColor" r="8" />
        <path d="m8.5 12 2.3 2.3 4.9-5" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }
  if (name === "pending" || name === "history") return <svg {...common}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 2" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
  if (name === "dataset") return <svg {...common}><path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" stroke="currentColor" strokeWidth="2" /></svg>;
  if (name === "lightbulb") return <svg {...common}><path d="M8 14a6 6 0 1 1 8 0c-1 1-1.5 1.6-1.7 3H9.7C9.5 15.6 9 15 8 14Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" /><path d="M10 21h4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
  if (name === "search") return <svg {...common}><circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2" /><path d="m15 15 5 5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
  if (name === "filter") return <svg {...common}><path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
  if (name === "refresh") return <svg {...common}><path d="M20 7v5h-5M4 17v-5h5M18 12a6 6 0 0 0-10-4.5M6 12a6 6 0 0 0 10 4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
  if (name === "download") return <svg {...common}><path d="M12 4v10m0 0 4-4m-4 4-4-4M5 20h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
  if (name === "external") return <svg {...common}><path d="M14 4h6v6M20 4l-9 9M10 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;

  return <svg {...common}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" /></svg>;
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 16 16">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function reportStatusLabel(status: string) {
  if (status === "geen export") return "Concept";
  return formatCode(status);
}

function reportTypeMeta(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("tool") || normalized.includes("inventaris")) {
    return { bg: "#e6f4cf", color: "#3e6a00", format: "CSV", icon: "dataset", name: "Tool inventaris update", pillTone: "grey" as const, type: "Inventaris" };
  }
  if (normalized.includes("review")) {
    return { bg: "#ecfeff", color: "#0e7490", format: "CSV", icon: "rule_folder", name: "Open reviews export", pillTone: "grey" as const, type: "Reviews" };
  }
  if (normalized.includes("audit") || normalized.includes("compliance")) {
    return { bg: "#e8f4fb", color: "#0E5A75", format: "PDF", icon: "folder", name: "Compliance audit", pillTone: "blue" as const, type: "Compliance" };
  }
  return { bg: "#e8f4fb", color: "#0E5A75", format: "PDF", icon: "analytics", name: formatCode(type), pillTone: "blue" as const, type: "Management" };
}

function exportStatusMeta(status: string) {
  if (status === "ready" || status === "completed") {
    return { dot: "#3e6a00", label: "Gereed", tone: "green" as const };
  }
  if (status === "failed") return { dot: "#b4292d", label: "Mislukt", tone: "red" as const };
  if (status === "processing") return { dot: "#b45309", label: "Verwerken", tone: "amber" as const };
  return { dot: undefined, label: formatCode(status), tone: "grey" as const };
}

function formatDate(value: string | null) {
  if (!value) return "Onbekend";
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFileSize(value: number | string | null) {
  const bytes = typeof value === "string" ? Number(value) : value;

  if (!bytes || !Number.isFinite(bytes)) return "automatisch";
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes > 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
