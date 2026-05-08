import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Digidactics AI Platform</p>
        <h1>AI Literacy als toegangspoort voor verantwoord AI-gebruik.</h1>
        <p className="lead">
          De eerste RouteAI Learning System view staat klaar als compacte,
          werkbare cursusomgeving.
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
