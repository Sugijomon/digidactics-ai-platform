import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonBlockRenderer } from "@/components/learning/LessonBlockRenderer";
import { getPublishedMicroLearningPage } from "@/lib/learning-data";

export default async function MicroLearningPage({
  params,
}: {
  params: Promise<{ lessonCode: string }>;
}) {
  const { lessonCode } = await params;
  const page = await getPublishedMicroLearningPage(lessonCode);

  if (!page) {
    notFound();
  }

  return (
    <main className="microlearning-player-page">
      <header className="microlearning-player-topbar">
        <Link href="/learning?view=microlearnings">← Micro-learnings</Link>
        <div>
          <span>⚡</span>
          <strong>{page.title}</strong>
        </div>
        <span>~{page.estimated_duration_minutes ?? "-"} min</span>
      </header>

      <article className="microlearning-player-content">
        <div className="content-topic-label">
          <span className="content-topic-title">{page.title}</span>
        </div>
        <div className="page-canvas">
          {page.content.blocks.map((block) => (
            <LessonBlockRenderer block={block} key={block.id} />
          ))}
        </div>
      </article>
    </main>
  );
}
