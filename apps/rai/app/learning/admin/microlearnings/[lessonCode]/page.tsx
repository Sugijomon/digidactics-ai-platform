import Link from "next/link";
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
    <ContentEditorShell active="courses">
      <div className="admin-page-header compact-header">
        <div>
          <p className="breadcrumb">Content Editor / Micro-learnings / {page.title}</p>
          <h1>Micro-learning bewerken</h1>
        </div>
        <Link className="button button-secondary" href="/learning/admin/courses?view=microlearnings">
          Terug
        </Link>
      </div>

      <LearningAdminEditor
        course={course}
        initialPageCode={page.page_code}
        mode="microlearning"
        updateAction={updateMicroLearningContent}
      />
    </ContentEditorShell>
  );
}
