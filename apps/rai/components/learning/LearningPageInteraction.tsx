"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChecklistBlock, IframeBlock, LessonBlock } from "@digidactics/domain/learning";
import { ChecklistBlockPlayer } from "@/components/learning/ChecklistBlockPlayer";
import { LessonBlockRenderer } from "@/components/learning/LessonBlockRenderer";
import { SlideDeckPlayer } from "@/components/learning/SlideDeckPlayer";
import { VideoBlockPlayer } from "@/components/learning/VideoBlockPlayer";
import type {
  LearningAttemptView,
  LearningCourseView,
  LearningPageView,
} from "@/lib/learning-preview-data";

type AnswerValue = string | string[];

export function LearningPageInteraction({
  action,
  course,
  isAuthenticated,
  isCompleted,
  isTopicTransition,
  latestAttempt,
  nextPageCode,
  nextPageTitle,
  nextTopicTitle,
  page,
  previousPageCode,
  topicPageIndex,
  topicPageTotal,
}: {
  action: (formData: FormData) => void | Promise<void>;
  course: LearningCourseView;
  isAuthenticated: boolean;
  isCompleted: boolean;
  isTopicTransition: boolean;
  latestAttempt: LearningAttemptView | null;
  nextPageCode: string;
  nextPageTitle: string;
  nextTopicTitle: string;
  page: LearningPageView;
  previousPageCode: string;
  topicPageIndex: number;
  topicPageTotal: number;
}) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(() =>
    getInitialAnswers(latestAttempt),
  );
  const [checklistProceedState, setChecklistProceedState] = useState<Record<string, boolean>>({});
  const updateAnswer = useCallback((blockId: string, value: AnswerValue) => {
    setAnswers((current) => ({ ...current, [blockId]: value }));
  }, []);
  const messageEnabledIframeIds = useMemo(
    () =>
      new Set(
        page.content.blocks
          .filter(isIframeMessageBlock)
          .map((block) => block.id),
      ),
    [page.content.blocks],
  );
  const messageEnabledIframeOrigins = useMemo(
    () =>
      new Map(
        page.content.blocks
          .filter(isIframeMessageBlock)
          .map((block) => [block.id, getUrlOrigin(block.url)])
          .filter((entry): entry is [string, string] => Boolean(entry[1])),
      ),
    [page.content.blocks],
  );

  useEffect(() => {
    function handleIframeMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== "object") return;

      const data = event.data as {
        answer?: unknown;
        blockId?: unknown;
        event?: unknown;
        type?: unknown;
      };

      if (data.type !== "digidactics_event") return;
      if (data.event !== "block_complete" && data.event !== "answer_submitted") return;
      if (typeof data.blockId !== "string" || !messageEnabledIframeIds.has(data.blockId)) return;

      const expectedOrigin = messageEnabledIframeOrigins.get(data.blockId);
      if (expectedOrigin && event.origin !== expectedOrigin) return;

      updateAnswer(data.blockId, normalizePostMessageAnswer(data.answer));
    }

    window.addEventListener("message", handleIframeMessage);
    return () => window.removeEventListener("message", handleIframeMessage);
  }, [messageEnabledIframeIds, messageEnabledIframeOrigins, updateAnswer]);

  const interactiveBlocks = useMemo(
    () => page.content.blocks.filter(isInteractiveBlock),
    [page.content.blocks],
  );
  const checklistBlocks = useMemo(
    () => page.content.blocks.filter(isChecklistBlock),
    [page.content.blocks],
  );
  const completedInteractiveCount = interactiveBlocks.filter((block) =>
    isBlockSatisfied(block, answers[block.id]),
  ).length;
  const canProceedChecklist = checklistBlocks.every(
    (block) => !requiresChecklistCompletion(block) || checklistProceedState[block.id] === true,
  );
  const canComplete =
    isCompleted ||
    ((interactiveBlocks.length === 0 ||
      completedInteractiveCount === interactiveBlocks.length) &&
      canProceedChecklist);
  const nextActionLabel = nextPageCode
    ? isTopicTransition
      ? "Volgende onderwerp >"
      : "Volgende >"
    : "Afronden";

  const updateChecklistProceed = useCallback((blockId: string, canProceed: boolean) => {
    setChecklistProceedState((current) => {
      if (current[blockId] === canProceed) {
        return current;
      }
      return { ...current, [blockId]: canProceed };
    });
  }, []);

  return (
    <form action={action} className="lesson-player-form">
      <input name="courseId" type="hidden" value={course.id} />
      <input name="courseCode" type="hidden" value={course.course_code} />
      <input name="pageId" type="hidden" value={page.id} />
      <input name="pageCode" type="hidden" value={page.page_code} />
      <input name="nextPageCode" type="hidden" value={nextPageCode} />

      <article className="page-canvas">
        {latestAttempt ? (
          <div className="resume-notice">
            <strong>{getAttemptStatusLabel(latestAttempt)}</strong>
            <span>
              Poging {latestAttempt.attempt_number}
              {typeof latestAttempt.percentage === "number"
                ? ` / ${latestAttempt.percentage}%`
                : ""}
              {latestAttempt.submitted_at ? ` / ${formatDate(latestAttempt.submitted_at)}` : ""}
            </span>
          </div>
        ) : null}
        {page.content.blocks.map((block) =>
          isInteractiveBlock(block) ? (
            <InteractiveBlock
              answer={answers[block.id]}
              block={block}
              key={block.id}
              onAnswer={(value) => updateAnswer(block.id, value)}
            />
          ) : isChecklistBlock(block) ? (
            <ChecklistBlockPlayer
              block={block}
              key={block.id}
              onCanProceed={(canProceed) => updateChecklistProceed(block.id, canProceed)}
            />
          ) : (
            <LessonBlockRenderer block={block} key={block.id} />
          ),
        )}
      </article>

      <nav className="player-bottombar" aria-label="Pagina voortgang">
        <div className="bottombar-left">
          {previousPageCode ? (
            <Link
              className="nav-btn nav-prev"
              href={`/learning/${course.course_code}/${previousPageCode}`}
            >
              ‹ Vorige
            </Link>
          ) : null}
        </div>

        <div className="bottombar-center">
          <div className="bottombar-page-label">
            Pagina {topicPageIndex + 1} van {topicPageTotal}
          </div>
        </div>

        <div className="bottombar-right">
          {isCompleted && nextPageCode ? (
            <div className="next-action-stack">
              <Link
                className="nav-btn nav-next"
                href={`/learning/${course.course_code}/${nextPageCode}`}
              >
                {nextActionLabel}
              </Link>
              {isTopicTransition && nextTopicTitle ? (
                <span className="next-action-context">{nextTopicTitle}</span>
              ) : nextPageTitle ? (
                <span className="next-action-context">{nextPageTitle}</span>
              ) : null}
            </div>
          ) : isCompleted ? (
            <Link className="nav-btn nav-finish" href="/learning">
              Afronden
            </Link>
          ) : isAuthenticated ? (
            <button
              className={nextPageCode ? "nav-btn nav-next" : "nav-btn nav-finish"}
              disabled={!canComplete}
              title={canComplete ? undefined : "Rond eerst de verplichte interacties op deze pagina af."}
              type="submit"
            >
              {nextActionLabel}
            </button>
          ) : (
            <span className="nav-btn nav-prev">Login vereist</span>
          )}
        </div>
      </nav>
    </form>
  );
}

