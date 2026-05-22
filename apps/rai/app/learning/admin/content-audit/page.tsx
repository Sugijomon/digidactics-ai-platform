import Link from "next/link";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { getLearningContentAudit } from "@/lib/learning-admin-data";
import { syncAiLiteracyContentFromSource } from "../actions";

export default async function LearningContentAuditPage() {
  const rows = await getLearningContentAudit();
  const mismatchCount = rows.filter((row) => row.status !== "ok").length;

  return (
    <ContentEditorShell active="audit">
      <div className="admin-page-header">
        <div>
          <p className="breadcrumb">Content Editor / Content audit</p>
          <h1>AISA content audit</h1>
        </div>
        <div className="actions compact-actions">
          <Link className="button button-secondary" href="/learning">
            Learner bekijken
          </Link>
          <form action={syncAiLiteracyContentFromSource}>
            <button className="button button-primary" type="submit">
              Sync AISA content
            </button>
          </form>
        </div>
      </div>

      <section className="admin-stat-grid" aria-label="Content audit statistieken">
        <article className="admin-stat-card">
          <span>Pagina's</span>
          <strong>{rows.length}</strong>
        </article>
        <article className="admin-stat-card">
          <span>Afwijkingen</span>
          <strong>{mismatchCount}</strong>
        </article>
      </section>

      <section className="admin-table-card">
        <div className="admin-section-heading">
          <div>
            <h2>Live Supabase content versus AISA bron</h2>
            <p>
              Deze audit vergelijkt de live contentblokken met de gewenste cursuscontent uit de
              repo. Gebruik sync pas wanneer je de live cursus wilt herstellen naar deze bron.
            </p>
          </div>
        </div>

        <div className="content-audit-list">
          {rows.map((row) => (
            <article className={`content-audit-row ${row.status}`} key={row.page_code}>
              <div>
                <span className="status-badge">{getStatusLabel(row.status)}</span>
                <h3>{row.page_title}</h3>
                <p>{row.topic_title}</p>
              </div>
              <div className="content-audit-blocks">
                <BlockTypeList label="Gewenst" values={row.desired_block_types} />
                <BlockTypeList label="Live" values={row.live_block_types} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </ContentEditorShell>
  );
}

function BlockTypeList({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <strong>{label}</strong>
      <p>{values.length ? values.join(" / ") : "Geen live blocks"}</p>
    </div>
  );
}

function getStatusLabel(status: string) {
  if (status === "ok") return "OK";
  if (status === "missing_live_page") return "Ontbreekt live";
  return "Andere blocks";
}
