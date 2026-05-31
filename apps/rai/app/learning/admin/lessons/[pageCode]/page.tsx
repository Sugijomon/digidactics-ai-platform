import { notFound } from "next/navigation";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { LearningAdminEditor } from "@/components/learning/LearningAdminEditor";
import { getAdminLearningPage } from "@/lib/learning-admin-data";
import { aiLiteracyPreviewCourse, getCoursePages } from "@/lib/learning-preview-data";
import { updateLearningPageContent } from "../../actions";

export default async function AdminLessonEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ pageCode: string }>;
  searchParams?: Promise<{ courseCode?: string; pageId?: string }>;
}) {
  const { pageCode } = await params;
  const { courseCode, pageId } = (await searchParams) ?? {};
  const adminPage = await getAdminLearningPage(pageCode, courseCode, pageId);
  const previewPages = getCoursePages(aiLiteracyPreviewCourse);
  const fallbackPage =
    previewPages.find((previewPage) => previewPage.page_code === pageCode) ?? null;
  const fallbackTopic =
    aiLiteracyPreviewCourse.topics.find((topic) =>
      topic.pages.some((previewPage) => previewPage.page_code === pageCode),
    ) ?? null;
  const page = adminPage.page ?? fallbackPage;
  const course = adminPage.page
    ? adminPage.course
    : {
        ...aiLiteracyPreviewCourse,
        pages: fallbackPage ? [fallbackPage] : [],
        topics:
          fallbackTopic && fallbackPage
            ? [{ ...fallbackTopic, pages: [fallbackPage] }]
            : [],
      };

  if (!page) {
    notFound();
  }

  return (
    <ContentEditorShell
      active="lessons"
      focusBackHref={`/learning/admin/courses/${course.course_code}`}
      focusBackLabel="Terug naar cursus"
      focusMode={true}
    >
      <LearningAdminEditor
        course={course}
        initialPageCode={page.page_code}
        updateAction={updateLearningPageContent}
      />
    </ContentEditorShell>
  );
}
