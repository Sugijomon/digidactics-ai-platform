import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell">
      <section className="empty-state">
        <h1>Niet gevonden</h1>
        <p>Deze pagina of les bestaat niet in de huidige Learning System view.</p>
        <Link className="button button-primary" href="/learning">
          Terug naar Learning
        </Link>
      </section>
    </main>
  );
}

