import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { CompetencyStatusPanel } from "@/components/learning/CompetencyStatusPanel";
import { CourseCertificateSuccess } from "@/components/learning/CourseCertificateSuccess";
import { CourseTopicGrid } from "@/components/learning/CourseTopicGrid";
import { LearningTopbar } from "@/components/learning/LearningTopbar";
import { getAiLiteracyCourse, getLearnerState } from "@/lib/learning-data";
import {
  getCoursePages,
  type LearnerStateView,
  type LearningCourseView,
  type LearningPageView,
  type LearningTopicView,
} from "@/lib/learning-preview-data";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseCode: string }>;
}) {
  const { courseCode } = await params;
  const course = await getAiLiteracyCourse(courseCode).catch(() => null);

  if (!course) {
    notFound();
  }

  const learnerState = await getLearnerState(course);

  if (course.course_code !== courseCode) {
    notFound();
  }

  const pages = getCoursePages(course);
  const totalMinutes = pages.reduce((total, page) => total + (page.estimated_duration_minutes ?? 0), 0);
  const completedPages = pages.filter((page) => {
    const status =
      learnerState.progressByPageId[page.id]?.status ??
      learnerState.progressByLessonId[page.id]?.status;
    return status === "completed";
  });
  const progressPercent = pages.length > 0 ? Math.round((completedPages.length / pages.length) * 100) : 0;
  const nextPage = findNextPage(pages, learnerState);
  const nextPageHref = nextPage
    ? `/learning/${course.course_code}/${nextPage.page_code}`
    : `/learning/${course.course_code}`;
  const hasProgress = completedPages.length > 0 || Boolean(learnerState.enrollment);

  if (course.course_code === "ai-literacy-foundation") {
    return (
      <AiLiteracyFoundationLandingPage
        completedPages={completedPages.length}
        course={course}
        hasProgress={hasProgress}
        learnerState={learnerState}
        nextPageHref={nextPageHref}
        nextPageTitle={nextPage?.title ?? null}
        progressPercent={progressPercent}
        totalMinutes={totalMinutes}
        totalPages={pages.length}
      />
    );
  }

  if (
    course.course_code === "ai-proficiency" ||
    course.course_code === "ai-mastery" ||
    course.course_code === "ai-all-in"
  ) {
    return (
      <RouteAiCourseIntroPage
        completedPages={completedPages.length}
        course={course}
        hasProgress={hasProgress}
        learnerState={learnerState}
        nextPageHref={nextPageHref}
        nextPageTitle={nextPage?.title ?? null}
        progressPercent={progressPercent}
        totalMinutes={totalMinutes}
        totalPages={pages.length}
      />
    );
  }

  return (
    <main className="learning-course-detail-page">
      <LearningTopbar />
      <div className="learning-course-detail-inner">
        <section className="course-detail-hero">
          <div className="hero-top">
            <div className="hero-left">
              <p className="eyebrow">RouteAI Learning System</p>
              <h1>{course.title}</h1>
              {course.description ? <p>{course.description}</p> : null}
              <div className="course-detail-pills">
                <span>🎓 rijbewijs</span>
                <span>📚 {course.topics.length} topics</span>
                <span>📄 {pages.length} pagina&apos;s</span>
                <span>🕐 {totalMinutes} minuten</span>
                <span>🎯 {course.passing_threshold}% norm</span>
              </div>
              <div className="course-hero-progress">
                <div className="course-hero-track">
                  <span style={{ width: `${progressPercent}%` }} />
                </div>
                <small>
                  {progressPercent}% voltooid · {completedPages.length} van {pages.length} pagina&apos;s
                </small>
              </div>
            </div>
            <div className="hero-right">
              <Link className="hero-cta-big" href={nextPageHref}>
                {hasProgress ? "→ Doorgaan" : "Start cursus"}
              </Link>
              {nextPage?.title ? <div className="hero-cta-sub">{nextPage.title}</div> : null}
            </div>
          </div>
        </section>

        <CourseTopicGrid course={course} learnerState={learnerState} />
      </div>
    </main>
  );
}

