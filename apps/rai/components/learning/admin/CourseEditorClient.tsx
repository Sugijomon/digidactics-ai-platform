"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AddLessonDialog } from "@/components/learning/admin/AddLessonDialog";
import { Breadcrumb } from "@/components/learning/admin/Breadcrumb";
import type { LearningAdminCourseSummary, LearningAdminLessonSummary } from "@/lib/learning-admin-data";
import type { LearningCourseView, LearningPageView, LearningTopicView } from "@/lib/learning-preview-data";

type CourseAction = (formData: FormData) => void | Promise<void>;

export function CourseEditorClient({
  addLessonAction,
  createPageAction,
  course,
  courseSummary,
  createTopicAction,
  deleteTopicAction,
  lessons,
  movePageAction,
  moveTopicAction,
  updateCourseAction,
  updateTopicAction,
}: {
  addLessonAction: CourseAction;
  createPageAction: CourseAction;
  course: LearningCourseView;
  courseSummary?: LearningAdminCourseSummary;
  createTopicAction: CourseAction;
  deleteTopicAction: CourseAction;
  lessons: LearningAdminLessonSummary[];
  movePageAction: CourseAction;
  moveTopicAction: CourseAction;
  updateCourseAction: CourseAction;
  updateTopicAction: CourseAction;
}) {
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openTopicIds, setOpenTopicIds] = useState<string[]>(
    course.topics.length === 1 ? [course.topics[0].id] : [],
  );
  const [topics, setTopics] = useState(course.topics);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const pages = useMemo(() => topics.flatMap((topic) => topic.pages), [topics]);
  const totalMinutes = pages.reduce((sum, page) => sum + (page.estimated_duration_minutes ?? 0), 0);
  const status = courseSummary?.status ?? "published";
  const statusLabel = status === "published" ? "Gepubliceerd" : "Concept";
  const difficultyLevel = courseSummary?.difficulty_level ?? course.difficulty_level ?? "foundation";

  useEffect(() => {
    pages.slice(0, 3).forEach((page) => {
      router.prefetch(
        `/learning/admin/lessons/${page.page_code}?courseCode=${course.course_code}&pageId=${page.id}`,
      );
    });
  }, [course.course_code, pages, router]);

  useEffect(() => {
    setTopics(course.topics);
  }, [course.topics]);

  function toggleTopic(topicId: string) {
    setOpenTopicIds((current) =>
      current.includes(topicId)
        ? current.filter((id) => id !== topicId)
        : [...current, topicId],
    );
  }

  async function saveCourseSettings(formData: FormData) {
    await updateCourseAction(formData);
    router.refresh();
  }

  return (
    <div className="course-accordion-page">
      <div className="admin-page-header course-edit-header">
        <div>
          <Breadcrumb
            items={[
              { label: "Content Editor", href: "/learning/admin" },
              { label: "Cursussen", href: "/learning/admin/courses" },
              { label: course.title },
            ]}
          />
          <h1>{course.title}</h1>
        </div>
        <div className="actions compact-actions">
          <Link className="button button-secondary" href="/learning/admin/courses">
            &larr; Terug
          </Link>
          <button className="button button-primary" form="course-settings-form" type="submit">
            Wijzigingen opslaan
          </button>
        </div>
      </div>

      <section className="course-accordion-frame">
        <header className="course-accordion-hero">
          <div className="course-accordion-copy">
            <span className={`status-badge ${status === "published" ? "published" : ""}`}>
              {statusLabel}
            </span>
            {isSettingsOpen ? (
              <div className="course-header-edit-fields">
                <label className="field">
                  <span>Titel</span>
                  <input form="course-settings-form" name="title" defaultValue={course.title} />
                </label>
                <label className="field">
                  <span>Subtekst</span>
                  <textarea
                    form="course-settings-form"
                    name="description"
                    defaultValue={course.description ?? ""}
                    rows={3}
                  />
                </label>
              </div>
            ) : (
              <>
                <h2>{course.title}</h2>
                <p>{course.description ?? "Geen beschrijving ingesteld."}</p>
              </>
            )}
            <div className="course-kpi-row" aria-label="Cursus KPI's">
              <KpiCell label="Topics" value={String(course.topics.length)} />
              <KpiCell label="Lessen" value={String(pages.length)} />
              <KpiCell label="Duur" value={`${totalMinutes} min`} />
              <KpiCell label="Norm" value={`${course.passing_threshold}%`} />
              <KpiCell label="Niveau" value={getDifficultyLevelLabel(difficultyLevel)} />
            </div>
          </div>
          <button
            aria-expanded={isSettingsOpen}
            className="button button-secondary"
            onClick={() => setIsSettingsOpen((current) => !current)}
            type="button"
          >
            ⚙ Instellingen bewerken
          </button>
        </header>

        <form
          action={saveCourseSettings}
          className="course-inline-settings"
          id="course-settings-form"
          style={{ display: isSettingsOpen ? undefined : "none" }}
        >
          <input name="courseId" type="hidden" value={course.id} />
          <input name="courseCode" type="hidden" value={course.course_code} />
          {!isSettingsOpen ? (
            <>
              <input name="title" type="hidden" value={course.title} />
              <input name="description" type="hidden" value={course.description ?? ""} />
            </>
          ) : null}
            <label className="field">
              <span>Ontgrendelt capability</span>
              <input
                name="unlocksCapability"
                defaultValue={courseSummary?.unlocks_capability ?? "routeai_usecase_check"}
              />
            </label>
            <label className="field onboarding-toggle-field">
              <span>Verplicht voor onboarding</span>
              <input
                defaultChecked={course.required_for_onboarding}
                name="requiredForOnboarding"
                type="checkbox"
              />
            </label>
            <label className="field">
              <span>Niveau</span>
              <select name="difficultyLevel" defaultValue={difficultyLevel}>
                <option value="foundation">Niveau 1 - Foundation</option>
                <option value="intermediate">Niveau 2 - Proficiency</option>
                <option value="advanced">Niveau 3 - Mastery</option>
              </select>
            </label>
            <label className="field">
              <span>Slaagdrempel (%)</span>
              <input name="passingThreshold" defaultValue={course.passing_threshold} type="number" />
          </label>
          <label className="field">
            <span>Status</span>
            <select name="status" defaultValue={status}>
              <option value="published">Gepubliceerd</option>
              <option value="draft">Concept</option>
            </select>
          </label>
          <button className="button button-primary" type="submit">
            Opslaan
          </button>
        </form>

        <section className="course-topics-section">
          <p className="course-section-label">Onderwerpen & lessen</p>
          <div className="course-topic-accordion-list">
            {topics.map((topic, index) => (
              <TopicAccordion
                addLessonAction={addLessonAction}
                course={course}
                createPageAction={createPageAction}
                deleteTopicAction={deleteTopicAction}
                editingTopicId={editingTopicId}
                isOpen={openTopicIds.includes(topic.id)}
                key={topic.id}
                lessons={lessons}
                movePageAction={movePageAction}
                moveTopicAction={moveTopicAction}
                onEditTopic={setEditingTopicId}
                onOptimisticTopicChange={(updatedTopic) =>
                  setTopics((current) =>
                    current.map((item) => (item.id === updatedTopic.id ? updatedTopic : item)),
                  )
                }
                onToggle={() => toggleTopic(topic.id)}
                topic={topic}
                topicIndex={index}
                topicTotal={topics.length}
                updateTopicAction={updateTopicAction}
              />
            ))}
          </div>

          {isCreatingTopic ? (
            <form action={createTopicAction} className="new-topic-inline-form">
              <input name="courseId" type="hidden" value={course.id} />
              <input name="courseCode" type="hidden" value={course.course_code} />
              <label className="field">
                <span>Titel</span>
                <input name="title" placeholder="Nieuw onderwerp" required />
              </label>
              <label className="field">
                <span>Samenvatting</span>
                <input name="summary" placeholder="Korte beschrijving" />
              </label>
              <button className="button button-primary" type="submit">
                Onderwerp toevoegen
              </button>
            </form>
          ) : (
            <button
              className="dashed-add-button wide"
              onClick={() => setIsCreatingTopic(true)}
              type="button"
            >
              ＋ Nieuw onderwerp toevoegen
            </button>
          )}
        </section>
      </section>
    </div>
  );
}

