"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  LearnerStateView,
  LearningCourseView,
  LearningPageView,
} from "@/lib/learning-preview-data";

const SIDEBAR_COLLAPSED_KEY = "routeai:lesson-sidebar-collapsed";

export function CourseNavigator({
  course,
  activePage,
  learnerState,
}: {
  course: LearningCourseView;
  activePage: LearningPageView;
  learnerState: LearnerStateView;
}) {
  const pages = course.topics.flatMap((topic) => topic.pages);
  const completedCount = pages.filter((page) => getPageStatus(page, learnerState) === "completed")
    .length;
  const progress = pages.length === 0 ? 0 : Math.round((completedCount / pages.length) * 100);
  const activeTopicId =
    course.topics.find((topic) => topic.pages.some((page) => page.id === activePage.id))?.id ??
    "";
  const [openTopicIds, setOpenTopicIds] = useState<Set<string>>(
    () => new Set(activeTopicId ? [activeTopicId] : []),
  );
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });

  useEffect(() => {
    setOpenTopicIds(new Set(activeTopicId ? [activeTopicId] : []));
  }, [activeTopicId]);

  function toggleTopic(topicId: string) {
    setOpenTopicIds((current) => {
      const next = new Set(current);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }

  function toggleSidebar() {
    setIsCollapsed((current) => {
      const next = !current;
      window.sessionStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      className={`player-sidebar ${isCollapsed ? "is-collapsed" : ""}`}
      aria-label="Cursusnavigatie"
      aria-expanded={!isCollapsed}
    >
      <button
        aria-label={isCollapsed ? "Zijbalk openen" : "Zijbalk sluiten"}
        className="sidebar-toggle"
        onClick={toggleSidebar}
        type="button"
      >
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <rect height="13" rx="2" stroke="currentColor" strokeWidth="1.6" width="14" x="3" y="3.5" />
          <path d="M7.25 3.75v12.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
          <path d={isCollapsed ? "M10.25 7h3.25M10.25 10h3.25M10.25 13h3.25" : "M10.25 8h3.25M10.25 12h3.25"} stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        </svg>
      </button>

      <div className="sidebar-header">
        <div className="sidebar-course-title">{course.title}</div>
        <div className="sidebar-progress-row">
          <span className="sidebar-progress-label">Voortgang</span>
          <span className="sidebar-progress-pct">{progress}%</span>
        </div>
        <div className="sidebar-progress-bar">
          <div className="sidebar-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="sidebar-topic-list">
        {course.topics.map((topic) => {
          const topicCompletedCount = topic.pages.filter(
            (page) => getPageStatus(page, learnerState) === "completed",
          ).length;
          const isOpen = openTopicIds.has(topic.id);

          return (
            <section className="sidebar-topic" key={topic.id}>
              <button
                aria-expanded={isOpen}
                className="sidebar-topic-head"
                onClick={() => toggleTopic(topic.id)}
                type="button"
              >
                <span className="sidebar-topic-chevron" aria-hidden="true">
                  <svg fill="none" viewBox="0 0 16 16">
                    <path
                      d={isOpen ? "M4 6.5 8 10l4-3.5" : "m6.5 4 3.5 4-3.5 4"}
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.6"
                    />
                  </svg>
                </span>
                <span className="sidebar-topic-label">{formatTopicTitle(topic.title)}</span>
                <span className="sidebar-topic-count">
                  {topicCompletedCount}/{topic.pages.length}
                </span>
              </button>

              {isOpen
                ? topic.pages.map((page, pageIndex) => {
                    const status = getPageStatus(page, learnerState);
                    const isActive = page.id === activePage.id;
                    const isDone = status === "completed";

                    return (
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className={`sidebar-lesson ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                        href={`/learning/${course.course_code}/${page.page_code}`}
                        key={page.id}
                      >
                        <span className="sidebar-lesson-dot">
                          {isDone ? (
                            <span className="dot-check">
                              <svg aria-hidden="true" fill="none" viewBox="0 0 12 12">
                                <path d="m2.4 6.1 2.1 2.1 5.1-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                              </svg>
                            </span>
                          ) : isActive ? (
                            <span className="dot-num">{pageIndex + 1}</span>
                          ) : (
                            <span className="dot-num">{pageIndex + 1}</span>
                          )}
                        </span>
                        <span className="sidebar-lesson-title">{page.title}</span>
                      </Link>
                    );
                  })
                : null}
            </section>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-main">
          <div className="sidebar-footer-icon" aria-hidden="true">
            <svg fill="none" viewBox="0 0 24 24">
              <path d="M4 8.5 12 4l8 4.5-8 4.5L4 8.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
              <path d="M7 11v4.5c1.5 1.4 3.2 2 5 2s3.5-.6 5-2V11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
          </div>
          <div>
            <div className="sidebar-footer-label">AI Rijbewijs</div>
            <div className="sidebar-footer-count">
              {completedCount}/{pages.length} pagina's
            </div>
          </div>
        </div>
        <Link className="sidebar-home-link" href={`/learning/${course.course_code}`} aria-label="Naar cursusoverzicht">
          <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
            <path d="M3.25 9.25 10 3.75l6.75 5.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
            <path d="M5.25 8.75v7h9.5v-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
            <path d="M8.25 15.75V11.5h3.5v4.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
          </svg>
        </Link>
      </div>
    </aside>
  );
}

function getPageStatus(page: LearningPageView, learnerState: LearnerStateView) {
  return (
    learnerState.progressByPageId[page.id]?.status ??
    learnerState.progressByLessonId[page.id]?.status ??
    "not_started"
  );
}

function formatTopicTitle(title: string) {
  if (/[a-z]/.test(title)) {
    return title;
  }

  const keepUppercase = new Set(["AI", "EU", "GPAI", "DPIA", "AVG"]);

  return title
    .toLowerCase()
    .replace(/\b[a-z0-9&]+\b/g, (word) => {
      const upper = word.toUpperCase();
      if (keepUppercase.has(upper) || /^L\d+$/.test(upper)) {
        return upper;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
}
