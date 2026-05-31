import React, { type CSSProperties } from "react";

type CertificateVariant = "literacy" | "proficiency" | "mastery";

const VARIANTS: Record<CertificateVariant, {
  title: string;
  credential: string;
  version: string;
  meta: string;
  competencies: string[];
  critical: string[];
}> = {
  literacy: {
    title: "AI Literacy Foundation",
    credential: "RouteAI AI Literacy",
    version: "RAI-AILIT-01 - v2026.1",
    meta: "Interne evidence voor AI-geletterdheid",
    competencies: ["C1 AI-basis", "C2 Context", "C3 Risico", "C4 Privacy", "C5 Output", "C6 Oversight", "C7 Taak", "C8 Escalatie"],
    critical: ["C4 Privacy", "C6 Oversight"],
  },
  proficiency: {
    title: "AI Proficiency",
    credential: "RouteAI AI Proficiency",
    version: "RAI-AIPRO-01 - v2026.1",
    meta: "Bekwaamheid in taakgericht AI-gebruik",
    competencies: ["P1 Werkproces", "P2 Framing", "P3 Prompting", "P4 Data", "P5 Output", "P6 Bias", "P7 Oversight", "P8 Escalatie"],
    critical: ["P4 Data", "P7 Oversight"],
  },
  mastery: {
    title: "AI Mastery",
    credential: "RouteAI AI Mastery",
    version: "RAI-AIMAS-01 - v2026.1",
    meta: "Governance, oversight en evidence op procesniveau",
    competencies: ["M1 Triage", "M2 Governance", "M3 Oversight", "M4 Risico", "M5 Data & bias", "M6 Leveranciers", "M7 Transparantie", "M8 Evidence"],
    critical: ["M3 Oversight", "M8 Evidence"],
  },
};

export function CourseCertificateSuccess({
  learnerName = "Jouw naam",
  variant,
}: {
  learnerName?: string | null;
  variant: CertificateVariant;
}) {
  const config = VARIANTS[variant];
  const date = new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <section className={`course-certificate-success certificate-${variant}`} aria-label={`${config.title} behaald`}>
      <div className="certificate-confetti" aria-hidden="true">
        {Array.from({ length: variant === "mastery" ? 18 : 14 }).map((_, index) => (
          <span key={index} style={{ "--i": index } as CSSProperties} />
        ))}
      </div>
      <article className="certificate-card">
        <header>
          <span className="certificate-check" aria-hidden="true">
            <svg viewBox="0 0 44 44" focusable="false">
              <circle cx="22" cy="22" r="18" />
              <path d="M14 22.5 20 28 31 16" />
            </svg>
          </span>
          <span>Certificaat behaald</span>
          <h2>{config.title}</h2>
        </header>
        <div className="certificate-body">
          <span className="certificate-label">Uitgereikt aan</span>
          <strong>{learnerName || "Jouw naam"}</strong>
          <dl>
            <div>
              <dt>Credential</dt>
              <dd>{config.credential}</dd>
            </div>
            <div>
              <dt>Versie</dt>
              <dd>{config.version}</dd>
            </div>
            <div>
              <dt>Behaald op</dt>
              <dd>{date}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>Intern geldig</dd>
            </div>
          </dl>
          <div className="certificate-competencies" aria-label="Gedemonstreerde competenties">
            {config.competencies.map((competency) => (
              <span className={config.critical.includes(competency) ? "critical" : ""} key={competency}>
                {competency}
              </span>
            ))}
          </div>
          <p>{config.meta}. Dit is geen externe licentie, wettelijke vrijwaring of formele AI Act-certificering.</p>
        </div>
      </article>
    </section>
  );
}
