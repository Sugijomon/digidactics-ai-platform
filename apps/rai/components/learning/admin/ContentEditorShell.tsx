import Link from "next/link";
import type { ReactNode, SVGProps } from "react";
import { BackButton } from "@/components/learning/admin/BackButton";

type ContentEditorSection = "dashboard" | "courses" | "lessons" | "blocks" | "reviews" | "audit";
type NavIcon = "dashboard" | "courses" | "lessons" | "questions";

const navItems: Array<{
  href: string;
  id: ContentEditorSection;
  label: string;
  icon: NavIcon;
  activeIds?: ContentEditorSection[];
}> = [
  { href: "/learning/admin", id: "dashboard", label: "Dashboard", icon: "dashboard" },
  {
    href: "/learning/admin/courses",
    id: "courses",
    label: "Cursussen",
    icon: "courses",
    activeIds: ["courses", "blocks", "reviews", "audit"],
  },
  { href: "/learning/admin/lessons", id: "lessons", label: "Lessen", icon: "lessons" },
  { href: "/learning/admin/reviews", id: "reviews", label: "Vragenbank", icon: "questions" },
];

export function ContentEditorShell({
  active,
  children,
  focusBackHref,
  focusBackLabel,
  focusMode = false,
}: {
  active: ContentEditorSection;
  children: ReactNode;
  focusBackHref?: string;
  focusBackLabel?: string;
  focusMode?: boolean;
}) {
  const focusParent =
    active === "lessons"
      ? { href: "/learning/admin/lessons", label: "Terug naar lessen" }
      : { href: "/learning/admin/courses", label: "Terug naar cursussen" };
  const focusHref = focusBackHref ?? focusParent.href;
  const focusLabel = focusBackLabel ?? focusParent.label;

  return (
    <main className="content-editor-shell">
      <header className={focusMode ? "content-editor-topbar focus" : "content-editor-topbar"}>
        <Link className="content-editor-brand" href="/learning">
          <span className="content-editor-logo">R</span>
          <span>
            <strong>RouteAI</strong>
            <small>AI Governance Platform</small>
          </span>
        </Link>
        {focusMode ? (
          <div className="content-editor-focus-actions">
            <BackButton fallbackHref={focusHref} label={focusLabel} />
            <UserBadge />
          </div>
        ) : (
          <div className="content-editor-context" aria-label="Actieve module">
            <span>Learning System</span>
            <strong>Content editor workspace</strong>
          </div>
        )}
        {!focusMode ? <UserBadge /> : null}
      </header>

      <div className={focusMode ? "content-editor-layout focus" : "content-editor-layout"}>
        {!focusMode ? (
          <aside className="content-editor-sidebar" aria-label="Content editor navigatie">
            <div className="content-editor-sidebar-heading">
              <p>Content</p>
            </div>
            <nav>
              {navItems.map((item) => {
                const isActive = item.activeIds?.includes(active) ?? active === item.id;

                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className="content-editor-nav-link"
                    href={item.href}
                    key={item.id}
                  >
                    <span>
                      <NavIcon name={item.icon} />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        ) : null}
        <div className="content-editor-main">{children}</div>
      </div>
    </main>
  );
}

function UserBadge() {
  return (
    <div className="content-editor-user" aria-label="Ingelogde rol">
      <span>J</span>
      <div>
        <strong>Johan</strong>
        <small>Content Editor</small>
      </div>
    </div>
  );
}

function NavIcon({ name }: { name: NavIcon }) {
  const props: SVGProps<SVGSVGElement> = {
    "aria-hidden": true,
    fill: "none",
    height: 18,
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    viewBox: "0 0 24 24",
    width: 18,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...props}>
          <rect height="7" rx="1.5" width="7" x="3" y="3" />
          <rect height="7" rx="1.5" width="7" x="14" y="3" />
          <rect height="7" rx="1.5" width="7" x="3" y="14" />
          <rect height="7" rx="1.5" width="7" x="14" y="14" />
        </svg>
      );
    case "courses":
      return (
        <svg {...props}>
          <path d="m4 8 8-4 8 4-8 4-8-4Z" />
          <path d="m6 10.5 6 3 6-3" />
          <path d="M8 12v4.5c0 .8 1.8 1.5 4 1.5s4-.7 4-1.5V12" />
        </svg>
      );
    case "lessons":
      return (
        <svg {...props}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
          <path d="M8 7h8" />
          <path d="M8 11h6" />
        </svg>
      );
    case "questions":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.8 9a2.4 2.4 0 0 1 4.4 1.35c0 1.8-2.2 2-2.2 3.65" />
          <path d="M12 17h.01" />
        </svg>
      );
  }
}