function TopicAccordion({
  addLessonAction,
  course,
  createPageAction,
  deleteTopicAction,
  editingTopicId,
  isOpen,
  lessons,
  movePageAction,
  moveTopicAction,
  onEditTopic,
  onOptimisticTopicChange,
  onToggle,
  topic,
  topicIndex,
  topicTotal,
  updateTopicAction,
}: {
  addLessonAction: CourseAction;
  course: LearningCourseView;
  createPageAction: CourseAction;
  deleteTopicAction: CourseAction;
  editingTopicId: string | null;
  isOpen: boolean;
  lessons: LearningAdminLessonSummary[];
  movePageAction: CourseAction;
  moveTopicAction: CourseAction;
  onEditTopic: (topicId: string | null) => void;
  onOptimisticTopicChange: (topic: LearningTopicView) => void;
  onToggle: () => void;
  topic: LearningTopicView;
  topicIndex: number;
  topicTotal: number;
  updateTopicAction: CourseAction;
}) {
  const isEditing = editingTopicId === topic.id;
  const [isSavingTopic, setIsSavingTopic] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function saveTopicInline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const isRequired = String(formData.get("isRequired") ?? "") === "on";

    if (!title) {
      setSaveError("Titel is verplicht.");
      return;
    }

    const previousTopic = topic;
    const nextTopic: LearningTopicView = {
      ...topic,
      title,
      summary: summary || null,
      is_required: isRequired,
    };

    setIsSavingTopic(true);
    setSaveError(null);
    onOptimisticTopicChange(nextTopic);

    try {
      await updateTopicAction(formData);
      onEditTopic(null);
    } catch (error) {
      onOptimisticTopicChange(previousTopic);
      setSaveError(error instanceof Error ? error.message : "Onderwerp opslaan is mislukt.");
    } finally {
      setIsSavingTopic(false);
    }
  }

  return (
    <article className="course-topic-accordion">
      <header className="course-topic-header">
        <button
          aria-expanded={isOpen}
          className="course-topic-toggle"
          onClick={onToggle}
          type="button"
        >
          <span className="topic-chevron">▶</span>
          <strong>{topic.title}</strong>
          <small>{topic.pages.length} lessen</small>
        </button>
        <div className="topic-row-actions">
          <TopicMoveButton
            courseCode={course.course_code}
            direction="up"
            disabled={topicIndex === 0}
            moveTopicAction={moveTopicAction}
            topicId={topic.id}
          />
          <TopicMoveButton
            courseCode={course.course_code}
            direction="down"
            disabled={topicIndex === topicTotal - 1}
            moveTopicAction={moveTopicAction}
            topicId={topic.id}
          />
          <TopicDeleteButton
            courseCode={course.course_code}
            deleteTopicAction={deleteTopicAction}
            lessonCount={topic.pages.length}
            topicId={topic.id}
            topicTitle={topic.title}
          />
          <button
            aria-label={`${topic.title} bewerken`}
            className="topic-icon-button"
            onClick={() => onEditTopic(isEditing ? null : topic.id)}
            type="button"
          >
            ✎
          </button>
        </div>
      </header>

      {isEditing ? (
        <form className="topic-edit-row" onSubmit={saveTopicInline}>
          <input name="topicId" type="hidden" value={topic.id} />
          <input name="courseCode" type="hidden" value={course.course_code} />
          <input
            className="m-input"
            defaultValue={topic.title}
            name="title"
            placeholder="Titel"
            type="text"
          />
          <input
            className="m-input"
            defaultValue={topic.summary ?? ""}
            name="summary"
            placeholder="Samenvatting"
            type="text"
          />
          <label className="topic-required-inline">
            <input
              className="topic-required-check"
              defaultChecked={topic.is_required}
              name="isRequired"
              type="checkbox"
            />
            <span>Verplicht</span>
          </label>
          <button className="button button-primary button-compact" disabled={isSavingTopic} type="submit">
            {isSavingTopic ? "Opslaan..." : "Opslaan"}
          </button>
          {saveError ? <span className="topic-save-error">{saveError}</span> : null}
        </form>
      ) : null}

      {isOpen ? (
        <div className="topic-lessons-panel">
          {topic.pages.map((page, index) => (
            <LessonRow
              courseCode={course.course_code}
              index={index}
              key={page.id}
              movePageAction={movePageAction}
              page={page}
              total={topic.pages.length}
            />
          ))}
          {!topic.pages.length ? (
            <p className="empty-state compact-empty-state">Nog geen lessen in dit onderwerp.</p>
          ) : null}
          <AddLessonDialog
            copyAction={addLessonAction}
            course={course}
            createAction={createPageAction}
            lessons={lessons}
            triggerLabel={`＋ Les toevoegen aan ${topic.title}`}
            topic={topic}
          />
        </div>
      ) : null}
    </article>
  );
}

