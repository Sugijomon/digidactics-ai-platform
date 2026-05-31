"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  LearnerStateView,
  LearningCourseView,
  LearningPageView,
  LearningTopicView,
} from "@/lib/learning-preview-data";

type TopicStatus = "done" | "active" | "todo";
type PageStatus = "done" | "active" | "todo";

const TOPIC_ICONS: Record<string, string> = {
  "l1-ai-fundamentals": "🧭",
  "l2-risk": "⚖️",
  "l3-responsible-use": "🔍",
  "assessment-evidence": "📋",
  "ai-tools": "🛠",
  "ai-governance": "🏛",
};

export function CourseTopicGrid({
  course,
  learnerState,
}: {
  course: LearningCourseView;
  learnerState: LearnerStateView;
}) {
  const activeTopicId = getActiveTopicId(course.topics, learnerState);
  const [openTopicId, setOpenTopicId] = useState<string | null>(activeTopicId);
  const rows = useMemo(() => chunk(course.topics, 3), [course.topics]);

  function toggleTopic(topicId: string) {
    setOpenTopicId((current) => (current === topicId ? null : topicId));
  }

  return (
    <section className="course-topic-section">
      <h2>Programma</h2>
      <div className="course-topic-grid">
        {rows.map((row, rowIndex) => {
          const openTopic = row.find((topic) => topic.id === openTopicId) ?? null;

          return (
            <div className="course-topic-row" key={row.map((topic) => topic.id).join("-") || rowIndex}>
              {row.map((topic) => (
                <TopicCard
                  courseCode={course.course_code}
                  isOpen={openTopicId === topic.id}
                  key={topic.id}
                  learnerState={learnerState}
                  onToggle={() => toggleTopic(topic.id)}
                  topic={topic}
                />
              ))}
              {openTopic ? (
                <TopicExpand
                  courseCode={course.course_code}
                  icon={getTopicIcon(openTopic)}
                  learnerState={learnerState}
                  topic={openTopic}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      {course.topics.length === 0 ? (
        <p className="empty-state">Er zijn nog geen learning pagina&apos;s ingericht.</p>
      ) : null}
    </section>
  );
}

function TopicCard({
  courseCode,
  isOpen,
  learnerState,
  onToggle,
  topic,
}: {
  courseCode: string;
  isOpen: boolean;
  learnerState: LearnerStateView;
  onToggle: () => void;
  topic: LearningTopicView;
}) {
  const status = getTopicStatus(topic, learnerState);
  const progress = getTopicProgress(topic, learnerState);
  const totalMinutes = getTopicMinutes(topic);
  const icon = getTopicIcon(topic);
  const isEmpty = topic.pages.length === 0;

  return (
    <button
      className={`topic-card status-${status} ${isOpen ? "is-open" : ""}`}
      disabled={isEmpty}
      onClick={onToggle}
      style={{ opacity: isEmpty ? 0.4 : status === "todo" ? 0.65 : 1 }}
      type="button"
    >
      <div className="topic-icon-area">
        <div className={`topic-icon icon-${status}`}>{icon}</div>
        <span className={`topic-num-badge badge-${status}`}>
          {status === "done"
            ? "✓ Afgerond"
            : status === "active"
              ? "▶ Bezig"
              : isEmpty
                ? "Leeg"
                : "Niet gestart"}
        </span>
      </div>
      <div className="topic-card-body">
        <div className="topic-card-title">{topic.title}</div>
        <div className="topic-card-desc">{topic.summary ?? "Geen samenvatting ingesteld."}</div>
        <div className="topic-card-meta">
          <span>{topic.pages.length} pagina&apos;s</span>
          <span>{totalMinutes} min</span>
        </div>
        <div className="topic-mini-bar">
          <div className={`topic-mini-fill fill-${status}`} style={{ width: `${progress.percent}%` }} />
        </div>
        <div className="topic-mini-label">
          {progress.completed} van {topic.pages.length} afgerond
        </div>
        {!isEmpty ? (
          <span
            className={`topic-card-cta cta-${status}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
          >
            {status === "done" ? "✓ Bekijk opnieuw" : status === "active" ? "→ Doorgaan" : "Nog niet gestart"}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function TopicExpand({
  courseCode,
  icon,
  learnerState,
  topic,
}: {
  courseCode: string;
  icon: string;
  learnerState: LearnerStateView;
  topic: LearningTopicView;
}) {
  return (
    <div className="topic-expand">
      <div className="expand-head">
        <div className="expand-icon">{icon}</div>
        <div>
          <div className="expand-title">{topic.title}</div>
          <div className="expand-meta">
            {topic.pages.length} pagina&apos;s · {getTopicMinutes(topic)} min
          </div>
        </div>
      </div>
      <div className="expand-lessons">
        {topic.pages.map((page) => {
          const pageStatus = getPageStatus(page, learnerState);

          return (
            <Link
              className="expand-lesson"
              href={`/learning/${courseCode}/${page.page_code}`}
              key={page.id}
            >
              <span className={`lesson-dot ld-${pageStatus}`} />
              <span className={`lesson-title ${pageStatus === "done" ? "dimmed" : ""}`}>
                {page.title}
              </span>
              <span className="lesson-time">{page.estimated_duration_minutes ?? 0} min</span>
              <span className={`lesson-pill lp-${pageStatus}`}>
                {pageStatus === "done"
                  ? "✓ afgerond"
                  : pageStatus === "active"
                    ? "Doorgaan →"
                    : "nog niet gestart"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function chunk<T>(items: T[], size: number) {
  const rows: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
}

function getActiveTopicId(topics: LearningTopicView[], learnerState: LearnerStateView) {
  const inProgressTopic = topics.find((topic) =>
    topic.pages.some((page) => getPageStatus(page, learnerState) === "active"),
  );

  if (inProgressTopic) {
    return inProgressTopic.id;
  }

  return topics.find((topic) => getTopicStatus(topic, learnerState) !== "done")?.id ?? topics[0]?.id ?? null;
}

function getTopicStatus(topic: LearningTopicView, learnerState: LearnerStateView): TopicStatus {
  if (topic.pages.length === 0) {
    return "todo";
  }

  const statuses = topic.pages.map((page) => getPageStatus(page, learnerState));

  if (statuses.every((status) => status === "done")) {
    return "done";
  }

  if (statuses.some((status) => status === "done" || status === "active")) {
    return "active";
  }

  return "todo";
}

function getPageStatus(page: LearningPageView, learnerState: LearnerStateView): PageStatus {
  const progress =
    learnerState.progressByPageId[page.id] ??
    learnerState.progressByLessonId[page.id] ??
    null;

  if (progress?.status === "completed") {
    return "done";
  }

  if (progress?.status === "in_progress") {
    return "active";
  }

  return "todo";
}

function getTopicProgress(topic: LearningTopicView, learnerState: LearnerStateView) {
  const completed = topic.pages.filter((page) => getPageStatus(page, learnerState) === "done").length;

  return {
    completed,
    percent: topic.pages.length > 0 ? Math.round((completed / topic.pages.length) * 100) : 0,
  };
}

function getTopicMinutes(topic: LearningTopicView) {
  return topic.pages.reduce((sum, page) => sum + (page.estimated_duration_minutes ?? 0), 0);
}

function getTopicIcon(topic: LearningTopicView) {
  const haystack = `${topic.topic_code} ${topic.title}`.toLowerCase();
  const match = Object.entries(TOPIC_ICONS).find(([key]) => haystack.includes(key));

  return match?.[1] ?? "📖";
}
