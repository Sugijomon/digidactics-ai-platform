import { Breadcrumb } from "@/components/learning/admin/Breadcrumb";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { LessonsTable } from "@/components/learning/admin/LessonsTable";
import { NewLessonDialog } from "@/components/learning/admin/NewLessonDialog";
import { getAdminCourse, getLearningAdminOverview } from "@/lib/learning-admin-data";
import { createLearningPage } from "../actions";

export default async function AdminLessonsPage() {
  const [overview, aiLiteracyCourse] = await Promise.all([
    getLearningAdminOverview(),
    getAdminCourse("ai-literacy-foundation"),
  ]);
  const lessons = [...overview.lessons, ...overview.microLearnings];
  const courseOptions = [
    {
      course: aiLiteracyCourse,
      topics: aiLiteracyCourse.topics,
    },
  ];

  return (
    <ContentEditorShell active="lessons">
      <div className="admin-page-header compact-header">
        <div>
          <Breadcrumb
            items={[
              { label: "Content Editor", href: "/learning/admin" },
              { label: "Lessen" },
            ]}
          />
          <h1>Lessen</h1>
        </div>
        <NewLessonDialog
          courseOptions={courseOptions}
          createAction={createLearningPage}
          nextSequenceOrder={aiLiteracyCourse.pages.length + 1}
        />
      </div>

      <LessonsTable courses={overview.courses} lessons={lessons} />
    </ContentEditorShell>
  );
}
