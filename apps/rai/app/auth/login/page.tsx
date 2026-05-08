import Link from "next/link";
import { signInWithEmail } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/dashboard", error } = await searchParams;

  return (
    <main className="shell auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">RouteAI toegang</p>
        <h1>Inloggen</h1>
        <p className="lead">
          Ontvang een veilige login-link per e-mail om je AI Literacy voortgang
          op te slaan.
        </p>
        {error ? <p className="form-error">{error}</p> : null}
        <form action={signInWithEmail} className="form-stack">
          <input name="next" type="hidden" value={next} />
          <label className="field">
            <span>E-mailadres</span>
            <input
              autoComplete="email"
              name="email"
              placeholder="naam@organisatie.nl"
              required
              type="email"
            />
          </label>
          <button className="button button-primary" type="submit">
            Stuur login-link
          </button>
        </form>
        <Link className="button button-secondary" href="/learning">
          Terug naar Learning
        </Link>
      </section>
    </main>
  );
}
