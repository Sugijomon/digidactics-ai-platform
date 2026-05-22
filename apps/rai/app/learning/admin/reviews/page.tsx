import Link from "next/link";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { getLearningReviewQueue } from "@/lib/learning-admin-data";
import { reviewLearningPageAttempt } from "../actions";

export default async function LearningReviewsPage() {
  const reviews = await getLearningReviewQueue();

  return (
    <ContentEditorShell active="reviews">
      <div className="admin-page-header">
        <div>
          <p className="breadcrumb">Content Editor / Reviews</p>
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
                  <p className="breadcrumb">
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
                      <strong>{blockId}</strong>
                    </div>
                    <p>{Array.isArray(answer.value) ? answer.value.join(", ") : answer.value}</p>
                  </section>
                ))}
              </div>

              <form action={reviewLearningPageAttempt} className="review-form">
                <input name="attemptId" type="hidden" value={review.id} />
                <input name="courseId" type="hidden" value={review.course_id} />
                <input name="courseCode" type="hidden" value={review.course_code} />
                <input name="userId" type="hidden" value={review.user_id} />
                <label className="field">
                  <span>Reviewer notes</span>
                  <textarea
                    name="reviewerNotes"
                    placeholder="Leg kort vast waarom deze poging is goedgekeurd of afgewezen."
                    rows={3}
                  />
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
