import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@digidactics/auth";
import { LearningTopbar } from "@/components/learning/LearningTopbar";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export default async function LearningAdminPage() {
  const supabase = await getSupabaseServerClient();
  const context = await getCurrentUserContext(supabase);

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
          Tijdelijke entry voor content editors. Les- en microlearningbeheer
          wordt hier later opgebouwd.
        </p>
        <div className="actions">
          <Link className="button button-primary" href="/learning">
            Bekijk Learning System
          </Link>
        </div>
      </section>
    </main>
  );
}

