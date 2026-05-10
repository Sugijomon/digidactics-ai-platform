import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@digidactics/auth";
import { createLearningPage, updateLearningPageContent } from "./actions";
import { LearningAdminEditor } from "@/components/learning/LearningAdminEditor";
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
    <main className="shell wide-shell">
      <LearningTopbar />
      <section className="card">
        <p className="eyebrow">Learning admin</p>
        <h1>Contentbeheer</h1>
        <p className="lead">
          Beheer de AISA AI Literacy cursusstructuur met topics, pagina's en
          visuele block forms. De editor bewaart nog steeds in JSONB blocks.
        </p>
        <div className="actions">
          <Link className="button button-primary" href="/learning">
            Bekijk Learning System
          </Link>
        </div>
      </section>
      <LearningAdminEditor
        course={course}
        createAction={createLearningPage}
        updateAction={updateLearningPageContent}
      />
    </main>
  );
}
