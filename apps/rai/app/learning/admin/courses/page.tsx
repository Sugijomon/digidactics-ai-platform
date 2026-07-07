import Link from "next/link";
import { ArchiveCourseButton } from "@/components/learning/admin/ArchiveCourseButton";
import { Breadcrumb } from "@/components/learning/admin/Breadcrumb";
import { NewCourseDialog, NewMicroLearningDialog } from "@/components/learning/admin/CatalogCreateDialog";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import {
  getLearningCourseImage,
  getLearningCourseLevelNumber,
  getLearningMicroImage,
  getLearningMicroVisualKey,
} from "@/lib/learning-course-visuals";
import { getLearningAdminOverview } from "@/lib/learning-admin-data";
import { archiveLearningCourse, createLearningCourse, createMicroLearning } from "../actions";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const overview = await getLearningAdminOverview();
  const publishedCourses = overview.courses.filter((course) => course.status === "published");
  const activeView = params?.view === "microlearnings" ? "microlearnings" : "courses";

  return (
    <ContentEditorShell active="courses">
      <div className="admin-page-header compact-header catalog-page-header">
        <div>
          <Breadcrumb
            items={[
              { label: "Content Editor", href: "/learning/admin" },
              { label: "Cursussen" },
            ]}
          />
          <h1>Content Editor</h1>
        </div>
        {activeView === "microlearnings" ? (
          <NewMicroLearningDialog action={createMicroLearning} />
        ) : null}
      </div>

      <CatalogTabs activeView={activeView} microLearningCount={overview.microLearnings.length} />

      {activeView === "courses" ? (
        <>
          <section className="admin-kpi-strip" aria-label="Cursusstatistieken">
            <div className="admin-kpi">
              <strong>{overview.courses.length}</strong>
              <span>Cursussen</span>
            </div>
            <div className="admin-kpi">
              <strong>{overview.microLearnings.length}</strong>
              <span>Micro-learnings</span>
            </div>
            <div className="admin-kpi">
              <strong>{publishedCourses.length}</strong>
              <span>Gepubliceerd</span>
            </div>
          </section>
          <section className="admin-courses-grid" aria-label="Cursussen">
            {overview.courses.map((course) => {
              const plainDescription = stripMarkdownMarkers(course.description);
              const level = getCourseLevel(course.course_code, course.title, course.difficulty_level);

              return (
                <article className="admin-course-card" key={course.id}>
                  <div className="admin-course-image">
                    <img
                      alt=""
                      src={getCourseImage(course.course_code, course.title, course.difficulty_level)}
                    />
                    <div className="admin-course-image-badges">
                      <StatusBadge status={course.status} />
                      <span>{getLevelBadge(level)}</span>
                    </div>
                  </div>
                  <div className="admin-course-body">
                    <small>{getLevelLabel(level)}</small>
                    <div className="admin-course-title">{course.title}</div>
                    <p className="admin-course-desc">
                      {plainDescription ?? "Geen beschrijving ingesteld."}
                    </p>
                    <div className="admin-course-meta">
                      {course.page_count} {course.page_count === 1 ? "pagina" : "pagina's"} ·{" "}
                      {course.required_for_onboarding ? "Verplicht" : "Optioneel"}
                    </div>
                  </div>
                  <div className="admin-course-foot">
                    <Link
                      className="button button-secondary button-compact"
                      href={`/learning/admin/courses/${course.course_code}`}
                    >
                      Cursus bewerken
                    </Link>
                    <ArchiveCourseButton
                      action={archiveLearningCourse}
                      courseCode={course.course_code}
                      courseId={course.id}
                      courseTitle={course.title}
                    />
                  </div>
                </article>
              );
            })}
            <NewCourseDialog
              action={createLearningCourse}
              triggerClassName="admin-course-add"
              triggerLabel={
                <>
                  <span>+</span>
                  Nieuwe cursus
                </>
              }
            />
          </section>
        </>
      ) : (
        <section className="catalog-table-section" aria-label="Micro-learnings">
          <div className="catalog-section-heading">
            <div>
              <h2>Micro-learnings</h2>
              <p>Standalone modules voor RouteAI risico- en activatiebibliotheek.</p>
            </div>
          </div>
          <div className="admin-micro-grid">
            {overview.microLearnings.map((lesson) => {
              const visualKey = getLearningMicroVisualKey({
                code: lesson.code,
                summary: lesson.summary,
                title: lesson.title,
              });

              return (
                <article className="admin-micro-card" key={lesson.id}>
                  <div className="admin-micro-image">
                    <img
                      alt=""
                      src={getLearningMicroImage({
                        code: lesson.code,
                        summary: lesson.summary,
                        title: lesson.title,
                      })}
                    />
                    <div className="admin-course-image-badges">
                      <StatusBadge status={lesson.status} />
                      <span>{getMicroCategoryLabel(visualKey)}</span>
                    </div>
                  </div>
                  <div className="admin-course-body">
                    <small>Microlearning</small>
                    <div className="admin-course-title">{lesson.title}</div>
                    <p className="admin-course-desc">
                      {lesson.summary ?? "Geen samenvatting ingesteld."}
                    </p>
                    <div className="admin-course-meta">
                      {lesson.estimated_duration_minutes ?? 10} min · Standalone
                    </div>
                  </div>
                  <div className="admin-course-foot">
                    <Link
                      className="button button-secondary button-compact"
                      href={`/learning/admin/microlearnings/${lesson.code}`}
                    >
                      Bewerken
                    </Link>
                  </div>
                </article>
              );
            })}
            {!overview.microLearnings.length ? (
              <p className="empty-state">Er zijn nog geen micro-learnings aangemaakt.</p>
            ) : null}
          </div>
        </section>
      )}
    </ContentEditorShell>
  );
}

function stripMarkdownMarkers(description: string | null) {
  return description
    ?.replace(/\*\*(.*?)\*\*/g, "$1")
    ?.replace(/\*(.*?)\*/g, "$1")
    ?.replace(/__(.*?)__/g, "$1");
}

function CatalogTabs({
  activeView,
  microLearningCount,
}: {
  activeView: "courses" | "microlearnings";
  microLearningCount: number;
}) {
  return (
    <div className="admin-tabs catalog-tabs">
      <Link aria-current={activeView === "courses" ? "page" : undefined} href="/learning/admin/courses">
        Cursussen
      </Link>
      <Link
        aria-current={activeView === "microlearnings" ? "page" : undefined}
        href="/learning/admin/courses?view=microlearnings"
      >
        Micro-learnings <strong>{microLearningCount}</strong>
      </Link>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge ${status === "published" ? "published" : ""}`}>
      {status === "published" ? "Gepubliceerd" : "Concept"}
    </span>
  );
}

function getCourseLevel(courseCode: string, title: string, difficultyLevel?: string | null) {
  return getLearningCourseLevelNumber({ courseCode, difficultyLevel, title });
}

function getCourseImage(courseCode: string, title: string, difficultyLevel?: string | null) {
  return getLearningCourseImage({ courseCode, difficultyLevel, title });
}

function getLevelLabel(level: number) {
  if (level === 3) return "Advanced";
  if (level === 2) return "Intermediate";
  return "Foundation";
}

function getLevelBadge(level: number) {
  return `Niveau ${level}`;
}

function getMicroCategoryLabel(key: string) {
  const labels: Record<string, string> = {
    client: "Klantcontact",
    default: "Praktijk",
    governance: "Governance",
    privacy: "Privacy",
    prompting: "Prompting",
  };

  return labels[key] ?? labels.default;
}
