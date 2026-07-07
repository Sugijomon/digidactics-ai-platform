import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { LessonContent } from "@digidactics/domain/learning";
import type { LearningCourseView } from "./learning-preview-data";

type LocalPageOverride = {
  title: string;
  summary: string | null;
  page_type: string;
  estimated_duration_minutes: number | null;
  is_required: boolean;
  status: string;
  content: LessonContent;
  updated_at: string;
};

type LocalLearningOverrides = Record<string, Record<string, LocalPageOverride>>;

export function applyLocalLearningContentOverrides(course: LearningCourseView): LearningCourseView {
  if (process.env.NODE_ENV === "production") {
    return course;
  }

  const overrides = readLocalLearningContentOverrides()[course.course_code];
  if (!overrides) {
    return course;
  }

  const topics = course.topics.map((topic) => ({
    ...topic,
    pages: topic.pages.map((page) => {
      const override = overrides[page.page_code];
      if (!override) {
        return page;
      }

      return {
        ...page,
        title: override.title,
        summary: override.summary,
        page_type: override.page_type,
        status: override.status,
        estimated_duration_minutes: override.estimated_duration_minutes,
        is_required: override.is_required,
        content: override.content,
      };
    }),
  }));

  return {
    ...course,
    topics,
    pages: topics.flatMap((topic) => topic.pages),
  };
}

export function writeLocalLearningPageOverride({
  content,
  courseCode,
  estimatedDurationMinutes,
  isRequired,
  pageCode,
  pageType,
  status,
  summary,
  title,
}: {
  courseCode: string;
  pageCode: string;
  title: string;
  summary: string | null;
  pageType: string;
  estimatedDurationMinutes: number | null;
  isRequired: boolean;
  status: string;
  content: LessonContent;
}) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Lokale content-overrides zijn alleen beschikbaar in development.");
  }

  const overrides = readLocalLearningContentOverrides();
  const courseOverrides = overrides[courseCode] ?? {};
  courseOverrides[pageCode] = {
    title,
    summary,
    page_type: pageType,
    estimated_duration_minutes: estimatedDurationMinutes,
    is_required: isRequired,
    status,
    content,
    updated_at: new Date().toISOString(),
  };
  overrides[courseCode] = courseOverrides;

  const filePath = getOverridesFilePath();
  fs.writeFileSync(filePath, `${JSON.stringify(overrides, null, 2)}\n`, "utf8");
}

function readLocalLearningContentOverrides(): LocalLearningOverrides {
  const filePath = getOverridesFilePath();
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as LocalLearningOverrides;
  } catch {
    return {};
  }
}

function getOverridesFilePath() {
  return path.join(getRaiAppRoot(), "learning-content-overrides.json");
}

function getRaiAppRoot() {
  const cwd = process.cwd();
  const cwdPackage = path.join(cwd, "package.json");
  if (isRaiPackage(cwdPackage)) {
    return cwd;
  }

  const workspacePackage = path.join(cwd, "apps", "rai", "package.json");
  if (isRaiPackage(workspacePackage)) {
    return path.dirname(workspacePackage);
  }

  return cwd;
}

function isRaiPackage(packagePath: string) {
  try {
    const parsed = JSON.parse(fs.readFileSync(packagePath, "utf8")) as { name?: string };
    return parsed.name === "@digidactics/rai";
  } catch {
    return false;
  }
}
