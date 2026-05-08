import Link from "next/link";
import { CourseHeader } from "@/components/learning/CourseHeader";
import { LearningTopbar } from "@/components/learning/LearningTopbar";
import { LessonList } from "@/components/learning/LessonList";
import { getAiLiteracyCourse } from "@/lib/learning-data";

export default async function LearningPage() {
  const course = await getAiLiteracyCourse();

  return (
    <main className="shell">
      <LearningTopbar />
      <div className="grid course-grid">
        <div className="grid">
          <CourseHeader course={course} />
          <LessonList course={course} />
        </div>
        <aside className="card sidebar">
          <p className="eyebrow">Toegang</p>
          <h2>RouteAI rijbewijs</h2>
          <p>
            Deze cursus wordt de harde toegangseis voor RouteAI usecase checks.
            Certificaat-uitgifte en progress tracking volgen in de volgende
            stap.
          </p>
          <div className="meta-list">
            <div className="meta-row">
              <span>Status</span>
              <strong className="status">Viewer klaar</strong>
            </div>
            <div className="meta-row">
              <span>Capability</span>
              <strong>routeai_usecase_check</strong>
            </div>
          </div>
          <div className="actions">
            <Link
              className="button button-primary"
              href={`/learning/${course.course_code}/${course.lessons[0]?.lesson_code ?? ""}`}
            >
              Start cursus
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

