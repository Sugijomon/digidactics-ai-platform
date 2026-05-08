export interface SupabaseQueryClient {
  rpc(functionName: string, args?: Record<string, unknown>): any;
  from(table: string): {
    select(columns?: string): any;
    insert(values: unknown): any;
    upsert(values: unknown, options?: unknown): any;
    update(values: unknown): any;
  };
}

export interface LearningCourseSummary {
  id: string;
  course_code: string;
  org_id: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  difficulty_level: string;
  required_for_onboarding: boolean;
  passing_threshold: number;
}

export interface LearningLessonSummary {
  id: string;
  lesson_code: string;
  title: string;
  summary: string | null;
  lesson_type: string;
  estimated_duration_minutes: number | null;
  sequence_order?: number;
  is_required?: boolean;
}

export interface LearningRecommendation {
  id: string;
  rule_code: string;
  title: string;
  rationale: string | null;
  source_scope: string;
  priority: number;
  course_id: string | null;
  lesson_id: string | null;
}

export interface LearningCertification {
  id: string;
  org_id: string;
  user_id: string;
  course_id: string;
  enrollment_id: string | null;
  certification_code: string;
  status: "active" | "expired" | "revoked" | "superseded";
  issued_at: string;
  expires_at: string | null;
}

export interface LearningAccessCheck {
  can_access: boolean;
  capability_code: string;
  required_certification_code: string | null;
  certification_status:
    | "active"
    | "expired"
    | "revoked"
    | "superseded"
    | "missing"
    | "not_configured"
    | "missing_profile_org";
  required_course_id: string | null;
  required_course_code: string | null;
  certification_id: string | null;
  expires_at: string | null;
}

export function listPublishedLearningCourses(supabase: SupabaseQueryClient) {
  return supabase
    .from("learning_courses")
    .select(
      [
        "id",
        "course_code",
        "org_id",
        "title",
        "subtitle",
        "description",
        "difficulty_level",
        "required_for_onboarding",
        "passing_threshold",
      ].join(", "),
    )
    .eq("status", "published")
    .order("required_for_onboarding", { ascending: false })
    .order("title", { ascending: true });
}

export function getLearningCourseWithLessons(
  supabase: SupabaseQueryClient,
  courseId: string,
) {
  return supabase
    .from("learning_course_lessons")
    .select(
      [
        "sequence_order",
        "is_required",
        "lesson:learning_lessons(",
        [
          "id",
          "lesson_code",
          "title",
          "summary",
          "lesson_type",
          "estimated_duration_minutes",
          "content_schema_version",
          "content",
        ].join(", "),
        ")",
      ].join(""),
    )
    .eq("course_id", courseId)
    .order("sequence_order", { ascending: true });
}

export function listLearningRecommendationsForSignals(
  supabase: SupabaseQueryClient,
  signals: {
    triggerCodes?: string[];
    useCaseCodes?: string[];
    contextCodes?: string[];
    toolCodes?: string[];
    scoreTiers?: string[];
    reviewClasses?: string[];
  },
) {
  let query = supabase
    .from("learning_recommendation_rules")
    .select(
      [
        "id",
        "rule_code",
        "title",
        "rationale",
        "source_scope",
        "priority",
        "course_id",
        "lesson_id",
      ].join(", "),
    )
    .eq("is_active", true);

  const filters = [
    ["trigger_codes", signals.triggerCodes],
    ["use_case_codes", signals.useCaseCodes],
    ["context_codes", signals.contextCodes],
    ["tool_codes", signals.toolCodes],
    ["score_tiers", signals.scoreTiers],
    ["review_classes", signals.reviewClasses],
  ] as const;

  for (const [column, values] of filters) {
    if (values && values.length > 0) {
      query = query.overlaps(column, values);
    }
  }

  return query.order("priority", { ascending: false });
}

export function checkLearningCapabilityAccess(
  supabase: SupabaseQueryClient,
  capabilityCode = "routeai_usecase_check",
) {
  return supabase.rpc("learning_check_capability_access", {
    p_capability_code: capabilityCode,
  });
}

export function issueLearningCertificationForEnrollment(
  supabase: SupabaseQueryClient,
  enrollmentId: string,
) {
  return supabase.rpc("learning_issue_certification_for_enrollment", {
    p_enrollment_id: enrollmentId,
  });
}

export function upsertLessonProgress(
  supabase: SupabaseQueryClient,
  progress: {
    org_id: string;
    user_id: string;
    lesson_id: string;
    course_id: string;
    status: "not_started" | "in_progress" | "completed";
    current_block_id?: string | null;
    completed_block_ids: string[];
    progress_percentage: number;
  },
) {
  return supabase.from("learning_lesson_progress").upsert(
    {
      ...progress,
      completed_block_ids: progress.completed_block_ids,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id,course_id" },
  );
}