function LessonRow({
  courseCode,
  index,
  movePageAction,
  page,
  total,
}: {
  courseCode: string;
  index: number;
  movePageAction: CourseAction;
  page: LearningPageView;
  total: number;
}) {
  const typeClass = getLessonTypeClass(page.page_type);
  const typeLabel = getLessonTypeLabel(page.page_type);

  return (
    <article className="topic-lesson-row">
      <span className="lesson-number">{index + 1}</span>
      <div className="lesson-row-title">
        <strong>{page.title}</strong>
        <span>{page.summary ?? "Geen samenvatting ingesteld."}</span>
      </div>
      <span className={`lesson-type-badge ${typeClass}`}>
        {typeLabel} · {page.estimated_duration_minutes ?? "-"} min
      </span>
      <div className="lesson-row-actions">
        <PageMoveButton
          courseCode={courseCode}
          direction="up"
          disabled={index === 0}
          movePageAction={movePageAction}
          pageId={page.id}
        />
        <PageMoveButton
          courseCode={courseCode}
          direction="down"
          disabled={index === total - 1}
          movePageAction={movePageAction}
          pageId={page.id}
        />
        <Link
          className="button button-secondary"
          href={`/learning/admin/lessons/${page.page_code}?courseCode=${courseCode}&pageId=${page.id}`}
        >
          Bewerken
        </Link>
      </div>
    </article>
  );
}

function KpiCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TopicMoveButton({
  courseCode,
  direction,
  disabled,
  moveTopicAction,
  topicId,
}: {
  courseCode: string;
  direction: "up" | "down";
  disabled: boolean;
  moveTopicAction: CourseAction;
  topicId: string;
}) {
  return (
    <form action={moveTopicAction}>
      <input name="topicId" type="hidden" value={topicId} />
      <input name="courseCode" type="hidden" value={courseCode} />
      <input name="direction" type="hidden" value={direction} />
      <button className="topic-icon-button" disabled={disabled} type="submit">
        {direction === "up" ? "↑" : "↓"}
      </button>
    </form>
  );
}

function TopicDeleteButton({
  courseCode,
  deleteTopicAction,
  lessonCount,
  topicId,
  topicTitle,
}: {
  courseCode: string;
  deleteTopicAction: CourseAction;
  lessonCount: number;
  topicId: string;
  topicTitle: string;
}) {
  const warning =
    lessonCount > 0
      ? `Weet je zeker dat je "${topicTitle}" wilt verwijderen? Ook ${lessonCount} les(sen) in dit onderwerp worden verwijderd.`
      : `Weet je zeker dat je "${topicTitle}" wilt verwijderen?`;

  return (
    <form
      action={deleteTopicAction}
      onSubmit={(event) => {
        if (!window.confirm(warning)) {
          event.preventDefault();
        }
      }}
    >
      <input name="topicId" type="hidden" value={topicId} />
      <input name="courseCode" type="hidden" value={courseCode} />
      <button aria-label={`${topicTitle} verwijderen`} className="topic-icon-button topic-delete-button" type="submit">
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <path d="M7.25 4.75h5.5M8.25 4.75l.5-1h2.5l.5 1M5.75 7h8.5M7 7l.45 8h5.1L13 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
      </button>
    </form>
  );
}

function PageMoveButton({
  courseCode,
  direction,
  disabled,
  movePageAction,
  pageId,
}: {
  courseCode: string;
  direction: "up" | "down";
  disabled: boolean;
  movePageAction: CourseAction;
  pageId: string;
}) {
  return (
    <form action={movePageAction}>
      <input name="pageId" type="hidden" value={pageId} />
      <input name="courseCode" type="hidden" value={courseCode} />
      <input name="direction" type="hidden" value={direction} />
      <button className="topic-icon-button" disabled={disabled} type="submit">
        {direction === "up" ? "↑" : "↓"}
      </button>
    </form>
  );
}

function getLessonTypeClass(pageType: string) {
  if (pageType === "case") return "type-case";
  if (pageType === "question" || pageType === "quiz") return "type-question";
  if (pageType === "assessment" || pageType === "exam") return "type-assessment";
  return "type-content";
}

function getLessonTypeLabel(pageType: string) {
  if (pageType === "case") return "Case";
  if (pageType === "question" || pageType === "quiz") return "Vraag";
  if (pageType === "assessment" || pageType === "exam") return "Assessment";
  return "Content";
}

function getDifficultyLevelLabel(level: string | null | undefined) {
  if (level === "advanced") return "Niveau 3";
  if (level === "intermediate") return "Niveau 2";
  return "Niveau 1";
}
