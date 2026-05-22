import Link from "next/link";
import type { ReactNode } from "react";

type ContentEditorSection = "dashboard" | "courses" | "lessons" | "blocks" | "reviews" | "audit";

const navItems: Array<{
  href: string;
  id: ContentEditorSection;
  label: string;
  icon: string;
}> = [
  { href: "/learning/admin", id: "dashboard", label: "Dashboard", icon: "D" },
  { href: "/learning/admin/courses", id: "courses", label: "Cursussen", icon: "C" },
  { href: "/learning/admin/lessons", id: "lessons", label: "Lessen", icon: "L" },
  { href: "/learning/admin/reviews", id: "reviews", label: "Reviews", icon: "R" },
  { href: "/learning/admin/content-audit", id: "audit", label: "Content audit", icon: "A" },
  { href: "/learning/admin/blocks", id: "blocks", label: "Contentblokken", icon: "+" },
];

export function ContentEditorShell({
  active,
  children,
}: {
  active: ContentEditorSection;
  children: ReactNode;
}) {
  return (
    <main className="content-editor-shell">
      <header className="content-editor-topbar">
        <Link className="content-editor-brand" href="/learning">
          <span className="content-editor-logo">R</span>
          <span>
            <strong>RouteAI</strong>
            <small>AI Governance Platform</small>
          </span>
        </Link>
        <div className="content-editor-user" aria-label="Ingelogde rol">
          <span>J</span>
          <div>
            <strong>Johan</strong>
            <small>Content Editor</small>
          </div>
        </div>
      </header>

      <div className="content-editor-layout">
        <aside className="content-editor-sidebar" aria-label="Content editor navigatie">
          <p>Content</p>
          <nav>
            {navItems.map((item) => (
              <Link
                aria-current={active === item.id ? "page" : undefined}
                className="content-editor-nav-link"
                href={item.href}
                key={item.id}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="content-editor-main">{children}</div>
      </div>
    </main>
  );
}
