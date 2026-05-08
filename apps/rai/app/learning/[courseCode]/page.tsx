import { notFound } from "next/navigation";
import { CourseHeader } from "@/components/learning/CourseHeader";
import { LearningTopbar } from "@/components/learning/LearningTopbar";
import { LessonList } from "@/components/learning/LessonList";
import { getAiLiteracyCourse, getLearnerState } from "@/lib/learning-data";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseCode: string }>;
}) {
  const { courseCode } = await params;
  const course = await getAiLiteracyCourse();
  const learnerState = await getLearnerState(course);

  if (course.course_code !== courseCode) {
    notFound();
  }

  return (
    <main className="shell">
      <LearningTopbar />
      <div className="grid">
        <CourseHeader course={course} />
        <LessonList course={course} learnerState={learnerState} />
      </div>
    </main>
  );
}
