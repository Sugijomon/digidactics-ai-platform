"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LessonBlock } from "@digidactics/domain/learning";
import { LessonBlockRenderer } from "@/components/learning/LessonBlockRenderer";
import type { LearningCourseView, LearningPageView } from "@/lib/learning-preview-data";

type AnswerValue = string | string[];

export function LearningPageInteraction({
  action,
  course,
  isAuthenticated,
  isCompleted,
  nextPageCode,
  page,
  previousPageCode,
  topicPageIndex,
  topicPageTotal,
}: {
  action: (formData: FormData) => void | Promise<void>;
  course: LearningCourseView;
  isAuthenticated: boolean;
  isCompleted: boolean;
  nextPageCode: string;
  page: LearningPageView;
  previousPageCode: string;
  topicPageIndex: number;
  topicPageTotal: number;
}) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const interactiveBlocks = useMemo(
    () => page.content.blocks.filter(isInteractiveBlock),
    [page.content.blocks],
  );
  const completedInteractiveCount = interactiveBlocks.filter((block) =>
    isBlockSatisfied(block, answers[block.id]),
  ).length;
  const canComplete =
    isCompleted ||
    interactiveBlocks.length === 0 ||
    completedInteractiveCount === interactiveBlocks.length;

  function updateAnswer(blockId: string, value: AnswerValue) {
    setAnswers((current) => ({ ...current, [blockId]: value }));
  }

  return (
    <form action={action} className="lesson-player-form">
      <input name="courseId" type="hidden" value={course.id} />
      <input name="courseCode" type="hidden" value={course.course_code} />
      <input name="pageId" type="hidden" value={page.id} />
      <input name="pageCode" type="hidden" value={page.page_code} />
      <input name="nextPageCode" type="hidden" value={nextPageCode} />

      <article className="lesson-shell page-canvas">
        {page.content.blocks.map((block) =>
          isInteractiveBlock(block) ? (
            <InteractiveBlock
              answer={answers[block.id]}
              block={block}
              key={block.id}
              onAnswer={(value) => updateAnswer(block.id, value)}
            />
          ) : (
            <LessonBlockRenderer block={block} key={block.id} />
          ),
        )}
      </article>

      <nav className="lesson-completion-bar" aria-label="Pagina voortgang">
        {previousPageCode ? (
          <Link
            className="button button-secondary"
            href={`/learning/${course.course_code}/${previousPageCode}`}
          >
            Vorige
          </Link>
        ) : (
          <span />
        )}
        <span className="lesson-position">
          Pagina {topicPageIndex + 1} van {topicPageTotal}
          {interactiveBlocks.length > 0 ? (
            <small>
              {completedInteractiveCount}/{interactiveBlocks.length} interacties ingevuld
            </small>
          ) : null}
        </span>
        {isCompleted && nextPageCode ? (
          <Link
            className="button button-primary"
            href={`/learning/${course.course_code}/${nextPageCode}`}
          >
            Volgende
          </Link>
        ) : isCompleted ? (
          <Link className="button button-primary" href="/learning">
            Terug naar cursus
          </Link>
        ) : isAuthenticated ? (
          <button
            className="button button-primary"
            disabled={!canComplete}
            title={canComplete ? undefined : "Beantwoord eerst de interacties op deze pagina."}
            type="submit"
          >
            {nextPageCode ? "Afronden" : "Cursus afronden"}
          </button>
        ) : (
          <span className="button button-secondary">Login vereist</span>
        )}
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
    case "case_lab":
      return (
        <section className="block practice-block interactive-block">
          <p className="eyebrow">Casus</p>
          <h2>{block.title}</h2>
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

    case "quiz_multiple_choice": {
      const selected = asText(answer);
      const isAnswered = Boolean(selected);
      const isCorrect = selected === block.correct_option_id;

      return (
        <section className="block practice-block interactive-block">
          <p className="eyebrow">Checkvraag</p>
          <h2>Checkvraag</h2>
          <p>{block.question}</p>
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
          <h2>Checkvraag</h2>
          <p>{block.question}</p>
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
          <h2>Waar of niet waar</h2>
          <p>{block.question}</p>
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
          <h2>Open vraag</h2>
          <p>{block.question}</p>
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
      {text ? <p>{text}</p> : null}
    </div>
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
    (block.type === "case_lab" && Boolean(block.reflection_prompt))
  );
}

function isBlockSatisfied(block: LessonBlock, answer: AnswerValue | undefined) {
  switch (block.type) {
    case "quiz_multiple_choice":
    case "quiz_true_false":
      return Boolean(asText(answer));
    case "quiz_multiple_select":
      return asArray(answer).length > 0;
    case "quiz_essay":
    case "short_answer":
      return countWords(asText(answer)) >= (block.min_words ?? 1);
    case "case_lab":
      return block.reflection_prompt ? countWords(asText(answer)) >= 20 : true;
    default:
      return true;
  }
}

function asText(value: AnswerValue | undefined) {
  return Array.isArray(value) ? value.join(", ") : value ?? "";
}

function asArray(value: AnswerValue | undefined) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
