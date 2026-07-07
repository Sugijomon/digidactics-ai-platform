import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@digidactics/auth";
import { LearningTopbar } from "@/components/learning/LearningTopbar";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export default async function AdminPage() {
  const supabase = await getSupabaseServerClient();
  const context = await getCurrentUserContext(supabase);

  if (!context) {
    redirect("/auth/login?next=/admin");
  }

  if (context.primaryRole !== "super_admin") {
    redirect("/dashboard");
  }

  return (
    <main className="shell">
      <LearningTopbar />
      <section className="card">
        <p className="eyebrow">Platform admin</p>
        <h1>Admin entry</h1>
        <p className="lead">
          Tijdelijke entry voor super admins. Modulebeheer volgt later.
        </p>
        <div className="actions">
          <Link className="button button-primary" href="/learning">
            Open Learning System
          </Link>
        </div>
      </section>
    </main>
  );
}
