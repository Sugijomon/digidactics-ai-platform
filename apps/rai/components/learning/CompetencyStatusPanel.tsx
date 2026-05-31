import { issueAiLiteracyCertification } from "@/app/learning/actions";
import { CourseCertificateSuccess } from "@/components/learning/CourseCertificateSuccess";
import {
  evaluateLearningCertificationEligibility,
  isAutoGradableLearningBlock,
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
  const eligibility = evaluateLearningCertificationEligibility(
    pages.map((page) => ({
      page_id: page.id,
      is_required: page.is_required,
      content: page.content,
      is_completed: getPageStatus(page, learnerState) === "completed",
      latest_attempt: learnerState.attemptsByPageId[page.id] ?? null,
    })),
    course.passing_threshold,
  );
  const evidenceRows = buildEvidenceRows(pages, learnerState);
  const activeCertificate = learnerState.accessCheck?.certification_status === "active";
  const canIssue = learnerState.isAuthenticated && eligibility.eligible && !activeCertificate;
  const mainStatus = activeCertificate
    ? "Rijbewijs actief"
    : eligibility.eligible
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
        <strong className={activeCertificate || eligibility.eligible ? "is-ready" : ""}>{mainStatus}</strong>
      </div>

      <div className="competency-grid">
        {COMPETENCIES.map((competency) => {
          const status = getCompetencyStatus(competency.code, eligibility, evidenceRows);

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

      {eligibility.eligible ? (
        <>
          <CourseCertificateSuccess variant="literacy" />
          <div className="competency-issue-row">
            <p>
              Alle kritieke competenties voldoen aan de norm van {course.passing_threshold}%. De RouteAI
              access gate is {activeCertificate ? "actief" : "klaar voor certificaatuitgifte"}.
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
  eligibility: ReturnType<typeof evaluateLearningCertificationEligibility>,
  evidenceRows: EvidenceRow[],
) {
  const result = eligibility.competency_results.find((item) => item.competency_code === code);
  const relatedRows = evidenceRows.filter((row) => row.competencyCodes.includes(code));

  if (result?.satisfied) {
    return {
      detail: `${result.satisfied_evidence_count}/${result.required_evidence_count} evidence afgerond`,
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

  if (isAutoGradableLearningBlock(block) && !isCorrectAnswer(block, answer?.value)) {
    return { label: "antwoord is nog niet voldoende", status: "failed" };
  }

  if (!isAutoGradableLearningBlock(block) && attempt.passed === true) {
    return { label: "goedgekeurd", status: "satisfied" };
  }

  return { label: "aangetoond", status: "satisfied" };
}

function isCorrectAnswer(block: LessonBlock, value: string | string[] | undefined) {
  switch (block.type) {
    case "scenario": {
      const selectedChoice = typeof value === "string"
        ? block.choices.find((choice) => choice.id === value)
        : null;
      return selectedChoice?.is_recommended === true;
    }
    case "quiz_multiple_choice":
      return typeof value === "string" && value === block.correct_option_id;
    case "quiz_multiple_select":
      return Array.isArray(value) && sameStringSet(value, block.correct_option_ids);
    case "quiz_true_false":
      return typeof value === "string" && (value === "true") === block.correct_answer;
    default:
      return false;
  }
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
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
