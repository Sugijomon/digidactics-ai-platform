import Link from "next/link";
import { startAiLiteracyCourse } from "@/app/learning/actions";
import { CompetencyStatusPanel } from "@/components/learning/CompetencyStatusPanel";
import type {
  LearnerStateView,
  LearningCourseView,
} from "@/lib/learning-preview-data";
import { getCoursePages } from "@/lib/learning-preview-data";

export function CourseStatusPanel({
  course,
  learnerState,
}: {
  course: LearningCourseView;
  learnerState: LearnerStateView;
}) {
  const enrollment = learnerState.enrollment;
  const pages = getCoursePages(course);
  const assessmentStatus = getCourseAssessmentStatus(course, learnerState);
  const firstIncompletePage =
    pages.find(
      (page) =>
        learnerState.progressByPageId[page.id]?.status !== "completed" &&
        learnerState.progressByLessonId[page.id]?.status !== "completed",
    ) ?? pages[0];

  return (
    <aside className="card sidebar">
      <p className="eyebrow">Toegang</p>
      <h2>RouteAI rijbewijs</h2>
      <p>
        Deze cursus wordt de harde toegangseis voor RouteAI usecase checks.
        Certificaat-uitgifte volgt pas na de afgeronde completion-check.
      </p>
      <div className="meta-list">
        <div className="meta-row">
          <span>Status</span>
          <strong className={enrollment?.status === "completed" ? "status" : ""}>
            {getEnrollmentLabel(learnerState)}
          </strong>
        </div>
        <div className="meta-row">
          <span>Voortgang</span>
          <strong>{enrollment?.progress_percentage ?? 0}%</strong>
        </div>
        <div className="meta-row">
          <span>Beoordeling</span>
          <strong>{assessmentStatus}</strong>
        </div>
        <div className="meta-row">
          <span>Capability</span>
          <strong>routeai_usecase_check</strong>
        </div>
      </div>
      <div className="actions">
        {learnerState.isAuthenticated ? (
          firstIncompletePage ? (
            enrollment ? (
              <Link
                className="button button-primary"
                href={`/learning/${course.course_code}/${firstIncompletePage.page_code}`}
              >
                Cursus hervatten
              </Link>
            ) : (
              <form action={startAiLiteracyCourse}>
                <input name="courseId" type="hidden" value={course.id} />
                <input name="courseCode" type="hidden" value={course.course_code} />
                <input
                  name="firstPageCode"
                  type="hidden"
                  value={firstIncompletePage.page_code}
                />
                <button className="button button-primary" type="submit">
                  Start cursus
                </button>
              </form>
            )
          ) : (
            <span className="button button-secondary">Geen lessen gevonden</span>
          )
        ) : (
          <span className="button button-secondary">Login vereist</span>
        )}
      </div>
      {course.course_code === "ai-literacy-foundation" ? (
        <CompetencyStatusPanel course={course} learnerState={learnerState} />
      ) : null}
    </aside>
  );
}

function getEnrollmentLabel(learnerState: LearnerStateView) {
  if (!learnerState.isAuthenticated) {
    return "Read-only preview";
  }

  if (!learnerState.orgId) {
    return "Geen organisatie";
  }

  switch (learnerState.enrollment?.status) {
    case "completed":
      return "Afgerond";
    case "in_progress":
      return "Bezig";
    case "expired":
      return "Verlopen";
    case "not_started":
    case undefined:
      return "Nog niet gestart";
  }
}

function getCourseAssessmentStatus(
  course: LearningCourseView,
  learnerState: LearnerStateView,
) {
  if (!learnerState.isAuthenticated) {
    return "Preview";
  }

  const requiredPages = getCoursePages(course).filter((page) => page.is_required);

  if (requiredPages.length === 0) {
    return "Geen verplichte pagina's";
  }

  const incompletePage = requiredPages.find(
    (page) =>
      learnerState.progressByPageId[page.id]?.status !== "completed" &&
      learnerState.progressByLessonId[page.id]?.status !== "completed",
  );

  if (incompletePage) {
    return "Nog niet volledig";
  }

  const latestAttempts = requiredPages
    .map((page) => learnerState.attemptsByPageId[page.id])
    .filter(Boolean);

  if (latestAttempts.some((attempt) => attempt.manual_review_required)) {
    return "Review nodig";
  }

  if (latestAttempts.some((attempt) => attempt.passed === false)) {
    return "Score onvoldoende";
  }

  if (learnerState.enrollment?.status === "completed") {
    return "Behaald";
  }

  return "In beoordeling";
}
