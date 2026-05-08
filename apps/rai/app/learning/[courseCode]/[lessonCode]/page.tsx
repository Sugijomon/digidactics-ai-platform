import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonBlockRenderer } from "@/components/learning/LessonBlockRenderer";
import { LearningTopbar } from "@/components/learning/LearningTopbar";
import { getAiLiteracyLesson } from "@/lib/learning-data";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseCode: string; lessonCode: string }>;
}) {
  const { courseCode, lessonCode } = await params;
  const { course, lesson } = await getAiLiteracyLesson(lessonCode);

  if (course.course_code !== courseCode || !lesson) {
    notFound();
  }

  const currentIndex = course.lessons.findIndex(
    (item) => item.lesson_code === lesson.lesson_code,
  );
  const previousLesson = course.lessons[currentIndex - 1];
  const nextLesson = course.lessons[currentIndex + 1];

  return (
    <main className="shell">
      <LearningTopbar />
      <div className="lesson-layout">
        <article className="lesson-shell">
          {lesson.content.blocks.map((block) => (
            <LessonBlockRenderer block={block} key={block.id} />
          ))}
          <nav className="actions">
            {previousLesson ? (
              <Link
                className="button button-secondary"
                href={`/learning/${course.course_code}/${previousLesson.lesson_code}`}
              >
                Vorige les
              </Link>
            ) : null}
            {nextLesson ? (
              <Link
                className="button button-primary"
                href={`/learning/${course.course_code}/${nextLesson.lesson_code}`}
              >
                Volgende les
              </Link>
            ) : (
              <Link className="button button-primary" href="/learning">
                Terug naar cursus
              </Link>
            )}
          </nav>
        </article>
        <aside className="card sidebar">
          <p className="eyebrow">Les {lesson.sequence_order}</p>
          <h2>{lesson.title}</h2>
          {lesson.summary ? <p>{lesson.summary}</p> : null}
          <div className="meta-list">
            <div className="meta-row">
              <span>Duur</span>
              <strong>{lesson.estimated_duration_minutes ?? 0} min</strong>
            </div>
            <div className="meta-row">
              <span>Onderdeel</span>
              <strong>{lesson.lesson_type}</strong>
            </div>
            <div className="meta-row">
              <span>Blokken</span>
              <strong>{lesson.content.blocks.length}</strong>
            </div>
          </div>
          <div className="actions">
            <Link className="button button-secondary" href="/learning">
              Programma
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

