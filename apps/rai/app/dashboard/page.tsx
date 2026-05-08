import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserContext, getDefaultEntryPath } from "@digidactics/auth";
import { LearningTopbar } from "@/components/learning/LearningTopbar";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export default async function DashboardRouterPage() {
  const supabase = await getSupabaseServerClient();
  const context = await getCurrentUserContext(supabase);

  if (!context) {
    redirect("/auth/login?next=/dashboard");
  }

  const defaultPath = getDefaultEntryPath(context);

  if (defaultPath !== "/dashboard") {
    redirect(defaultPath);
  }

  return (
    <main className="shell">
      <LearningTopbar />
      <section className="card">
        <p className="eyebrow">RouteAI dashboard</p>
        <h1>Welkom bij RouteAI</h1>
        <p className="lead">
          Dit is de tijdelijke role-aware entry voor DPO, manager en org admin.
          De dashboardmodules worden hier later opgebouwd.
        </p>
        <div className="meta-list">
          <div className="meta-row">
            <span>Primaire rol</span>
            <strong>{context.primaryRole}</strong>
          </div>
          <div className="meta-row">
            <span>Organisatie</span>
            <strong>{context.orgId ?? "geen organisatie"}</strong>
          </div>
          <div className="meta-row">
            <span>Rollen</span>
            <strong>{context.roles.join(", ") || "geen rollen"}</strong>
          </div>
        </div>
        <div className="actions">
          <Link className="button button-primary" href="/learning">
            Open Learning System
          </Link>
        </div>
      </section>
    </main>
  );
}

