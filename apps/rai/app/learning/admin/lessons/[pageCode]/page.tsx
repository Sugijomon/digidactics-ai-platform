import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { LearningAdminEditor } from "@/components/learning/LearningAdminEditor";
import { getAdminLearningPage } from "@/lib/learning-admin-data";
import { updateLearningPageContent } from "../../actions";

export default async function AdminLessonEditorPage({
  params,
}: {
  params: Promise<{ pageCode: string }>;
}) {
  const { pageCode } = await params;
  const { course, page } = await getAdminLearningPage(pageCode);

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
        initialPageCode={page.page_code}
        updateAction={updateLearningPageContent}
      />
    </ContentEditorShell>
  );
}
