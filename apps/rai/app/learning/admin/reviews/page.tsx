import Link from "next/link";
import { Breadcrumb } from "@/components/learning/admin/Breadcrumb";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { getLearningReviewQueue } from "@/lib/learning-admin-data";
import { reviewLearningPageAttempt } from "../actions";

export default async function LearningReviewsPage() {
  const reviews = await getLearningReviewQueue();

  return (
    <ContentEditorShell active="reviews">
      <div className="admin-page-header">
        <div>
          <Breadcrumb
            items={[
              { label: "Content Editor", href: "/learning/admin" },
              { label: "Reviews" },
            ]}
          />
          <h1>Manual Review</h1>
        </div>
        <div className="actions compact-actions">
          <Link className="button button-secondary" href="/learning/admin">
            Dashboard
          </Link>
        </div>
      </div>

      <section className="admin-stat-grid" aria-label="Reviewstatistieken">
        <article className="admin-stat-card">
          <span>Open reviews</span>
          <strong>{reviews.length}</strong>
        </article>
        <article className="admin-stat-card">
          <span>Manual gate</span>
          <strong>{reviews.length > 0 ? "Actief" : "Leeg"}</strong>
        </article>
      </section>

      {reviews.length === 0 ? (
        <section className="admin-table-card empty-review-state">
          <h2>Geen open reviews</h2>
          <p>
            Zodra een learner een casus, reflectie of open vraag afrondt, verschijnt de poging hier
            voor beoordeling.
          </p>
        </section>
      ) : (
        <section className="review-queue">
          {reviews.map((review) => (
            <article className="admin-table-card review-card" key={review.id}>
              <div className="review-card-header">
                <div>
                  <p className="review-card-path">
                    {review.course_title} / {review.page_title}
                  </p>
                  <h2>{review.learner_name}</h2>
                  <p>{review.learner_email ?? "Geen e-mail bekend"}</p>
                </div>
                <div className="review-meta">
                  <span className="status-badge">Poging {review.attempt_number}</span>
                  <strong>{review.percentage ?? "-"}%</strong>
                </div>
              </div>

              <div className="review-answer-list">
                {Object.entries(review.answers).map(([blockId, answer]) => (
                  <section className="review-answer" key={blockId}>
                    <div>
                      <span>{answer.block_type}</span>
                      <strong>{review.answer_context[blockId]?.label ?? blockId}</strong>
                    </div>
                    <p>{Array.isArray(answer.value) ? answer.value.join(", ") : answer.value}</p>
                    {review.answer_context[blockId]?.guidance ? (
                      <p className="review-guidance">{review.answer_context[blockId]?.guidance}</p>
                    ) : null}
                  </section>
                ))}
              </div>

              {review.page_evidence_items.length || review.page_review_rubric.length ? (
                <section className="review-evidence-panel" aria-label="Rubric en evidence">
                  {review.page_review_guidance ? (
                    <div>
                      <h3>Reviewer guidance</h3>
                      <p>{review.page_review_guidance}</p>
                    </div>
                  ) : null}
                  {review.page_evidence_items.length ? (
                    <div>
                      <h3>Evidence checklist</h3>
                      <ul>
                        {review.page_evidence_items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {review.page_review_rubric.length ? (
                    <div>
                      <h3>Rubric</h3>
                      <div className="review-rubric-grid">
                        {review.page_review_rubric.map((criterion) => (
                          <article key={criterion.id}>
                            <strong>{criterion.title}</strong>
                            <p>{criterion.sufficient}</p>
                            {criterion.strong ? <p>Sterk: {criterion.strong}</p> : null}
                            {criterion.hard_fail ? <p className="hard-fail">Hard fail: {criterion.hard_fail}</p> : null}
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <form action={reviewLearningPageAttempt} className="review-form">
                <input name="attemptId" type="hidden" value={review.id} />
                <input name="courseId" type="hidden" value={review.course_id} />
                <input name="courseCode" type="hidden" value={review.course_code} />
                <input name="userId" type="hidden" value={review.user_id} />
                <label className="field">
                  <span>Beslisgrond (verplicht)</span>
                  <textarea
                    aria-describedby={`review-rationale-help-${review.id}`}
                    name="reviewerNotes"
                    placeholder="Leg concreet vast waarom deze poging wordt goedgekeurd of afgewezen."
                    required
                    rows={3}
                  />
                  <small id={`review-rationale-help-${review.id}`}>
                    Vermeld de beoordelingsgrond en geen bijzondere persoonsgegevens of gegevens van
                    derden. Deze verantwoording wordt als onveranderbaar bewijs vastgelegd.
                  </small>
                </label>
                <div className="review-actions">
                  <button className="button button-secondary" name="decision" type="submit" value="reject">
                    Afwijzen
                  </button>
                  <button className="button button-primary" name="decision" type="submit" value="approve">
                    Goedkeuren
                  </button>
                </div>
              </form>
            </article>
          ))}
        </section>
      )}
    </ContentEditorShell>
  );
}
