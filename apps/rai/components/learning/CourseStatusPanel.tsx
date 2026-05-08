import Link from "next/link";
import { startAiLiteracyCourse } from "@/app/learning/actions";
import type {
  LearnerStateView,
  LearningCourseView,
} from "@/lib/learning-preview-data";

export function CourseStatusPanel({
  course,
  learnerState,
}: {
  course: LearningCourseView;
  learnerState: LearnerStateView;
}) {
  const enrollment = learnerState.enrollment;
  const firstIncompleteLesson =
    course.lessons.find(
      (lesson) =>
        learnerState.progressByLessonId[lesson.id]?.status !== "completed",
    ) ?? course.lessons[0];

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
          <span>Capability</span>
          <strong>routeai_usecase_check</strong>
        </div>
      </div>
      <div className="actions">
        {learnerState.isAuthenticated ? (
          firstIncompleteLesson ? (
            enrollment ? (
              <Link
                className="button button-primary"
                href={`/learning/${course.course_code}/${firstIncompleteLesson.lesson_code}`}
              >
                Cursus hervatten
              </Link>
            ) : (
              <form action={startAiLiteracyCourse}>
                <input name="courseId" type="hidden" value={course.id} />
                <input name="courseCode" type="hidden" value={course.course_code} />
                <input
                  name="firstLessonCode"
                  type="hidden"
                  value={firstIncompleteLesson.lesson_code}
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
