import Link from "next/link";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { getLearningAdminOverview } from "@/lib/learning-admin-data";

export default async function LearningAdminPage() {
  const overview = await getLearningAdminOverview();
  const publishedCourses = overview.courses.filter((course) => course.status === "published");
  const totalBlocks = [...overview.lessons, ...overview.microLearnings].reduce(
    (sum, lesson) => sum + lesson.block_count,
    0,
  );
  const primaryCourse = overview.courses[0] ?? null;

  return (
    <ContentEditorShell active="dashboard">
      <div className="admin-page-header">
        <div>
          <p className="breadcrumb">Content Editor / Dashboard</p>
          <h1>Learning content dashboard</h1>
        </div>
        <div className="actions compact-actions">
          <Link className="button button-secondary" href="/learning">
            Learner bekijken
          </Link>
          <Link className="button button-primary" href="/learning/admin/lessons">
            Nieuwe les
          </Link>
        </div>
      </div>

      <section className="admin-stat-grid" aria-label="Contentstatistieken">
        <StatCard label="Cursussen" value={String(overview.courses.length)} />
        <StatCard label="Cursuslessen" value={String(overview.lessons.length)} />
        <StatCard label="Microlearnings" value={String(overview.microLearnings.length)} />
        <StatCard label="Gepubliceerd" value={String(publishedCourses.length)} />
      </section>

      <section className="dashboard-workbench" aria-label="Werkgebieden">
        <WorkbenchCard
          description="Beheer cursusstructuur, metadata en volgorde van lessen."
          href="/learning/admin/courses"
          label="Cursussen"
          meta={`${overview.courses.length} actief`}
        />
        <WorkbenchCard
          description="Maak en bewerk cursuslessen en microlearning templates."
          href="/learning/admin/lessons"
          label="Lessen"
          meta={`${overview.lessons.length + overview.microLearnings.length} totaal`}
        />
        <WorkbenchCard
          description="Bekijk welke bouwstenen beschikbaar zijn voor lessen."
          href="/learning/admin/blocks"
          label="Contentblokken"
          meta={`${totalBlocks} gebruikt`}
        />
        <WorkbenchCard
          description="Beoordeel open antwoorden en casusreflecties voordat certificering mogelijk wordt."
          href="/learning/admin/reviews"
          label="Reviews"
          meta="Manual gate"
        />
      </section>

      {primaryCourse ? (
        <section className="admin-table-card dashboard-focus-card">
          <div className="admin-section-heading">
            <div>
              <h2>Actieve cursus</h2>
              <p>De belangrijkste RouteAI learning flow die nu klaarstaat.</p>
            </div>
            <Link
              className="button button-secondary"
              href={`/learning/admin/courses/${primaryCourse.course_code}`}
            >
              Cursus bewerken
            </Link>
          </div>
          <div className="dashboard-course-focus">
            <div>
              <span className="status-badge published">RouteAI rijbewijs</span>
              <h2>{primaryCourse.title}</h2>
              <p>{primaryCourse.description ?? "Geen beschrijving ingesteld."}</p>
            </div>
            <div className="dashboard-course-metrics">
              <Metric label="Lessen" value={String(primaryCourse.page_count)} />
              <Metric label="Norm" value={`${primaryCourse.passing_threshold}%`} />
              <Metric label="Capability" value={primaryCourse.unlocks_capability ?? "-"} />
            </div>
          </div>
        </section>
      ) : null}
    </ContentEditorShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="admin-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function WorkbenchCard({
  description,
  href,
  label,
  meta,
}: {
  description: string;
  href: string;
  label: string;
  meta: string;
}) {
  return (
    <Link className="dashboard-workbench-card" href={href}>
      <span>{meta}</span>
      <strong>{label}</strong>
      <p>{description}</p>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
