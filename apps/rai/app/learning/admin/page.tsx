import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@digidactics/auth";
import { createLearningPage, updateLearningPageContent } from "./actions";
import { LearningTopbar } from "@/components/learning/LearningTopbar";
import { getAiLiteracyCourse } from "@/lib/learning-data";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export default async function LearningAdminPage() {
  const supabase = await getSupabaseServerClient();
  const context = await getCurrentUserContext(supabase);
  const course = await getAiLiteracyCourse();

  if (!context) {
    redirect("/auth/login?next=/learning/admin");
  }

  if (
    context.primaryRole !== "content_editor" &&
    context.primaryRole !== "super_admin"
  ) {
    redirect("/dashboard");
  }

  return (
    <main className="shell">
      <LearningTopbar />
      <section className="card">
        <p className="eyebrow">Learning admin</p>
        <h1>Contentbeheer</h1>
        <p className="lead">
          Beheer de AI Literacy cursusstructuur. Deze light editor werkt met
          topics, pagina's en JSONB blocks.
        </p>
        <div className="actions">
          <Link className="button button-primary" href="/learning">
            Bekijk Learning System
          </Link>
        </div>
      </section>
      <section className="admin-layout">
        <div className="admin-main">
          {course.topics.map((topic) => (
            <article className="card" key={topic.id}>
              <p className="eyebrow">Topic {topic.sequence_order}</p>
              <h2>{topic.title}</h2>
              {topic.summary ? <p>{topic.summary}</p> : null}
              <div className="admin-page-stack">
                {topic.pages.map((page) => (
                  <details className="admin-page" key={page.id}>
                    <summary>
                      <span>
                        {page.sequence_order}. {page.title}
                      </span>
                      <small>
                        {page.page_type} · {page.content.blocks.length} blocks
                      </small>
                    </summary>
                    <form action={updateLearningPageContent} className="admin-form">
                      <input name="pageId" type="hidden" value={page.id} />
                      <input name="courseCode" type="hidden" value={course.course_code} />
                      <input name="pageCode" type="hidden" value={page.page_code} />
                      <label className="field">
                        <span>Titel</span>
                        <input name="title" defaultValue={page.title} />
                      </label>
                      <label className="field">
                        <span>Samenvatting</span>
                        <input name="summary" defaultValue={page.summary ?? ""} />
                      </label>
                      <label className="field">
                        <span>JSON blocks</span>
                        <textarea
                          name="content"
                          defaultValue={JSON.stringify(page.content, null, 2)}
                          rows={18}
                        />
                      </label>
                      <div className="admin-block-list">
                        {page.content.blocks.map((block) => (
                          <span className="pill" key={block.id}>
                            {block.type}
                          </span>
                        ))}
                      </div>
                      <div className="actions">
                        <button className="button button-primary" type="submit">
                          Pagina opslaan
                        </button>
                        <Link
                          className="button button-secondary"
                          href={`/learning/${course.course_code}/${page.page_code}`}
                        >
                          Preview
                        </Link>
                      </div>
                    </form>
                  </details>
                ))}
              </div>
            </article>
          ))}
        </div>
        <aside className="card sidebar">
          <p className="eyebrow">Nieuwe pagina</p>
          <h2>Page toevoegen</h2>
          <form action={createLearningPage} className="form-stack">
            <input name="courseId" type="hidden" value={course.id} />
            <input name="courseCode" type="hidden" value={course.course_code} />
            <label className="field">
              <span>Topic</span>
              <select name="topicId">
                {course.topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Page code</span>
              <input name="pageCode" placeholder="ai-literacy-nieuwe-pagina" />
            </label>
            <label className="field">
              <span>Titel</span>
              <input name="title" placeholder="Nieuwe learningpagina" />
            </label>
            <label className="field">
              <span>Samenvatting</span>
              <input name="summary" placeholder="Korte omschrijving" />
            </label>
            <label className="field">
              <span>Type</span>
              <select name="pageType" defaultValue="content">
                <option value="content">content</option>
                <option value="question">question</option>
                <option value="case">case</option>
                <option value="video">video</option>
                <option value="embed">embed</option>
                <option value="assessment">assessment</option>
              </select>
            </label>
            <label className="field">
              <span>Volgorde</span>
              <input name="sequenceOrder" type="number" min="1" defaultValue="1" />
            </label>
            <label className="field">
              <span>Minuten</span>
              <input name="estimatedMinutes" type="number" min="1" defaultValue="5" />
            </label>
            <button className="button button-primary" type="submit">
              Pagina maken
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}
