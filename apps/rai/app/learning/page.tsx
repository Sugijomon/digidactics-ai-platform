import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import {
  getAiLiteracyCourse,
  getLearnerState,
  getPublishedCourses,
  getPublishedMicroLearnings,
  type PublishedCourseCatalogItem,
  type PublishedMicroLearningCatalogItem,
} from "@/lib/learning-data";
import {
  getLearningCourseImage,
  getLearningCourseLevelNumber,
  getLearningMicroImage,
  getLearningMicroVisualKey,
} from "@/lib/learning-course-visuals";
import { getCoursePages, type LearnerStateView, type LearningPageView } from "@/lib/learning-preview-data";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LearningPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const activeTab = normalizeCatalogTab((await searchParams)?.tab);
  const [course, courses, lessons, user] = await Promise.all([
    getAiLiteracyCourse("ai-literacy-foundation"),
    getPublishedCourses(),
    getPublishedMicroLearnings(),
    getCurrentUser(),
  ]);
  const learnerState = await getLearnerState(course);
  const pages = getCoursePages(course);
  const completedPages = pages.filter((page) => getPageStatus(page, learnerState) === "completed");
  const progress = pages.length > 0 ? Math.round((completedPages.length / pages.length) * 100) : 0;
  const nextPage = findNextPage(pages, learnerState);
  const nextHref = nextPage ? `/learning/${course.course_code}/${nextPage.page_code}` : `/learning/${course.course_code}`;
  const licenseCourse =
    courses.find((item) => item.course_code === course.course_code) ??
    toCatalogCourse(course, pages, progress, completedPages.length);
  const catalogCourses = buildCourseCatalog(courses, licenseCourse);
  const microCards = buildMicroCards(lessons);

  return (
    <div className="routeai-overview-page">
      <OverviewTopbar isAuthenticated={Boolean(user)} />
      <main className="routeai-overview-shell">
        <section className="routeai-license-banner">
          <div className="routeai-license-copy">
            <span className="routeai-license-icon" aria-hidden="true">
              <ShieldIcon />
            </span>
            <div>
              <div className="routeai-license-title-row">
                <h2>AI Literacy rijbewijs</h2>
                <span>Verplicht</span>
              </div>
              <p>{progress >= 100 ? "Rijbewijs behaald" : "Rijbewijs nog niet behaald"}</p>
            </div>
          </div>
          <div className="routeai-license-action">
            <div className="routeai-license-progress">
              <div>
                <span>Status</span>
                <strong>{progress}% voltooid</strong>
              </div>
              <i>
                <b style={{ width: `${progress}%` }} />
              </i>
            </div>
            <Link href={nextHref}>Ga verder</Link>
          </div>
        </section>

        <header className="routeai-page-heading">
          <h1>Cursussen & microlearnings</h1>
          <p>Verdiep je AI-vaardigheden met korte, praktische lessen voor jouw werk.</p>
        </header>

        <nav className="routeai-tabs" aria-label="Learning overzicht">
          {CATALOG_TABS.map((tab) => (
            <Link className={activeTab === tab.id ? "active" : ""} href={tab.href} key={tab.id}>
              {tab.label}
              {tab.id === "microlearnings" ? <span>{microCards.length}</span> : null}
            </Link>
          ))}
        </nav>

        <div className="routeai-filter-row" aria-label="Filters">
          {["Alle", "Verplicht", "Optioneel", "Mijn rol", "Privacy", "Prompting", "Klantcontact", "Governance"].map(
            (filter, index) => (
              <button className={index === 0 ? "active" : ""} key={filter} type="button">
                {filter}
              </button>
            ),
          )}
        </div>

        {activeTab === "courses" ? (
          <section className="routeai-card-grid" aria-label="Cursussen">
            {catalogCourses.map((catalogCourse) => (
              <CourseCard
                actionHref={getCourseActionHref(catalogCourse, nextHref)}
                actionLabel={getCourseActionLabel(catalogCourse)}
                course={catalogCourse}
                imageUrl={getCourseImage(catalogCourse)}
                key={catalogCourse.id}
                levelLabel={getCourseLevelLabel(catalogCourse)}
                progress={getCourseProgress(catalogCourse, licenseCourse, progress)}
                required={catalogCourse.required_for_onboarding}
              />
            ))}
          </section>
        ) : null}

        {activeTab === "microlearnings" ? (
          <section className="routeai-card-grid routeai-micro-grid" aria-label="Microlearnings">
            {microCards.map((lesson) => (
              <MicroCard key={lesson.id} lesson={lesson} />
            ))}
          </section>
        ) : null}

        {activeTab === "recommended" ? (
          <section className="routeai-empty-state" aria-label="Aanbevolen">
            <h2>Aanbevolen leeritems verschijnen hier zodra er rol- of voortgangsadvies beschikbaar is.</h2>
          </section>
        ) : null}

        {activeTab === "completed" ? (
          <section className="routeai-card-grid" aria-label="Afgeronde cursussen">
            {catalogCourses.filter((item) => item.learner_status === "completed").map((catalogCourse) => (
              <CourseCard
                actionHref={`/learning/${catalogCourse.course_code}`}
                actionLabel="Bekijk cursus"
                course={catalogCourse}
                imageUrl={getCourseImage(catalogCourse)}
                key={catalogCourse.id}
                levelLabel={getCourseLevelLabel(catalogCourse)}
                progress={catalogCourse.progress_percentage}
                required={catalogCourse.required_for_onboarding}
              />
            ))}
            {!catalogCourses.some((item) => item.learner_status === "completed") ? (
              <div className="routeai-empty-state">
                <h2>Nog niets afgerond.</h2>
                <p>Je afgeronde cursussen komen automatisch in dit overzicht te staan.</p>
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
      <OverviewFooter />
    </div>
  );
}

async function getCurrentUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

function OverviewTopbar({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="routeai-topbar">
      <div className="routeai-topbar-inner">
        <Link className="routeai-brand" href="/">
          <strong>Digidactics</strong>
          <span>AI Platform</span>
        </Link>
        <nav className="routeai-main-nav" aria-label="Hoofdnavigatie">
          <Link aria-current="page" href="/dashboard">
            Dashboard
          </Link>
          <Link href="/learning">Leerpaden</Link>
          <Link href="/dashboard">Compliance</Link>
          <Link href="/learning/catalog">Resources</Link>
        </nav>
        <div className="routeai-user-nav">
          <Link href="/learning">Learning</Link>
          {isAuthenticated ? (
            <form action={signOut}>
              <button type="submit">Uitloggen</button>
            </form>
          ) : (
            <Link className="routeai-login-link" href="/auth/login?next=/learning">
              Inloggen
            </Link>
          )}
          <span className="routeai-notification" aria-hidden="true">
            <BellIcon />
          </span>
          <span className="routeai-avatar" aria-hidden="true">
            AI
          </span>
        </div>
      </div>
    </header>
  );
}

function CourseCard({
  actionHref,
  actionLabel,
  course,
  imageUrl,
  levelLabel,
  progress,
  required = false,
}: {
  actionHref: string;
  actionLabel: string;
  course: PublishedCourseCatalogItem;
  imageUrl: string;
  levelLabel: string;
  progress?: number;
  required?: boolean;
}) {
  return (
    <article className="routeai-course-card">
      <div className="routeai-course-image">
        <img alt={course.title} src={imageUrl} />
        <div className="routeai-badge-row">
          <span className={required ? "required" : ""}>{required ? "Verplicht" : "Optioneel"}</span>
          <span>{levelLabel}</span>
        </div>
      </div>
      <div className="routeai-course-body">
        <div>
          <h2>{normalizeTitle(course.title)}</h2>
          <p>{getCourseDescription(course)}</p>
          <div className="routeai-meta-row">
            <span>
              <ClockIcon /> {formatDuration(course.estimated_duration_minutes)}
            </span>
            <span>
              <LayersIcon /> {course.topic_count || course.page_count} topics
            </span>
          </div>
        </div>
        {typeof progress === "number" ? (
          <div className="routeai-card-progress">
            <div>
              <span>Voortgang</span>
              <strong>{progress}%</strong>
            </div>
            <i>
              <b style={{ width: `${progress}%` }} />
            </i>
          </div>
        ) : null}
        <Link className={required ? "routeai-card-primary" : "routeai-card-secondary"} href={actionHref}>
          {actionLabel}
          {required ? <ArrowIcon /> : null}
        </Link>
      </div>
    </article>
  );
}

function MicroCard({ lesson }: { lesson: PublishedMicroLearningCatalogItem }) {
  const imageUrl = getLearningMicroImage({
    code: lesson.lesson_code,
    summary: lesson.summary,
    title: lesson.title,
  });
  const visualKey = getLearningMicroVisualKey({
    code: lesson.lesson_code,
    summary: lesson.summary,
    title: lesson.title,
  });

  return (
    <article className="routeai-micro-card">
      <div className="routeai-micro-image">
        <img alt="" src={imageUrl} />
        <div className="routeai-badge-row">
          <span>{getMicroCategoryLabel(visualKey)}</span>
          <span>Microlearning</span>
        </div>
      </div>
      <div className="routeai-micro-body">
        <h2>{lesson.title}</h2>
        <p>{lesson.summary ?? "Korte praktische verdieping voor je werk."}</p>
        <div className="routeai-micro-foot">
          <span>{lesson.estimated_duration_minutes ?? 10} min</span>
          <Link href={`/learning/lessons/${lesson.lesson_code}`}>
            Start <PlayIcon />
          </Link>
        </div>
      </div>
    </article>
  );
}

const CATALOG_TABS = [
  { id: "courses", label: "Cursussen", href: "/learning" },
  { id: "microlearnings", label: "Microlearnings", href: "/learning?tab=microlearnings" },
  { id: "recommended", label: "Aanbevolen", href: "/learning?tab=recommended" },
  { id: "completed", label: "Afgerond", href: "/learning?tab=completed" },
] as const;

type CatalogTab = (typeof CATALOG_TABS)[number]["id"];

function normalizeCatalogTab(tab: string | undefined): CatalogTab {
  if (tab === "microlearnings" || tab === "recommended" || tab === "completed") {
    return tab;
  }

  return "courses";
}

function buildCourseCatalog(
  courses: PublishedCourseCatalogItem[],
  licenseCourse: PublishedCourseCatalogItem,
) {
  const byCode = new Map<string, PublishedCourseCatalogItem>();

  for (const item of courses) {
    byCode.set(item.course_code, item);
  }

  byCode.set(licenseCourse.course_code, {
    ...licenseCourse,
    ...byCode.get(licenseCourse.course_code),
  });

  return Array.from(byCode.values()).sort((left, right) => {
    const rankDiff = getCourseSortRank(left) - getCourseSortRank(right);
    if (rankDiff !== 0) return rankDiff;
    return normalizeTitle(left.title).localeCompare(normalizeTitle(right.title), "nl");
  });
}

function getCourseSortRank(course: PublishedCourseCatalogItem) {
  const level = getCourseLevel(course);
  if (level === 1) return 10;
  if (level === 2) return 20;
  if (level === 3) return 30;
  return 100;
}

function getCourseImage(course: PublishedCourseCatalogItem) {
  return getLearningCourseImage({
    courseCode: course.course_code,
    difficultyLevel: course.difficulty_level ?? course.level,
    title: course.title,
  });
}

function getCourseLevelLabel(course: PublishedCourseCatalogItem) {
  return `Niveau ${getCourseLevel(course) ?? 1}`;
}

function getMicroCategoryLabel(key: string) {
  const labels: Record<string, string> = {
    client: "Klantcontact",
    default: "Praktijk",
    governance: "Governance",
    privacy: "Privacy",
    prompting: "Prompting",
  };

  return labels[key] ?? labels.default;
}

function getCourseDescription(course: PublishedCourseCatalogItem) {
  const level = getCourseLevel(course);

  if (level === 1) {
    return "Leer veilig, verantwoord en effectief werken met AI volgens het beleid van jouw organisatie.";
  }

  if (level === 2) {
    return "Verdiep je AI-vaardigheden na het AI-rijbewijs. Je leert AI doelgericht inzetten in je eigen werk.";
  }

  if (level === 3) {
    return "Verdiep je in bias, datakwaliteit, menselijke controle en governance rond AI-gebruik.";
  }

  return stripMarkdownMarkers(course.description) ?? "Pas AI met vertrouwen toe in dagelijkse werkprocessen.";
}

function getCourseLevel(course: PublishedCourseCatalogItem) {
  return getLearningCourseLevelNumber({
    courseCode: course.course_code,
    difficultyLevel: course.difficulty_level ?? course.level,
    title: course.title,
  });
}

function getCourseActionHref(course: PublishedCourseCatalogItem, licenseNextHref: string) {
  if (course.course_code === "ai-literacy-foundation") {
    return licenseNextHref;
  }

  return `/learning/${course.course_code}`;
}

function getCourseActionLabel(course: PublishedCourseCatalogItem) {
  if (course.learner_status === "in_progress") return "Ga verder";
  if (course.learner_status === "completed") return "Bekijk cursus";
  return course.course_code === "ai-literacy-foundation" ? "Start cursus" : "Bekijk cursus";
}

function getCourseProgress(
  course: PublishedCourseCatalogItem,
  licenseCourse: PublishedCourseCatalogItem,
  licenseProgress: number,
) {
  if (course.course_code === licenseCourse.course_code) {
    return licenseProgress;
  }

  return course.progress_percentage;
}

function OverviewFooter() {
  return (
    <footer className="routeai-footer">
      <div>
        <strong>RouteAI</strong>
        <span>© 2024 Digidactics - RouteAI Governance Platform</span>
      </div>
      <nav aria-label="Footer">
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/terms">Gebruiksvoorwaarden</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/learning">SME Certificering</Link>
      </nav>
    </footer>
  );
}

function buildMicroCards(lessons: PublishedMicroLearningCatalogItem[]) {
  const fallback: PublishedMicroLearningCatalogItem[] = [
    {
      id: "micro-privacy-placeholder",
      lesson_code: "ai-privacy",
      title: "AI & Privacy",
      summary: "Wat mag je wel en niet delen met AI-tools?",
      estimated_duration_minutes: 8,
      learner_status: "not_started",
    },
    {
      id: "micro-prompting-placeholder",
      lesson_code: "prompting-betere-output",
      title: "Prompting voor betere output",
      summary: "Stel betere vragen en controleer de antwoorden.",
      estimated_duration_minutes: 10,
      learner_status: "not_started",
    },
    {
      id: "micro-klantcommunicatie-placeholder",
      lesson_code: "ai-klantcommunicatie",
      title: "AI in klantcommunicatie",
      summary: "Gebruik AI zorgvuldig bij mails, offertes en klantvragen.",
      estimated_duration_minutes: 12,
      learner_status: "not_started",
    },
  ];

  if (!lessons.length) return fallback;

  return [...lessons.slice(0, 3), ...fallback].slice(0, 3);
}

function toCatalogCourse(
  course: Awaited<ReturnType<typeof getAiLiteracyCourse>>,
  pages: LearningPageView[],
  progress: number,
  completedPageCount: number,
): PublishedCourseCatalogItem {
  return {
    id: course.id,
    course_code: course.course_code,
    title: course.title,
    description: course.description,
    difficulty_level: course.difficulty_level,
    level: "foundation",
    cover_image_url: null,
    required_for_onboarding: course.required_for_onboarding,
    page_count: pages.length,
    topic_count: course.topics.length,
    estimated_duration_minutes: pages.reduce((sum, page) => sum + (page.estimated_duration_minutes ?? 0), 0),
    completed_page_count: completedPageCount,
    progress_percentage: progress,
    learner_status: progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started",
  };
}

function findNextPage(pages: LearningPageView[], learnerState: LearnerStateView) {
  return pages.find((page) => getPageStatus(page, learnerState) !== "completed") ?? pages[0] ?? null;
}

function getPageStatus(page: LearningPageView, learnerState: LearnerStateView) {
  return (
    learnerState.progressByPageId[page.id]?.status ??
    learnerState.progressByLessonId[page.id]?.status ??
    "not_started"
  );
}

function normalizeTitle(title: string) {
  if (/literacy/i.test(title) && !/\(foundation\)/i.test(title)) {
    return "AI Literacy (foundation)";
  }

  return title.replace(/^AISA\s+/i, "");
}

function formatDuration(minutes: number | null) {
  if (!minutes) return "-";
  return `${minutes} min`;
}

function stripMarkdownMarkers(description: string | null) {
  return description
    ?.replace(/\*\*(.*?)\*\*/g, "$1")
    ?.replace(/\*(.*?)\*/g, "$1")
    ?.replace(/__(.*?)__/g, "$1");
}

function ShieldIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M12 3 5.5 5.8v5.4c0 4.1 2.6 7.5 6.5 9.2 3.9-1.7 6.5-5.1 6.5-9.2V5.8L12 3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m9.2 12 1.8 1.8 3.9-4.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M18 9.5a6 6 0 0 0-12 0c0 6-2 6.5-2 6.5h16s-2-.5-2-6.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M9.8 19a2.4 2.4 0 0 0 4.4 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10 6v4l3 1.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path d="m10 3 7 4-7 4-7-4 7-4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="m4 11 6 3.5 6-3.5M4 14.5l6 3.5 6-3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg fill="none" viewBox="0 0 32 32">
      <path d="M10 14v-3a6 6 0 1 1 12 0v3" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      <path d="M8 14h16v12H8V14Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2.4" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.5 7 4 3-4 3V7Z" fill="currentColor" />
    </svg>
  );
}

function MicroIcon({ name }: { name: string }) {
  if (name === "security") return <ShieldIcon />;
  if (name === "support") {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path d="M5 13v-1a7 7 0 0 1 14 0v1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path d="M5 13h3v5H5v-5ZM16 13h3v5h-3v-5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M14 20h-2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M12 4a6 6 0 0 0-3 11.2V18h6v-2.8A6 6 0 0 0 12 4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M10 21h4M10 18h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}
