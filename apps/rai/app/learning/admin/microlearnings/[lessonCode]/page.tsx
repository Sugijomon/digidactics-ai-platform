import { notFound } from "next/navigation";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { LearningAdminEditor } from "@/components/learning/LearningAdminEditor";
import { getAdminMicroLearning } from "@/lib/learning-admin-data";
import { updateMicroLearningContent } from "../../actions";

export default async function AdminMicroLearningEditorPage({
  params,
}: {
  params: Promise<{ lessonCode: string }>;
}) {
  const { lessonCode } = await params;
  const { course, page } = await getAdminMicroLearning(lessonCode);

  if (!page) {
    notFound();
  }

  return (
    <ContentEditorShell
      active="courses"
      focusBackHref="/learning/admin/courses?view=microlearnings"
      focusBackLabel="Terug naar micro-learnings"
      focusMode={true}
    >
      <LearningAdminEditor
        course={course}
        initialPageCode={page.page_code}
        mode="microlearning"
        updateAction={updateMicroLearningContent}
      />
    </ContentEditorShell>
  );
}
