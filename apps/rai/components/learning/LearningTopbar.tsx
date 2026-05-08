import Link from "next/link";

export function LearningTopbar() {
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
      </nav>
    </header>
  );
}

