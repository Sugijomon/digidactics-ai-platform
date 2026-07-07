import { issueAiLiteracyCertification } from "@/app/learning/actions";
import { CourseCertificateSuccess } from "@/components/learning/CourseCertificateSuccess";
import {
  type AiLiteracyCompetencyCode,
  type LessonBlock,
} from "@digidactics/domain/learning";
import type {
  LearnerStateView,
  LearningAttemptView,
  LearningCourseView,
  LearningPageView,
} from "@/lib/learning-preview-data";
import { getCoursePages } from "@/lib/learning-preview-data";

const COMPETENCIES: Array<{
  code: AiLiteracyCompetencyCode;
  label: string;
  shortLabel: string;
}> = [
  { code: "C1_AI_HERKENNEN", label: "AI herkennen", shortLabel: "C1" },
  { code: "C2_CONTEXT_BEGRIJPEN", label: "Context begrijpen", shortLabel: "C2" },
  { code: "C3_RISICO_ROLBEWUSTZIJN", label: "Risico en rol", shortLabel: "C3" },
  { code: "C4_DATA_PRIVACY", label: "Data en privacy", shortLabel: "C4" },
  { code: "C5_OUTPUTCONTROLE", label: "Outputcontrole", shortLabel: "C5" },
  { code: "C6_HUMAN_OVERSIGHT", label: "Human oversight", shortLabel: "C6" },
  { code: "C7_TAAKSELECTIE", label: "Taakselectie", shortLabel: "C7" },
  { code: "C8_ESCALATIE_BEWIJS", label: "Escalatie en bewijs", shortLabel: "C8" },
];

export function CompetencyStatusPanel({
  course,
  learnerState,
}: {
  course: LearningCourseView;
  learnerState: LearnerStateView;
}) {
  const pages = getCoursePages(course);
  const evidenceRows = buildEvidenceRows(pages, learnerState);
  const satisfiedCompetencyCodes = new Set(
    evidenceRows
      .filter((row) => row.status === "satisfied")
      .flatMap((row) => row.competencyCodes),
  );
  const isReadyForCertification =
    evidenceRows.length > 0 &&
    evidenceRows.every((row) => row.status === "satisfied") &&
    COMPETENCIES.every((competency) => satisfiedCompetencyCodes.has(competency.code));
  const activeCertificate = learnerState.accessCheck?.certification_status === "active";
  const canIssue = learnerState.isAuthenticated && isReadyForCertification && !activeCertificate;
  const mainStatus = activeCertificate
    ? "Rijbewijs actief"
    : isReadyForCertification
      ? "Bewijs compleet"
      : "Bewijs nog niet compleet";

  return (
    <section className="competency-status-panel" aria-label="AI-rijbewijs competenties">
      <div className="competency-status-head">
        <div>
          <span>Competency mapping</span>
          <h2>C1-C8 bewijs voor je AI-rijbewijs</h2>
          <p>
            Het systeem kijkt niet alleen naar afronden, maar naar aangetoonde evidence per competentie.
          </p>
        </div>
        <strong className={activeCertificate || isReadyForCertification ? "is-ready" : ""}>{mainStatus}</strong>
      </div>

      <div className="competency-grid">
        {COMPETENCIES.map((competency) => {
          const status = getCompetencyStatus(competency.code, evidenceRows);

          return (
            <article className={`competency-card ${status.tone}`} key={competency.code}>
              <div>
                <span>{competency.shortLabel}</span>
                <strong>{competency.label}</strong>
              </div>
              <p>{status.label}</p>
              <small>{status.detail}</small>
            </article>
          );
        })}
      </div>

      {isReadyForCertification ? (
        <>
          <CourseCertificateSuccess variant="literacy" />
          <div className="competency-issue-row">
            <p>
              Alle kritieke competenties hebben opgeslagen evidence. De RouteAI access gate is{" "}
              {activeCertificate ? "actief" : "klaar voor de definitieve certificaatcheck"}.
            </p>
            {canIssue ? (
              <form action={issueAiLiteracyCertification}>
                <input name="courseId" type="hidden" value={course.id} />
                <input name="courseCode" type="hidden" value={course.course_code} />
                <button type="submit">Geef rijbewijs uit</button>
              </form>
            ) : activeCertificate ? (
              <span>Certificaat: {learnerState.accessCheck?.required_certification_code ?? "actief"}</span>
            ) : null}
          </div>
        </>
      ) : (
        <EvidenceGapList evidenceRows={evidenceRows} />
      )}
    </section>
  );
}

