import Link from "next/link";
import { notFound } from "next/navigation";
import { completeAiLiteracyPage } from "@/app/learning/actions";
import { CourseNavigator } from "@/components/learning/CourseNavigator";
import { LessonBlockRenderer } from "@/components/learning/LessonBlockRenderer";
import { LearningTopbar } from "@/components/learning/LearningTopbar";
import { getAiLiteracyPage, getLearnerState } from "@/lib/learning-data";
import { getCoursePages } from "@/lib/learning-preview-data";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseCode: string; lessonCode: string }>;
}) {
  const { courseCode, lessonCode } = await params;
  const { course, page } = await getAiLiteracyPage(lessonCode);
  const learnerState = await getLearnerState(course);

  if (course.course_code !== courseCode || !page) {
    notFound();
  }

  const pages = getCoursePages(course);
  const currentIndex = pages.findIndex((item) => item.page_code === page.page_code);
  const previousPage = pages[currentIndex - 1];
  const nextPage = pages[currentIndex + 1];
  const pageProgress =
    learnerState.progressByPageId[page.id] ??
    learnerState.progressByLessonId[page.id] ??
    null;
  const isCompleted = pageProgress?.status === "completed";

  return (
    <main className="shell">
      <LearningTopbar />
      <div className="learning-workspace">
        <CourseNavigator
          activePage={page}
          course={course}
          learnerState={learnerState}
        />
        <article className="lesson-shell page-canvas">
          {page.content.blocks.map((block) => (
            <LessonBlockRenderer block={block} key={block.id} />
          ))}
          <nav className="lesson-completion-bar" aria-label="Pagina voortgang">
            <div>
              <p className="eyebrow">Voortgang</p>
              <h2>{isCompleted ? "Pagina afgerond" : "Klaar met deze pagina?"}</h2>
              <p className="muted">
                {isCompleted
                  ? "Je voortgang is opgeslagen."
                  : "Sla je voortgang op en ga door met de cursus."}
              </p>
            </div>
            <div className="lesson-completion-actions">
            {previousPage ? (
              <Link
                className="button button-secondary"
                href={`/learning/${course.course_code}/${previousPage.page_code}`}
              >
                Vorige pagina
              </Link>
            ) : null}
            {isCompleted && nextPage ? (
              <Link
                className="button button-primary"
                href={`/learning/${course.course_code}/${nextPage.page_code}`}
              >
                Volgende pagina
              </Link>
            ) : isCompleted ? (
              <Link className="button button-primary" href="/learning">
                Terug naar cursus
              </Link>
            ) : learnerState.isAuthenticated ? (
              <form action={completeAiLiteracyPage}>
                <input name="courseId" type="hidden" value={course.id} />
                <input name="courseCode" type="hidden" value={course.course_code} />
                <input name="pageId" type="hidden" value={page.id} />
                <input name="pageCode" type="hidden" value={page.page_code} />
                <input name="nextPageCode" type="hidden" value={nextPage?.page_code ?? ""} />
                <button className="button button-primary" type="submit">
                  {nextPage ? "Afronden en doorgaan" : "Cursus afronden"}
                </button>
              </form>
            ) : (
              <span className="button button-secondary">Login vereist</span>
            )}
            </div>
          </nav>
        </article>
      </div>
    </main>
  );
}
