import Link from "next/link";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="shell auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Login-link verzonden</p>
        <h1>Check je e-mail</h1>
        <p className="lead">
          We hebben een veilige login-link gestuurd
          {email ? ` naar ${email}` : ""}. Open die link in deze browser om je
          sessie te starten.
        </p>
        <Link className="button button-primary" href="/learning">
          Terug naar Learning
        </Link>
      </section>
    </main>
  );
}