function InteractiveBlock({
  answer,
  block,
  onAnswer,
}: {
  answer: AnswerValue | undefined;
  block: LessonBlock;
  onAnswer: (value: AnswerValue) => void;
}) {
  switch (block.type) {
    case "scenario": {
      const selected = asText(answer);
      const selectedChoice = block.choices.find((choice) => choice.id === selected);

      return (
        <section className="block practice-block interactive-block">
          <p className="eyebrow">Scenario</p>
          <p>{block.situation}</p>
          <h2>{block.question}</h2>
          <div className="quiz-options">
            {block.choices.map((choice) => (
              <label className="quiz-option" data-selected={selected === choice.id} key={choice.id}>
                <input
                  checked={selected === choice.id}
                  name={`answer:${block.id}`}
                  onChange={() => onAnswer(choice.id)}
                  type="radio"
                  value={choice.id}
                />
                <span>{choice.label}</span>
              </label>
            ))}
          </div>
          {selectedChoice ? (
            <div className={`answer-feedback ${selectedChoice.is_recommended ? "correct" : "incorrect"}`}>
              <strong>{selectedChoice.is_recommended ? "Veilige keuze" : "Let op"}</strong>
              <p>{selectedChoice.consequence}</p>
            </div>
          ) : (
            <p className="interaction-hint">Kies een antwoord om het gevolg te zien.</p>
          )}
        </section>
      );
    }

    case "reflection":
      return (
        <section className="block practice-block interactive-block">
          <p className="eyebrow">Reflectie</p>
          <h2>Reflectie</h2>
          <p>{block.prompt}</p>
          <div className="reflection-panel">
            <textarea
              aria-label="Reflectieantwoord"
              name={`answer:${block.id}`}
              onChange={(event) => onAnswer(event.target.value)}
              placeholder={block.placeholder ?? "Schrijf hier je reflectie..."}
              rows={4}
              value={asText(answer)}
            />
            <OpenAnswerStatus answer={asText(answer)} minWords={block.min_words} />
          </div>
        </section>
      );

    case "case_lab":
      return (
        <section className="block practice-block interactive-block">
          <p className="eyebrow">Casus</p>
          {isMeaningfulTitle(block.title, "Casus") ? <h2>{block.title}</h2> : null}
          <p>{block.markdown}</p>
          {block.reflection_prompt ? (
            <div className="reflection-panel">
              <strong>Reflectie</strong>
              <p>{block.reflection_prompt}</p>
              <textarea
                aria-label="Reflectieantwoord"
                name={`answer:${block.id}`}
                onChange={(event) => onAnswer(event.target.value)}
                placeholder="Noteer kort je afweging."
                rows={4}
                value={asText(answer)}
              />
              <OpenAnswerStatus answer={asText(answer)} minWords={20} />
            </div>
          ) : null}
        </section>
      );

    case "paragraph": {
      const imageUrl = (block as { image_url?: string }).image_url;

      return (
        <section className="block">
          <p>{block.markdown}</p>
          {imageUrl ? (
            <figure className="lesson-image lesson-image-full paragraph-image">
              <img alt="" src={imageUrl} />
            </figure>
          ) : null}
        </section>
      );
    }

    case "quiz_multiple_choice": {
      const selected = asText(answer);
      const isAnswered = Boolean(selected);
      const isCorrect = selected === block.correct_option_id;

      return (
        <section className="block practice-block interactive-block">
          <p className="eyebrow">Checkvraag</p>
          <CheckQuestionIcon />
          <p className="quiz-question">{block.question}</p>
          <div className="quiz-options">
            {block.options.map((option) => (
              <label className="quiz-option" data-selected={selected === option.id} key={option.id}>
                <input
                  checked={selected === option.id}
                  name={`answer:${block.id}`}
                  onChange={() => onAnswer(option.id)}
                  type="radio"
                  value={option.id}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <QuizFeedback isAnswered={isAnswered} isCorrect={isCorrect} text={block.explanation} />
        </section>
      );
    }

    case "quiz_multiple_select": {
      const selected = asArray(answer);
      const isAnswered = selected.length > 0;
      const isCorrect = sameStringSet(selected, block.correct_option_ids);

      return (
        <section className="block practice-block interactive-block">
          <p className="eyebrow">Checkvraag</p>
          <CheckQuestionIcon />
          <p className="quiz-question">{block.question}</p>
          <div className="quiz-options">
            {block.options.map((option) => {
              const checked = selected.includes(option.id);
              return (
                <label className="quiz-option" data-selected={checked} key={option.id}>
                  <input
                    checked={checked}
                    name={`answer:${block.id}`}
                    onChange={() =>
                      onAnswer(
                        checked
                          ? selected.filter((id) => id !== option.id)
                          : [...selected, option.id],
                      )
                    }
                    type="checkbox"
                    value={option.id}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
          <QuizFeedback isAnswered={isAnswered} isCorrect={isCorrect} text={block.explanation} />
        </section>
      );
    }

    case "quiz_true_false": {
      const selected = asText(answer);
      const isAnswered = selected === "true" || selected === "false";
      const isCorrect = isAnswered && (selected === "true") === block.correct_answer;

      return (
        <section className="block practice-block interactive-block">
          <p className="eyebrow">Waar of niet waar</p>
          <CheckQuestionIcon />
          <p className="true-false-question">{block.question}</p>
          <div className="quiz-options two-options">
            {[
              ["true", "Waar"],
              ["false", "Niet waar"],
            ].map(([value, label]) => (
              <label className="quiz-option" data-selected={selected === value} key={value}>
                <input
                  checked={selected === value}
                  name={`answer:${block.id}`}
                  onChange={() => onAnswer(value)}
                  type="radio"
                  value={value}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <QuizFeedback isAnswered={isAnswered} isCorrect={isCorrect} text={block.explanation} />
        </section>
      );
    }

    case "quiz_essay":
      return (
        <section className="block practice-block interactive-block">
          <p className="eyebrow">Reflectievraag</p>
          <h2>Reflectievraag</h2>
          <p>{block.question}</p>
          <div className="answer-box">
            <span>
              {block.min_words ?? 0}-{block.max_words ?? "open"} woorden
            </span>
            <textarea
              aria-label="Reflectieantwoord"
              name={`answer:${block.id}`}
              onChange={(event) => onAnswer(event.target.value)}
              placeholder="Schrijf hier je reflectie."
              rows={6}
              value={asText(answer)}
            />
            <OpenAnswerStatus answer={asText(answer)} minWords={block.min_words} />
          </div>
        </section>
      );

    case "short_answer":
      return (
        <section className="block practice-block interactive-block">
          <p className="eyebrow">Open vraag</p>
          <p className="open-question">{block.question}</p>
          <div className="answer-box">
            <textarea
              aria-label="Open antwoord"
              name={`answer:${block.id}`}
              onChange={(event) => onAnswer(event.target.value)}
              placeholder={block.placeholder ?? "Schrijf je antwoord."}
              rows={4}
              value={asText(answer)}
            />
            <OpenAnswerStatus answer={asText(answer)} minWords={block.min_words} />
          </div>
          {block.guidance ? <p>{block.guidance}</p> : null}
        </section>
      );

    case "slide_deck":
      return (
        <SlideDeckPlayer
          answerName={`answer:${block.id}`}
          block={block}
          initialAnswer={asText(answer)}
          onAnswer={onAnswer}
        />
      );

    case "iframe":
      return (
        <>
          <input name={`answer:${block.id}`} type="hidden" value={asText(answer)} />
          <LessonBlockRenderer block={block} />
        </>
      );

    case "video":
      return (
        <>
          <input name={`answer:${block.id}`} type="hidden" value={asText(answer)} />
          <VideoBlockPlayer
            block={block}
            initialWatched={Boolean(asText(answer))}
            onAnswer={onAnswer}
          />
        </>
      );

    default:
      return <LessonBlockRenderer block={block} />;
  }
}

function QuizFeedback({
  isAnswered,
  isCorrect,
  text,
}: {
  isAnswered: boolean;
  isCorrect: boolean;
  text?: string;
}) {
  if (!isAnswered) {
    return <p className="interaction-hint">Kies een antwoord om feedback te zien.</p>;
  }

  return (
    <div className={`answer-feedback ${isCorrect ? "correct" : "incorrect"}`}>
      <strong>{isCorrect ? "Correct" : "Nog niet juist"}</strong>
      {isCorrect && text ? <p>{text}</p> : null}
    </div>
  );
}

function CheckQuestionIcon() {
  return (
    <span aria-hidden="true" className="check-question-icon">
      <svg fill="none" height="26" viewBox="0 0 24 24" width="26">
        <path
          d="m7.5 12.2 3 3 6-6.4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.7"
        />
      </svg>
    </span>
  );
}

function OpenAnswerStatus({ answer, minWords }: { answer: string; minWords?: number }) {
  const wordCount = countWords(answer);
  const requiredWords = minWords ?? 1;
  const isReady = wordCount >= requiredWords;

  return (
    <p className={`open-answer-status ${isReady ? "ready" : ""}`}>
      {isReady
        ? "Ingevuld"
        : `${wordCount}/${requiredWords} woorden minimaal voor afronden`}
    </p>
  );
}

function isInteractiveBlock(block: LessonBlock) {
  return (
    block.type === "quiz_multiple_choice" ||
    block.type === "quiz_multiple_select" ||
    block.type === "quiz_true_false" ||
    block.type === "quiz_essay" ||
    block.type === "short_answer" ||
    block.type === "scenario" ||
    block.type === "reflection" ||
    (block.type === "case_lab" && Boolean(block.reflection_prompt)) ||
    (block.type === "slide_deck" &&
      Array.isArray(block.slides) &&
      block.slides.some((slide) => Boolean(slide?.interaction && slide.interaction.type !== "none"))) ||
    isIframeMessageBlock(block) ||
    (block.type === "video" && Boolean(block.require_full_watch))
  );
}

function isIframeMessageBlock(block: LessonBlock): block is IframeBlock {
  return (
    block.type === "iframe" &&
    typeof block.evidence_kind === "string" &&
    block.evidence_kind !== "none" &&
    block.evidence_kind.length > 0
  );
}

function isChecklistBlock(block: LessonBlock): block is ChecklistBlock {
  return block.type === "checklist";
}

function requiresChecklistCompletion(block: ChecklistBlock) {
  if (block.require_all === false) {
    return false;
  }

  return block.items.some((item) => {
    if (typeof item === "string") {
      return item.trim().length > 0;
    }

    return item.required && item.label.trim().length > 0;
  });
}

function isBlockSatisfied(block: LessonBlock, answer: AnswerValue | undefined) {
  switch (block.type) {
    case "quiz_multiple_choice":
    case "quiz_true_false":
    case "scenario":
      return Boolean(asText(answer));
    case "quiz_multiple_select":
      return asArray(answer).length > 0;
    case "quiz_essay":
    case "short_answer":
    case "reflection":
      return countWords(asText(answer)) >= (block.min_words ?? 1);
    case "case_lab":
      return block.reflection_prompt ? countWords(asText(answer)) >= 20 : true;
    case "slide_deck":
      return isSlideDeckAnswerSatisfied(block, asText(answer));
    case "iframe":
    case "video":
      return Boolean(asText(answer));
    default:
      return true;
  }
}

function normalizePostMessageAnswer(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || "completed";
  }

  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "completed";
    }
  }

  return "completed";
}

function getUrlOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function isSlideDeckAnswerSatisfied(block: LessonBlock, value: string) {
  if (block.type !== "slide_deck") return true;

  const slides = (block.slides ?? []).filter((slide) => slide?.url);
  if (!slides.length) return false;

  const answer = parseSlideDeckAnswer(value);

  return slides.every((slide) => {
    const interaction = slide.interaction;
    if (!interaction || interaction.type === "none") {
      return answer.visited.includes(slide.id);
    }

    if (interaction.type === "reflection") {
      return countWords(answer.reflections[slide.id] ?? "") >= 1;
    }

    return Boolean(answer.choices[slide.id]);
  });
}

function parseSlideDeckAnswer(value: string) {
  try {
    const parsed = JSON.parse(value) as {
      choices?: Record<string, string>;
      reflections?: Record<string, string>;
      visited?: string[];
    };
    return {
      choices: parsed.choices && typeof parsed.choices === "object" ? parsed.choices : {},
      reflections: parsed.reflections && typeof parsed.reflections === "object" ? parsed.reflections : {},
      visited: Array.isArray(parsed.visited) ? parsed.visited.filter((item): item is string => typeof item === "string") : [],
    };
  } catch {
    return { choices: {}, reflections: {}, visited: [] };
  }
}

function isMeaningfulTitle(title: string | undefined, fallback: string) {
  return Boolean(title && title.trim().toLowerCase() !== fallback.toLowerCase());
}

function asText(value: AnswerValue | undefined) {
  return Array.isArray(value) ? value.join(", ") : value ?? "";
}

function asArray(value: AnswerValue | undefined) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function getInitialAnswers(attempt: LearningAttemptView | null) {
  if (!attempt) {
    return {};
  }

  return Object.entries(attempt.answers).reduce<Record<string, AnswerValue>>(
    (acc, [blockId, answer]) => {
      acc[blockId] = answer.value;
      return acc;
    },
    {},
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function getAttemptStatusLabel(attempt: LearningAttemptView) {
  if (attempt.manual_review_required) {
    return "Poging opgeslagen, review nodig";
  }

  if (attempt.passed === true) {
    return "Poging behaald";
  }

  if (attempt.passed === false) {
    return "Poging nog niet behaald";
  }

  return "Hervat vanaf je laatste poging";
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
