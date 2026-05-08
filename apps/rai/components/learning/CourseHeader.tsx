import type { LearningCourseView } from "@/lib/learning-preview-data";

export function CourseHeader({ course }: { course: LearningCourseView }) {
  const totalMinutes = course.lessons.reduce(
    (total, lesson) => total + (lesson.estimated_duration_minutes ?? 0),
    0,
  );

  return (
    <section className="card">
      <p className="eyebrow">RouteAI Learning System</p>
      <h1>{course.title}</h1>
      {course.subtitle ? <p className="lead">{course.subtitle}</p> : null}
      {course.description ? <p>{course.description}</p> : null}
      <div className="pill-row">
        <span className="pill">AI Literacy rijbewijs</span>
        <span className="pill">{course.lessons.length} lessen</span>
        <span className="pill">{totalMinutes} minuten</span>
        <span className="pill">{course.passing_threshold}% norm</span>
      </div>
    </section>
  );
}

