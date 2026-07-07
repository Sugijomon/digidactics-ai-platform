import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { CourseEditorClient } from "@/components/learning/admin/CourseEditorClient";
import { getAdminCourse, getLearningAdminOverview } from "@/lib/learning-admin-data";
import {
  addExistingLessonToCourse,
  createLearningPage,
  createLearningTopic,
  deleteLearningTopic,
  moveLearningPage,
  moveLearningTopic,
  updateLearningCourseDetails,
  updateLearningTopicDetails,
} from "../../actions";

export default async function AdminCourseEditorPage({
  params,
}: {
  params: Promise<{ courseCode: string }>;
}) {
  const { courseCode } = await params;
  const [course, overview] = await Promise.all([
    getAdminCourse(courseCode),
    getLearningAdminOverview(),
  ]);
  const courseSummary = overview.courses.find((item) => item.course_code === course.course_code);

  return (
    <ContentEditorShell
      active="courses"
      focusBackHref="/learning/admin/courses"
      focusBackLabel="Terug"
      focusMode={true}
    >
      <CourseEditorClient
        addLessonAction={addExistingLessonToCourse}
        createPageAction={createLearningPage}
        course={course}
        courseSummary={courseSummary}
        createTopicAction={createLearningTopic}
        deleteTopicAction={deleteLearningTopic}
        lessons={[...overview.lessons, ...overview.microLearnings]}
        movePageAction={moveLearningPage}
        moveTopicAction={moveLearningTopic}
        updateCourseAction={updateLearningCourseDetails}
        updateTopicAction={updateLearningTopicDetails}
      />
    </ContentEditorShell>
  );
}