function AiLiteracyFoundationLandingPage({
  completedPages,
  course,
  hasProgress,
  learnerState,
  nextPageHref,
  nextPageTitle,
  progressPercent,
  totalMinutes,
  totalPages,
}: {
  completedPages: number;
  course: LearningCourseView;
  hasProgress: boolean;
  learnerState: LearnerStateView;
  nextPageHref: string;
  nextPageTitle: string | null;
  progressPercent: number;
  totalMinutes: number;
  totalPages: number;
}) {
  const pages = getCoursePages(course);
  const remainingMinutes = Math.max(totalMinutes - Math.round((totalMinutes * progressPercent) / 100), 0);
  const startLabel = hasProgress ? "Ga verder met de training" : "Start direct met de training";
  const foundationSteps = [
    {
      title: "Wat is AI?",
      text: "De basis van machine learning, taalmodellen en slimme systemen.",
    },
    {
      title: "AI-risico's herkennen",
      text: "Bias, hallucinaties en ethische aandachtspunten in je werk.",
    },
    {
      title: "Privacy & klantdata",
      text: "Veilig omgaan met gevoelige bedrijfs- en klantinformatie.",
    },
    {
      title: "Betrouwbare output",
      text: "AI-resultaten controleren voordat je ze gebruikt of deelt.",
    },
    {
      title: "Wat mag wel en niet?",
      text: "Het interne beleid vertalen naar dagelijkse keuzes.",
    },
    {
      title: "Afronden & rijbewijs",
      text: "Assessment en bewijs van AI-geletterdheid.",
    },
  ];

  return (
    <div className="ai-license-page">
      <CourseRouteAiTopbar />
      <main className="ai-license-shell">
        <section className="ai-license-hero ai-license-hero-polished">
          <div className="ai-license-copy">
            <span className="ai-license-kicker">
              <VerifiedIcon />
              AI-geletterdheid baseline
            </span>
            <h1>Haal je AI-rijbewijs</h1>
            <p>
              Deze training is voor je klaargezet door je organisatie. In korte, praktische stappen leer je
              veilig, verantwoord en effectief werken met AI volgens het interne beleid.
            </p>
            <p className="ai-license-disclaimer">
              Het AI-rijbewijs is een interne metafoor voor aantoonbare AI-geletterdheid; geen officiele
              overheidslicentie of externe certificering.
            </p>
            <div className="ai-license-actions ai-license-actions-row">
              <Link className="ai-license-primary" href={nextPageHref}>
                {startLabel}
                <ArrowIcon />
              </Link>
              <a className="ai-license-secondary" href="#leerpad">
                Bekijk leerpad
              </a>
            </div>
            {hasProgress && nextPageTitle ? <p className="ai-license-next">Volgende stap: {nextPageTitle}</p> : null}
          </div>

          <figure className="ai-license-visual ai-license-hero-image">
            <img
              alt="AI-rijbewijs concept visual"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCbcBrjixq6BG7OxhDlu0uUlXg3JfQQAfiN5ZaJjnxaN2U-IAxDEDTMdQdXUn_FQsnXByNUgegy91cNqGlWN7rTCCKgO5ToQdGaq4X3HA37_h_7duC5LTatuE_LjNBussDe8c10EyiJZwgZKmcKk4wpJiM-pA0Q6SPKDuWED_sy2wCcTX-aRgKWNb_9SjEmVZFqYG345uvarA4RCdkZ7gxWpObJiDEu8-9dOIY3KqQkPIDePZ3WkzdPlnxBU50fmYxhMn3d_heEXs"
            />
          </figure>
        </section>

        <section className="ai-license-bento" aria-label="Jouw verplichte voortgang">
          <article className="ai-license-progress-card ai-license-progress-card-wide">
            <div className="ai-license-progress-head">
              <div>
                <span>RouteAI rijbewijs - verplicht</span>
                <h2>AI-geletterdheid <span>certificaat</span></h2>
              </div>
              <strong>{progressPercent >= 100 ? "Intern rijbewijs behaald" : hasProgress ? "Training gestart" : "Nog niet gestart"}</strong>
            </div>
            <div>
              <div className="ai-license-progress-meta ai-license-progress-meta-spread">
                <span>{progressPercent}% voltooid ({completedPages} van {totalPages} pagina's)</span>
                <span>{formatDuration(remainingMinutes)} resterend</span>
              </div>
              <div className="ai-license-progress-track">
                <span style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            <Link className="ai-license-card-button" href={nextPageHref}>
              {hasProgress ? "Ga verder" : "Starten"}
              <ArrowIcon />
            </Link>
          </article>

          <article className="ai-license-deadline-card">
            <CalendarIcon />
            <span className="ai-license-deadline-label">Deadline</span>
            <h2>Nog niet ingesteld</h2>
            <p>Zodra je DPO of admin een einddatum instelt, tonen we hier de concrete datum en resterende tijd.</p>
            <a href="#leerpad">Leerpad bekijken</a>
          </article>

          <CompetencyStatusPanel course={course} learnerState={learnerState} />
        </section>

        <section className="ai-license-reasons ai-license-reasons-band">
          <div className="ai-license-section-headline">
            <h2>Waarom verplicht?</h2>
            <p>
              Je organisatie vraagt dit niet om extra werk te maken, maar om samen klantdata, kwaliteit
              en verantwoord AI-gebruik te beschermen.
            </p>
          </div>
          <div className="ai-license-reason-grid">
            <ReasonCard
              icon={<ShieldIcon />}
              text="Voorkom dat gevoelige informatie onbedoeld in publieke AI-tools terechtkomt."
              title="Bescherm klantdata"
            />
            <ReasonCard
              icon={<WarningIcon />}
              text="Leer AI-output kritisch beoordelen op bias, hallucinaties en ontbrekende context."
              title="Voorkom fouten"
            />
            <ReasonCard
              icon={<GavelIcon />}
              text="Bouw aantoonbaar aan AI-geletterdheid en verantwoord gebruik binnen je organisatie."
              title="Werk volgens de EU AI Act"
            />
          </div>
        </section>

        <section className="ai-license-path-section" id="leerpad">
          <div className="ai-license-section-title">
            <h2>Wat leer je?</h2>
            <span />
          </div>
          <div className="ai-license-steps">
            {foundationSteps.map((step, index) => {
              const page = pages[index] ?? null;
              const status = page ? getPageStatus(page, learnerState) : "not_started";
              const isDone = status === "completed";
              const isCurrent = !isDone && completedPages === index;
              const content = (
                <>
                  <span className="ai-step-state">{isDone ? "✓" : index + 1}</span>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </>
              );

              return page ? (
                <Link
                  className={`ai-license-step${isDone ? " done" : ""}${isCurrent ? " current" : ""}`}
                  href={`/learning/${course.course_code}/${page.page_code}`}
                  key={step.title}
                >
                  {content}
                </Link>
              ) : (
                <article className="ai-license-step muted" key={step.title}>
                  {content}
                </article>
              );
            })}
          </div>
        </section>

        <section className="ai-license-outcome ai-license-outcome-polished">
          <span className="ai-license-outcome-icon">
            <SparkIcon />
          </span>
          <div>
            <h2>Klaar voor de toekomst?</h2>
            <p>
              Na deze cursus weet je wat je met AI mag doen, wanneer je extra moet opletten en wanneer je
              hulp moet vragen.
            </p>
          </div>
          <Link href={nextPageHref}>Start nu</Link>
        </section>

        <figure className="ai-license-final-visual">
          <img
            alt="Professionele werkruimte met AI-visualisatie"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhWx4nmpb7FCTQkITLl1X1-cPqHaELszDUbnqQVPvG-NO4FSWw75hX_bceoeHGvzAugXjYFfRcSjaJFv9Tpoe0pvZ2E1veXVF4GDBuSIMJnW7E3oo0BClmgMrbTr5YVjyzFVuNkE2ZaRq0IL75DWa_8GU-wmflKRQRxao_CP5nb1XP2_d5dmCTGdkxhMtnXuDgLUtlFJZxNyrO3ZlVhcj8Wz7L_OrBCRLzDGSTCDchCzPtuGVzOnDlJq5LfFUDcUDP66rxo9JEPvc"
          />
          <figcaption>
            <span>Word onderdeel van de professionals die aantoonbaar AI-geletterd werken.</span>
            <Link href={nextPageHref}>{startLabel}</Link>
          </figcaption>
        </figure>
      </main>
      <footer className="ai-license-footer">
        <strong>RouteAI</strong>
        <span>Digidactics - RouteAI Governance Platform</span>
      </footer>
    </div>
  );
}

function RouteAiCourseIntroPage({
  completedPages,
  course,
  hasProgress,
  learnerState,
  nextPageHref,
  nextPageTitle,
  progressPercent,
  totalMinutes,
  totalPages,
}: {
  completedPages: number;
  course: LearningCourseView;
  hasProgress: boolean;
  learnerState: LearnerStateView;
  nextPageHref: string;
  nextPageTitle: string | null;
  progressPercent: number;
  totalMinutes: number;
  totalPages: number;
}) {
  const config = COURSE_INTRO_CONFIG[course.course_code] ?? COURSE_INTRO_CONFIG.default;
  const assessmentTopic = course.topics.find((topic) =>
    `${topic.topic_code} ${topic.title}`.toLowerCase().includes("assessment"),
  );
  const hasCompletedEnrollment = learnerState.enrollment?.status === "completed";

  return (
    <div className="routeai-overview-page routeai-course-page">
      <CourseRouteAiTopbar />
      <main className="routeai-overview-shell routeai-course-shell">
        <nav className="routeai-breadcrumb" aria-label="Breadcrumb">
          <Link href="/learning">Cursussen & microlearnings</Link>
          <span>/</span>
          <strong>{config.title}</strong>
        </nav>

        <section className="routeai-course-hero">
          <div className="routeai-course-hero-copy">
            <div className="routeai-course-kicker">
              <span>{config.requiredLabel}</span>
              <span>{config.levelLabel}</span>
              <span>{config.kicker}</span>
            </div>
            <h1>{config.title}</h1>
            <p>{config.heroText}</p>
            <div className="routeai-course-actions">
              <Link className="routeai-card-primary" href={nextPageHref}>
                {hasProgress ? "Ga verder met de cursus" : `Start ${config.title}`}
                <ArrowIcon />
              </Link>
              <a className="routeai-card-secondary" href="#programma">
                Bekijk programma
              </a>
            </div>
            {nextPageTitle ? <p className="routeai-course-next">Volgende stap: {nextPageTitle}</p> : null}
          </div>

          <aside className="routeai-course-status" aria-label="Jouw voortgang">
            <div className="routeai-course-status-head">
              <span>Jouw voortgang</span>
              <strong>{progressPercent}%</strong>
            </div>
            <div className="routeai-card-progress">
              <i>
                <b style={{ width: `${progressPercent}%` }} />
              </i>
            </div>
            <p>{completedPages} van {totalPages} onderdelen afgerond</p>
            <div className="routeai-course-meta-grid">
              <CourseMeta label="Duur" value={formatDuration(totalMinutes)} />
              <CourseMeta label="Niveau" value={config.levelLabel} />
              <CourseMeta label="Vorm" value={config.formatLabel} />
              <CourseMeta label="Norm" value={`${course.passing_threshold}%`} />
            </div>
          </aside>
        </section>

        <section className="routeai-detail-panel routeai-detail-overview" aria-label="Cursusoverzicht">
          <div>
            <span className="routeai-section-label">Voor je start</span>
            <h2>{config.expectationTitle}</h2>
            <p>{config.expectationText}</p>
          </div>
          <div className="routeai-info-grid">
            {config.infoCards.map((card) => (
              <InfoCard key={card.title} title={card.title} text={card.text} />
            ))}
          </div>
        </section>

        <div className="routeai-two-col">
          <section className="routeai-detail-panel">
            <span className="routeai-section-label">Leerdoelen</span>
            <h2>Na afloop kun je</h2>
            <ul className="routeai-check-list">
              {config.learningGoals.map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
          </section>

          <section className="routeai-detail-panel">
            <span className="routeai-section-label">Voorwaarden</span>
            <h2>Toegang en voorbereiding</h2>
            <ul className="routeai-check-list">
              {config.prerequisites.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="routeai-detail-panel">
          <span className="routeai-section-label">Doelgroep en roladvies</span>
          <h2>{config.audienceTitle}</h2>
          <div className="routeai-role-grid">
            {config.roleAdvice.map((role) => (
              <article className="routeai-role-card" key={role.title}>
                <strong>{role.title}</strong>
                <p>{role.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="routeai-detail-panel" id="programma">
          <div className="routeai-section-head">
            <div>
              <span className="routeai-section-label">Module-overzicht</span>
              <h2>Programma voordat je begint</h2>
            </div>
            <span className="routeai-section-meta">
              {course.topics.length} modules, {totalPages} onderdelen
            </span>
          </div>
          <div className="routeai-module-list">
            {course.topics.map((topic, index) => (
              <ModuleIntroRow
                courseCode={course.course_code}
                key={topic.id}
                learnerState={learnerState}
                sequence={index + 1}
                topic={topic}
              />
            ))}
          </div>
        </section>

        <section className="routeai-detail-panel routeai-cert-panel">
          <div>
            <span className="routeai-section-label">Certificaat en assessment</span>
            <h2>{config.certTitle}</h2>
            <p>{config.certText}</p>
          </div>
          {hasCompletedEnrollment && course.course_code !== "ai-all-in" ? (
            <CourseCertificateSuccess
              variant={course.course_code === "ai-mastery" ? "mastery" : "proficiency"}
            />
          ) : progressPercent >= 100 && course.course_code !== "ai-all-in" ? (
            <p className="routeai-cert-pending">
              Alle pagina&apos;s zijn afgerond. De assessment- en reviewkoppeling moet nog compleet zijn voordat dit als certificaat wordt uitgegeven.
            </p>
          ) : null}
          <div className="routeai-cert-steps">
            <CertStep title={config.certStepTitle} text={assessmentTopic?.summary ?? config.certStepText} />
            <CertStep title="Assessment" text={`Behaal minimaal ${course.passing_threshold}% op de afsluitende toets.`} />
            <CertStep title="Certificaat" text={config.certStatusText} />
          </div>
        </section>
      </main>
    </div>
  );
}

async function CourseRouteAiTopbar() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

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
          {user ? (
            <form action={signOut}>
              <button type="submit">Uitloggen</button>
            </form>
          ) : (
            <Link className="routeai-login-link" href="/auth/login?next=/learning/ai-proficiency">
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

function CourseMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="routeai-course-meta-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="routeai-info-card">
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function ModuleIntroRow({
  courseCode,
  learnerState,
  sequence,
  topic,
}: {
  courseCode: string;
  learnerState: LearnerStateView;
  sequence: number;
  topic: LearningTopicView;
}) {
  const completedPages = topic.pages.filter((page) => getPageStatus(page, learnerState) === "completed").length;
  const activePage =
    topic.pages.find((page) => getPageStatus(page, learnerState) !== "completed") ?? topic.pages[0] ?? null;
  const minutes = topic.pages.reduce((sum, page) => sum + (page.estimated_duration_minutes ?? 0), 0);
  const progress = topic.pages.length ? Math.round((completedPages / topic.pages.length) * 100) : 0;

  return (
    <article className="routeai-module-row">
      <div className="routeai-module-index">{sequence}</div>
      <div className="routeai-module-content">
        <div className="routeai-module-title-row">
          <h3>{topic.title}</h3>
          <span>{minutes} min</span>
        </div>
        <p>{topic.summary}</p>
        <div className="routeai-module-pages">
          {topic.pages.map((page) => (
            <span key={page.id}>{page.title}</span>
          ))}
        </div>
        <div className="routeai-module-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
        <small>
          {completedPages} van {topic.pages.length} onderdelen afgerond
        </small>
      </div>
      {activePage ? (
        <Link className="routeai-module-link" href={`/learning/${courseCode}/${activePage.page_code}`}>
          {completedPages > 0 ? "Ga verder" : "Start module"}
        </Link>
      ) : null}
    </article>
  );
}

function CertStep({ title, text }: { title: string; text: string }) {
  return (
    <article className="routeai-cert-step">
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function ReasonCard({ icon, text, title }: { icon: ReactNode; text: string; title: string }) {
  return (
    <article className="ai-license-reason-card">
      <span>{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

function VerifiedIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path d="m7.8 10 1.5 1.5 3.2-3.7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M10 2.5 12 4l2.5.2.7 2.4L17 8.4 16.3 11l.7 2.5-2.5.7-1.8 1.8-2.7-.7-2.7.7-1.8-1.8-2.5-.7.7-2.5L3 8.4l1.8-1.8.7-2.4L8 4l2-1.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M7 3v4M17 3v4M4.5 9.5h15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M12 3.5 19 6v5.1c0 4.5-2.9 7.9-7 9.4-4.1-1.5-7-4.9-7-9.4V6l7-2.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M12 4 21 20H3L12 4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M12 9v4M12 16.5h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}

function GavelIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="m13.5 6.5 4 4M5 20h8M7.5 14.5l6.8-6.8M10.5 4.7l8.8 8.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M7.2 12.8 11.8 17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M12 3l1.2 5.2L18 10l-4.8 1.8L12 17l-1.2-5.2L6 10l4.8-1.8L12 3ZM18.5 15l.6 2.4 2.4.6-2.4.6-.6 2.4-.6-2.4-2.4-.6 2.4-.6.6-2.4ZM5.5 4l.5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5.5-2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
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

function ArrowIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function getPageStatus(page: LearningPageView, learnerState: LearnerStateView) {
  return (
    learnerState.progressByPageId[page.id]?.status ??
    learnerState.progressByLessonId[page.id]?.status ??
    "not_started"
  );
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} uur ${rest} min` : `${hours} uur`;
}

const PROFICIENCY_LEARNING_GOALS = [
  "AI-kansen herkennen in een concreet werkproces.",
  "Een taak vertalen naar een duidelijke prompt met context, beperkingen en beoordelingscriteria.",
  "AI-output controleren op juistheid, bias, brongebruik en ontbrekende context.",
  "Veilig omgaan met persoonsgegevens, klantdata en interne informatie.",
  "Een verantwoord gebruiksadvies geven voor je team of rol.",
];

const PROFICIENCY_PREREQUISITES = [
  "AI Literacy rijbewijs afgerond of aantoonbare basiskennis van verantwoord AI-gebruik.",
  "Toegang tot de door jouw organisatie goedgekeurde AI-tools.",
  "Een eigen werkproces of voorbeeldtaak om tijdens de praktijkcase te gebruiken.",
  "Bereidheid om output kritisch te controleren voordat je deze deelt of gebruikt.",
];

const PROFICIENCY_ROLE_ADVICE = [
  {
    title: "Kenniswerkers",
    text: "Voor iedereen die AI gebruikt bij schrijven, analyseren, samenvatten, plannen of klantvoorbereiding.",
  },
  {
    title: "Teamleads en proceseigenaren",
    text: "Handig wanneer je AI-gebruik in je team wilt begeleiden en risico's vroeg wilt herkennen.",
  },
  {
    title: "Klantgerichte rollen",
    text: "Relevant voor medewerkers die AI-output gebruiken in klantcontact, advies of besluitvoorbereiding.",
  },
];

const MASTERY_LEARNING_GOALS = [
  "AI-output beoordelen op bias, datakwaliteit, brongebruik en ontbrekende context.",
  "Risico's inschatten voor toepassingen met impact op klanten, medewerkers of processen.",
  "Menselijke controle organiseren rond besluitvorming en gebruik van AI-output.",
  "Governance-afspraken vertalen naar concrete werkinstructies en bewijsvoering.",
  "Verbeterpunten formuleren voor verantwoord AI-gebruik binnen je team.",
];

const MASTERY_PREREQUISITES = [
  "AI Literacy afgerond en basiservaring met AI in je werk.",
  "Bekendheid met de goedgekeurde AI-tools en interne richtlijnen van je organisatie.",
  "Een herkenbare case of proces waarin bias, data of governance relevant is.",
  "Bereidheid om AI-output systematisch te onderbouwen en te escaleren waar nodig.",
];

const MASTERY_ROLE_ADVICE = [
  {
    title: "Senior kenniswerkers",
    text: "Voor professionals die AI-output niet alleen gebruiken, maar ook willen toetsen en verbeteren.",
  },
  {
    title: "Teamleads en proceseigenaren",
    text: "Relevant wanneer je AI-gebruik wilt borgen in werkafspraken, controles en kwaliteitsstandaarden.",
  },
  {
    title: "Governance en risk rollen",
    text: "Handig voor medewerkers die risico's, bewijsvoering en verantwoord gebruik moeten kunnen uitleggen.",
  },
];

type CourseIntroCard = {
  title: string;
  text: string;
};

type CourseIntroConfig = {
  title: string;
  requiredLabel: string;
  levelLabel: string;
  kicker: string;
  formatLabel: string;
  heroText: string;
  expectationTitle: string;
  expectationText: string;
  infoCards: CourseIntroCard[];
  learningGoals: string[];
  prerequisites: string[];
  audienceTitle: string;
  roleAdvice: CourseIntroCard[];
  certTitle: string;
  certText: string;
  certStepTitle: string;
  certStepText: string;
  certStatusText: string;
};

const COURSE_INTRO_CONFIG: Record<string, CourseIntroConfig> = {
  "ai-proficiency": {
    title: "AI Proficiency",
    requiredLabel: "Optioneel",
    levelLabel: "Niveau 2",
    kicker: "Intermediate cursus",
    formatLabel: "Online + praktijkcase",
    heroText:
      "Ga verder na je AI-rijbewijs en leer AI effectief toepassen in je eigen werk. Je werkt met praktijkcases, kwaliteitschecks en veilige datakeuzes.",
    expectationTitle: "Wat je van deze cursus kunt verwachten",
    expectationText:
      "AI Proficiency is bedoeld voor medewerkers die de basis kennen en AI nu bewuster, sneller en controleerbaarder willen gebruiken in hun dagelijkse werk.",
    infoCards: [
      {
        title: "Uitleg vooraf",
        text: "Je ziet wanneer AI zinvol is, welke aanpak past bij de taak en hoe je start zonder onnodige risico's.",
      },
      {
        title: "Praktisch toepassen",
        text: "Elke module vertaalt beleid naar concrete werkstappen, prompts, controles en beslismomenten.",
      },
      {
        title: "Bewijs van vaardigheid",
        text: "Je sluit af met een praktijkcase en assessment waarmee je laat zien dat je AI verantwoord kunt inzetten.",
      },
    ],
    learningGoals: PROFICIENCY_LEARNING_GOALS,
    prerequisites: PROFICIENCY_PREREQUISITES,
    audienceTitle: "Voor wie is AI Proficiency bedoeld?",
    roleAdvice: PROFICIENCY_ROLE_ADVICE,
    certTitle: "Zo rond je AI Proficiency af",
    certText:
      "De cursus eindigt met een praktijkcase en een korte toets. Bij een voldoende resultaat wordt AI Proficiency zichtbaar in je leerstatus en kan je organisatie dit gebruiken als bewijs voor rolgerichte AI-vaardigheid.",
    certStepTitle: "Praktijkcase",
    certStepText: "Werk een herkenbare AI-case uit.",
    certStatusText: "Ontvang een interne RouteAI Proficiency-status na afronding.",
  },
  "ai-mastery": {
    title: "AI Mastery",
    requiredLabel: "Optioneel",
    levelLabel: "Niveau 3",
    kicker: "Advanced cursus",
    formatLabel: "Online + governance case",
    heroText:
      "Verdiep je in bias, datakwaliteit, menselijke controle en governance. Je leert AI-output kritisch beoordelen en verantwoord gebruik borgen in je team of proces.",
    expectationTitle: "Wat je van AI Mastery kunt verwachten",
    expectationText:
      "AI Mastery is bedoeld voor medewerkers die AI niet alleen toepassen, maar ook kwaliteit, risico's en besluitvorming rond AI-gebruik willen kunnen beoordelen.",
    infoCards: [
      {
        title: "Kritisch beoordelen",
        text: "Je leert signalen van bias, onvolledige data en onterechte zekerheid herkennen.",
      },
      {
        title: "Governance toepassen",
        text: "Je vertaalt beleid naar concrete controles, rollen en escalatiemomenten.",
      },
      {
        title: "Borgen in de praktijk",
        text: "Je rondt af met een case waarin je verantwoord AI-gebruik aantoonbaar maakt.",
      },
    ],
    learningGoals: MASTERY_LEARNING_GOALS,
    prerequisites: MASTERY_PREREQUISITES,
    audienceTitle: "Voor wie is AI Mastery bedoeld?",
    roleAdvice: MASTERY_ROLE_ADVICE,
    certTitle: "Zo rond je AI Mastery af",
    certText:
      "De cursus eindigt met een governancegerichte case en korte toets. Bij afronding laat je zien dat je AI-output en AI-gebruik op een hoger volwassenheidsniveau kunt beoordelen.",
    certStepTitle: "Governance case",
    certStepText: "Werk een case uit waarin bias, data en menselijke controle centraal staan.",
    certStatusText: "Ontvang een interne RouteAI Mastery-status na afronding.",
  },
  "ai-all-in": {
    title: "AI All-in",
    requiredLabel: "Archief",
    levelLabel: "Alle niveaus",
    kicker: "Content archief",
    formatLabel: "Online archief",
    heroText:
      "Een lange archiefcursus met geteste content uit AI Literacy, AI Proficiency en AI Mastery. Gebruik deze cursus om oude en huidige content items terug te vinden, te openen en te beoordelen.",
    expectationTitle: "Wat je van AI All-in kunt verwachten",
    expectationText:
      "AI All-in is geen strak leerpad voor medewerkers, maar een bewaarplek voor content-redactie. Je kunt alle samengevoegde topics en lespagina's vanuit dezelfde moderne cursusweergave openen.",
    infoCards: [
      {
        title: "Archief van varianten",
        text: "Gearchiveerde AI Literacy-pagina's staan naast de huidige Proficiency- en Mastery-content.",
      },
      {
        title: "Snel vergelijken",
        text: "Modules zijn gegroepeerd per bron, zodat je kunt zien welke content uit welke cursus komt.",
      },
      {
        title: "Bewerkbaar in editor",
        text: "Alle pagina's zijn normale course pages met content blocks en kunnen via de content editor worden geopend.",
      },
    ],
    learningGoals: [
      "Geteste contentvarianten uit eerdere AI Literacy-rondes terugvinden.",
      "Huidige AI Proficiency- en AI Mastery-pagina's naast oude content bekijken.",
      "Content blocks beoordelen op herbruikbaarheid, overlap en kwaliteit.",
      "Dubbele of verouderde lespagina's markeren voor latere opschoning.",
      "Een archiefroute behouden zonder de productiegerichte cursussen te vervuilen.",
    ],
    prerequisites: [
      "Bedoeld voor content editor, admin of ontwikkelteam.",
      "Niet bedoeld als verplichte medewerkerstraining.",
      "Gebruik de bronlabels in module- en paginasamenvattingen om herkomst te controleren.",
      "Stem inhoudelijke samenvoeging of verwijdering later af voordat je productiecontent opschoont.",
    ],
    audienceTitle: "Voor wie is AI All-in bedoeld?",
    roleAdvice: [
      {
        title: "Content editors",
        text: "Voor het terugzoeken, vergelijken en hergebruiken van bestaande content blocks.",
      },
      {
        title: "RouteAI admins",
        text: "Voor overzicht op wat er eerder getest is en wat nog als archief bewaard moet blijven.",
      },
      {
        title: "Ontwikkelteam",
        text: "Voor regressiechecks op lesson player, editorweergave en block-rendering over veel contenttypen.",
      },
    ],
    certTitle: "Geen certificering, wel archiefwaarde",
    certText:
      "AI All-in is gepubliceerd zodat pagina's zichtbaar zijn in de lesson player, maar de cursus is niet bedoeld als formele certificering of medewerkerstoets.",
    certStepTitle: "Archiefreview",
    certStepText: "Open modules, vergelijk contentvarianten en noteer welke items later opgeschoond of hergebruikt worden.",
    certStatusText: "Gebruik afronding alleen als interne reviewstatus, niet als leerbewijs voor medewerkers.",
  },
  default: {
    title: "AI cursus",
    requiredLabel: "Optioneel",
    levelLabel: "Learning",
    kicker: "Cursus",
    formatLabel: "Online",
    heroText: "Verdiep je AI-vaardigheden met praktische lessen voor jouw werk.",
    expectationTitle: "Wat je van deze cursus kunt verwachten",
    expectationText: "Deze cursus helpt je AI bewuster en controleerbaarder toe te passen.",
    infoCards: [],
    learningGoals: PROFICIENCY_LEARNING_GOALS,
    prerequisites: PROFICIENCY_PREREQUISITES,
    audienceTitle: "Voor wie is deze cursus bedoeld?",
    roleAdvice: PROFICIENCY_ROLE_ADVICE,
    certTitle: "Zo rond je de cursus af",
    certText: "Rond de onderdelen af en behaal de norm voor je interne leerstatus.",
    certStepTitle: "Praktijkcase",
    certStepText: "Werk een herkenbare case uit.",
    certStatusText: "Ontvang een interne RouteAI-status na afronding.",
  },
};

function findNextPage(
  pages: LearningPageView[],
  learnerState: Awaited<ReturnType<typeof getLearnerState>>,
) {
  return (
    pages.find((page) => {
      const status =
        learnerState.progressByPageId[page.id]?.status ??
        learnerState.progressByLessonId[page.id]?.status;
      return status !== "completed";
    }) ??
    pages[0] ??
    null
  );
}
