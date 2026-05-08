import { CourseHeader } from "@/components/learning/CourseHeader";
import { CourseStatusPanel } from "@/components/learning/CourseStatusPanel";
import { LearningTopbar } from "@/components/learning/LearningTopbar";
import { LessonList } from "@/components/learning/LessonList";
import { getAiLiteracyCourse, getLearnerState } from "@/lib/learning-data";

export default async function LearningPage() {
  const course = await getAiLiteracyCourse();
  const learnerState = await getLearnerState(course);

  return (
    <main className="shell">
      <LearningTopbar />
      <div className="grid course-grid">
        <div className="grid">
          <CourseHeader course={course} />
          <LessonList course={course} learnerState={learnerState} />
        </div>
        <CourseStatusPanel course={course} learnerState={learnerState} />
      </div>
    </main>
  );
}
