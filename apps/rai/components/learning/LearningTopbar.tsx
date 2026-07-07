import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function LearningTopbar() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  return (
    <header className="topbar">
      <Link className="brandmark" href="/">
        <strong>Digidactics</strong>
        <span>AI Platform</span>
      </Link>
      <nav className="actions">
        <Link className="button button-secondary" href="/learning">
          Learning
        </Link>
        {user ? (
          <form action={signOut}>
            <button className="button button-secondary" type="submit">
              Uitloggen
            </button>
          </form>
        ) : (
          <Link className="button button-primary" href="/auth/login?next=/dashboard">
            Inloggen
          </Link>
        )}
      </nav>
    </header>
  );
}
