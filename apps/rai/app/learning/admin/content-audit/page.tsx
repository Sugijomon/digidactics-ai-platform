import Link from "next/link";
import { Breadcrumb } from "@/components/learning/admin/Breadcrumb";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { getLearningContentAudit } from "@/lib/learning-admin-data";
import { LEARNING_CORE_CONTENT_SYNC_CONFIRMATION } from "@/lib/learning-content-sync";

export default async function LearningContentAuditPage({
  searchParams,
}: {
  searchParams?: Promise<{ sync_error?: string; synced?: string }>;
}) {
  const params = await searchParams;
  const rows = await getLearningContentAudit();
  const mismatchCount = rows.filter((row) => row.status !== "ok").length;
  const reviewRequiredCount = rows.reduce((sum, row) => sum + row.review_required_count, 0);
  const legalReviewCount = rows.reduce((sum, row) => sum + row.legal_review_required_count, 0);
  const provisionalClaimCount = rows.reduce((sum, row) => sum + row.provisional_claim_count, 0);

  return (
    <ContentEditorShell active="audit">
      <div className="admin-page-header">
        <div>
          <Breadcrumb
            items={[
              { label: "Content Editor", href: "/learning/admin" },
              { label: "Content audit" },
            ]}
          />
          <h1>RAI content audit</h1>
        </div>
        <div className="actions compact-actions">
          <Link className="button button-secondary" href="/learning">
            Learner bekijken
          </Link>
          <form action="/learning/admin/content-audit/sync" method="post">
            <label className="sync-confirmation">
              <input
                name="confirmOverwrite"
                required
                type="checkbox"
                value={LEARNING_CORE_CONTENT_SYNC_CONFIRMATION}
              />
              Git is bron van waarheid; overschrijf live editorcontent.
            </label>
            <button className="button button-primary" type="submit">
              Sync Literacy + Proficiency + Mastery
            </button>
          </form>
        </div>
      </div>

      {params?.synced === "1" ? (
        <div className="review-notice success">
          <span>✓</span>
          <div>
            <strong>Sync uitgevoerd</strong>
            <p>De live Supabase-content is opnieuw opgebouwd vanuit de repo-bron.</p>
          </div>
        </div>
      ) : null}
      {params?.sync_error ? (
        <div className="review-notice">
          <span>!</span>
          <div>
            <strong>Sync niet uitgevoerd</strong>
            <p>{params.sync_error}</p>
          </div>
        </div>
      ) : null}

      <section className="admin-stat-grid" aria-label="Content audit statistieken">
        <article className="admin-stat-card">
          <span>Pagina's</span>
          <strong>{rows.length}</strong>
        </article>
        <article className="admin-stat-card">
          <span>Afwijkingen</span>
          <strong>{mismatchCount}</strong>
        </article>
        <article className="admin-stat-card">
          <span>DPO/content review</span>
          <strong>{reviewRequiredCount}</strong>
        </article>
        <article className="admin-stat-card">
          <span>Legal review</span>
          <strong>{legalReviewCount}</strong>
        </article>
        <article className="admin-stat-card">
          <span>Provisionele claims</span>
          <strong>{provisionalClaimCount}</strong>
        </article>
      </section>

      <section className="admin-table-card">
        <div className="admin-section-heading">
          <div>
            <h2>Live Supabase content versus RAI bron</h2>
            <p>
              Deze audit vergelijkt de live contentblokken met de gewenste cursuscontent uit de
              repo. De sync behandelt Git als bron van waarheid en overschrijft bestaande
              editorcontent voor de drie kerncursussen na expliciete bevestiging.
            </p>
          </div>
        </div>

        <div className="content-audit-list">
          {rows.map((row) => (
            <article
              className={`content-audit-row ${row.status}`}
              key={`${row.course_code}-${row.topic_code}-${row.page_code || row.status}`}
            >
              <div>
                <span className="status-badge">{getStatusLabel(row.status)}</span>
                <h3>{row.page_title}</h3>
                <p>
                  {row.course_title} · bron: {row.topic_title}
                  {row.live_topic_title && row.live_topic_title !== row.topic_title
                    ? ` · live: ${row.live_topic_title}`
                    : ""}
                </p>
                <p className="content-audit-meta">
                  Bron topic #{row.source_topic_order ?? "-"} · Live topic #{row.live_topic_order ?? "-"} ·{" "}
                  Live id {row.live_page_id ?? row.live_topic_id ?? "ontbreekt"}
                </p>
                {(row.review_required_count > 0 ||
                  row.legal_review_required_count > 0 ||
                  row.provisional_claim_count > 0 ||
                  row.role_path_count > 0) && (
                  <p className="content-audit-meta">
                    Review {row.review_required_count} Â· Legal {row.legal_review_required_count} Â· Provisioneel{" "}
                    {row.provisional_claim_count} Â· Rolpad {row.role_path_count}
                  </p>
                )}
              </div>
              <div className="content-audit-blocks">
                <BlockTypeList
                  count={row.source_block_count}
                  label="Gewenst"
                  values={row.desired_block_types}
                />
                <BlockTypeList count={row.live_block_count} label="Live" values={row.live_block_types} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </ContentEditorShell>
  );
}

function BlockTypeList({ count, label, values }: { count: number; label: string; values: string[] }) {
  return (
    <div>
      <strong>
        {label} ({count})
      </strong>
      <p>{values.length ? values.join(" / ") : "Geen live blocks"}</p>
    </div>
  );
}

function getStatusLabel(status: string) {
  if (status === "ok") return "OK";
  if (status === "missing_live_topic") return "Topic ontbreekt";
  if (status === "missing_live_page") return "Ontbreekt live";
  if (status === "empty_live_page") return "Lege live blocks";
  if (status === "extra_live_topic") return "Extra live topic";
  if (status === "extra_live_page") return "Extra live pagina";
  return "Andere blocks";
}