function EvidenceGapList({ evidenceRows }: { evidenceRows: EvidenceRow[] }) {
  const openRows = evidenceRows.filter((row) => row.status !== "satisfied").slice(0, 5);

  if (!openRows.length) {
    return null;
  }

  return (
    <div className="competency-evidence-list">
      <span>Nog nodig of in review</span>
      {openRows.map((row) => (
        <p key={`${row.pageId}-${row.blockId}`}>
          <strong>{row.pageTitle}</strong>
          {row.blockLabel ? ` - ${row.blockLabel}` : ""}: {row.label}
        </p>
      ))}
    </div>
  );
}

interface EvidenceRow {
  blockId: string;
  blockLabel: string;
  competencyCodes: AiLiteracyCompetencyCode[];
  label: string;
  pageId: string;
  pageTitle: string;
  status: "satisfied" | "missing" | "review" | "failed";
}

function buildEvidenceRows(pages: LearningPageView[], learnerState: LearnerStateView): EvidenceRow[] {
  return pages.flatMap((page) => {
    const pageStatus = getPageStatus(page, learnerState);
    const attempt = learnerState.attemptsByPageId[page.id] ?? null;

    return page.content.blocks
      .filter((block) => block.required_for_certificate && block.competency_codes?.length)
      .map((block) => {
        const blockStatus = getEvidenceStatus(block, pageStatus, attempt);

        return {
          blockId: block.id,
          blockLabel: getBlockLabel(block),
          competencyCodes: block.competency_codes ?? [],
          label: blockStatus.label,
          pageId: page.id,
          pageTitle: page.title,
          status: blockStatus.status,
        };
      });
  });
}

function getCompetencyStatus(
  code: AiLiteracyCompetencyCode,
  evidenceRows: EvidenceRow[],
) {
  const relatedRows = evidenceRows.filter((row) => row.competencyCodes.includes(code));
  const satisfiedCount = relatedRows.filter((row) => row.status === "satisfied").length;

  if (relatedRows.length > 0 && satisfiedCount === relatedRows.length) {
    return {
      detail: `${satisfiedCount}/${relatedRows.length} evidence afgerond`,
      label: "Aangetoond",
      tone: "satisfied",
    };
  }

  const reviewCount = relatedRows.filter((row) => row.status === "review").length;
  const failedCount = relatedRows.filter((row) => row.status === "failed").length;
  const missingCount = relatedRows.filter((row) => row.status === "missing").length;

  if (reviewCount > 0) {
    return {
      detail: `${reviewCount} bewijsstuk${reviewCount === 1 ? "" : "ken"} wacht op beoordeling`,
      label: "Review nodig",
      tone: "review",
    };
  }

  if (failedCount > 0) {
    return {
      detail: `${failedCount} bewijsstuk${failedCount === 1 ? "" : "ken"} opnieuw nodig`,
      label: "Nog niet voldoende",
      tone: "failed",
    };
  }

  if (missingCount > 0 || relatedRows.length > 0) {
    return {
      detail: `${missingCount || relatedRows.length} bewijsstuk${(missingCount || relatedRows.length) === 1 ? "" : "ken"} nog te doen`,
      label: "Nog aantonen",
      tone: "missing",
    };
  }

  return {
    detail: "Geen certificaat-evidence gekoppeld",
    label: "Niet gemeten",
    tone: "missing",
  };
}

function getEvidenceStatus(
  block: LessonBlock,
  pageStatus: LearningPageStatus,
  attempt: LearningAttemptView | null,
): Pick<EvidenceRow, "label" | "status"> {
  if (pageStatus !== "completed") {
    return { label: "pagina nog afronden", status: "missing" };
  }

  if (!attempt) {
    return { label: "antwoord nog indienen", status: "missing" };
  }

  if (attempt.manual_review_required) {
    return { label: "wacht op handmatige review", status: "review" };
  }

  if (attempt.passed === false) {
    return { label: "opnieuw nodig na onvoldoende beoordeling", status: "failed" };
  }

  const answer = attempt.answers[block.id];

  if (attempt.passed === true) {
    return { label: "goedgekeurd", status: "satisfied" };
  }

  if (answer?.value) {
    return { label: "antwoord opgeslagen", status: "satisfied" };
  }

  return { label: "antwoord nog indienen", status: "missing" };
}

function getBlockLabel(block: LessonBlock) {
  if ("title" in block && typeof block.title === "string") return block.title;
  if ("question" in block && typeof block.question === "string") return block.question;
  if ("prompt" in block && typeof block.prompt === "string") return block.prompt;
  return block.type;
}

type LearningPageStatus = "completed" | "in_progress" | "not_started";

function getPageStatus(page: LearningPageView, learnerState: LearnerStateView): LearningPageStatus {
  return (
    learnerState.progressByPageId[page.id]?.status ??
    learnerState.progressByLessonId[page.id]?.status ??
    "not_started"
  );
}
