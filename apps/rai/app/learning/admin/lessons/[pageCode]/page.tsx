import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { LearningAdminEditor } from "@/components/learning/LearningAdminEditor";
import { requireContentEditor } from "@/lib/learning-admin-data";
import { getAiLiteracyPage } from "@/lib/learning-data";
import { createLearningPage, updateLearningPageContent } from "../../actions";

export default async function AdminLessonEditorPage({
  params,
}: {
  params: Promise<{ pageCode: string }>;
}) {
  const { pageCode } = await params;
  await requireContentEditor();
  const { course, page } = await getAiLiteracyPage(pageCode);

  if (!page) {
    notFound();
  }

  return (
    <ContentEditorShell active="lessons">
      <div className="admin-page-header compact-header">
        <div>
          <p className="breadcrumb">Content Editor / Lessen / {page.title}</p>
          <h1>Les Bewerken</h1>
        </div>
        <Link className="button button-secondary" href="/learning/admin/lessons">
          Terug
        </Link>
      </div>

      <LearningAdminEditor
        course={course}
        createAction={createLearningPage}
        initialPageCode={page.page_code}
        updateAction={updateLearningPageContent}
      />
    </ContentEditorShell>
  );
}
