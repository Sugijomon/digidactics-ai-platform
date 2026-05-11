"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LearningAdminCourseSummary, LearningAdminLessonSummary } from "@/lib/learning-admin-data";

export function LessonsTable({
  courses,
  lessons,
}: {
  courses: LearningAdminCourseSummary[];
  lessons: LearningAdminLessonSummary[];
}) {
  const [query, setQuery] = useState("");
  const [courseCode, setCourseCode] = useState("all");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");

  const filteredLessons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return lessons.filter((lesson) => {
      const matchesQuery =
        !normalizedQuery ||
        lesson.title.toLowerCase().includes(normalizedQuery) ||
        (lesson.summary ?? "").toLowerCase().includes(normalizedQuery) ||
        lesson.code.toLowerCase().includes(normalizedQuery);
      const matchesCourse = courseCode === "all" || lesson.course_code === courseCode;
      const matchesStatus = status === "all" || lesson.status === status;
      const matchesKind = kind === "all" || lesson.kind === kind;

      return matchesQuery && matchesCourse && matchesStatus && matchesKind;
    });
  }, [courseCode, kind, lessons, query, status]);

  return (
    <>
      <div className="admin-filter-row expanded">
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zoek op lesnaam, code of omschrijving..."
          value={query}
        />
        <select onChange={(event) => setCourseCode(event.target.value)} value={courseCode}>
          <option value="all">Alle cursussen</option>
          {courses.map((course) => (
            <option key={course.id} value={course.course_code}>
              {course.title}
            </option>
          ))}
        </select>
        <select onChange={(event) => setStatus(event.target.value)} value={status}>
          <option value="all">Alle statussen</option>
          <option value="published">Gepubliceerd</option>
          <option value="draft">Concept</option>
        </select>
        <select onChange={(event) => setKind(event.target.value)} value={kind}>
          <option value="all">Alle typen</option>
          <option value="course_page">Cursuslessen</option>
          <option value="microlearning">Microlearning templates</option>
        </select>
      </div>

      <section className="admin-table-card">
        <div className="admin-table-meta">
          <span>{filteredLessons.length} lessen gevonden</span>
          {(query || courseCode !== "all" || status !== "all" || kind !== "all") && (
            <button
              className="text-button"
              onClick={() => {
                setQuery("");
                setCourseCode("all");
                setStatus("all");
                setKind("all");
              }}
              type="button"
            >
              Filters wissen
            </button>
          )}
        </div>
        <table className="admin-data-table lesson-table">
          <thead>
            <tr>
              <th>Titel</th>
              <th>Gebruikt in</th>
              <th>Duur</th>
              <th>Status</th>
              <th>Blokken</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            {filteredLessons.map((lesson) => (
              <tr key={`${lesson.kind}-${lesson.id}`}>
                <td>
                  <strong>{lesson.title}</strong>
                  <span>{lesson.summary ?? "Geen samenvatting ingesteld."}</span>
                  <small>{lesson.kind === "microlearning" ? "Micro-learning template" : "Cursusles"}</small>
                </td>
                <td>{lesson.course_title ?? "Niet gekoppeld"}</td>
                <td>{lesson.estimated_duration_minutes ? `${lesson.estimated_duration_minutes} min` : "-"}</td>
                <td>
                  <span className={`status-badge ${lesson.status === "published" ? "published" : ""}`}>
                    {lesson.status === "published" ? "Gepubliceerd" : "Concept"}
                  </span>
                </td>
                <td>{lesson.block_count}</td>
                <td>
                  {lesson.kind === "course_page" ? (
                    <Link href={`/learning/admin/lessons/${lesson.code}`}>Bewerken</Link>
                  ) : (
                    <span className="muted">Template</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredLessons.length ? (
          <p className="empty-state">Geen lessen gevonden met deze filters.</p>
        ) : null}
      </section>
    </>
  );
}
