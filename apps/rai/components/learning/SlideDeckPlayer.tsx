"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type { SlideDeckBlock, SlideDeckSlideInteraction } from "@digidactics/domain/learning";

type SlideDeckAnswer = {
  choices: Record<string, string>;
  reflections: Record<string, string>;
  visited: string[];
};

export function SlideDeckPlayer({
  answerName,
  block,
  initialAnswer,
  onAnswer,
}: {
  answerName?: string;
  block: SlideDeckBlock;
  initialAnswer?: string;
  onAnswer?: (value: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [answer, setAnswer] = useState<SlideDeckAnswer>(() => parseSlideDeckAnswer(initialAnswer));
  const slides = useMemo(() => (block.slides ?? []).filter((slide) => slide?.url), [block.slides]);
  const activeSlide = slides[activeIndex];
  const answerValue = JSON.stringify(answer);
  const completedSlides = slides.filter((slide) => isSlideSatisfied(slide.interaction, answer, slide.id)).length;
  const isComplete = slides.length > 0 && completedSlides === slides.length;

  useEffect(() => {
    if (activeIndex >= slides.length && slides.length > 0) {
      setActiveIndex(slides.length - 1);
    }
  }, [activeIndex, slides.length]);

  useEffect(() => {
    if (!activeSlide || answer.visited.includes(activeSlide.id)) return;

    updateAnswer((current) => ({
      ...current,
      visited: [...current.visited, activeSlide.id],
    }));
  }, [activeSlide?.id]);

  useEffect(() => {
    onAnswer?.(answerValue);
  }, [answerValue]);

  if (!slides.length) {
    return (
      <section className="block slide-deck-block">
        {block.title ? <h2>{block.title}</h2> : null}
        <div className="slide-deck-empty">Nog geen slides toegevoegd.</div>
      </section>
    );
  }

  function goTo(index: number) {
    setActiveIndex(Math.max(0, Math.min(slides.length - 1, index)));
  }

  function updateAnswer(updater: (current: SlideDeckAnswer) => SlideDeckAnswer) {
    setAnswer((current) => {
      const next = updater(current);
      return {
        choices: next.choices ?? {},
        reflections: next.reflections ?? {},
        visited: Array.from(new Set(next.visited ?? [])),
      };
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(activeIndex - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(activeIndex + 1);
    }
  }

  return (
    <section className="block slide-deck-block" onKeyDown={handleKeyDown} tabIndex={0}>
      {answerName ? <input name={answerName} type="hidden" value={answerValue} /> : null}
      <div className="slide-deck-card">
        <header className="slide-deck-heading">
          <div>
            {block.title ? <h2>{block.title}</h2> : <h2>Presentatie</h2>}
            {activeSlide.title ? <p>{activeSlide.title}</p> : null}
          </div>
          <span>
            {activeIndex + 1}/{slides.length}
          </span>
        </header>

        <figure className="slide-deck-stage">
          <img alt={activeSlide.alt || `Slide ${activeIndex + 1}`} src={activeSlide.url} />
          {slides.length > 1 ? (
            <>
              <button
                aria-label="Vorige slide"
                className="slide-deck-stage-nav previous"
                disabled={activeIndex === 0}
                onClick={() => goTo(activeIndex - 1)}
                type="button"
              >
                <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
                  <path
                    d="m12 5-5 5 5 5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </button>
              <button
                aria-label="Volgende slide"
                className="slide-deck-stage-nav next"
                disabled={activeIndex === slides.length - 1}
                onClick={() => goTo(activeIndex + 1)}
                type="button"
              >
                <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
                  <path
                    d="m8 5 5 5-5 5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </button>
            </>
          ) : null}
          {activeSlide.caption ? <figcaption>{activeSlide.caption}</figcaption> : null}
        </figure>

        {activeSlide.notes ? (
          <div className="slide-deck-notes">
            {activeSlide.notes
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, index) => (
                <p key={`${activeSlide.id}-note-${index}`}>{line}</p>
              ))}
          </div>
        ) : null}

        <SlideInteraction
          interaction={activeSlide.interaction}
          reflection={answer.reflections[activeSlide.id] ?? ""}
          selectedOptionId={answer.choices[activeSlide.id]}
          setReflection={(value) =>
            updateAnswer((current) => ({
              ...current,
              reflections: { ...current.reflections, [activeSlide.id]: value },
            }))
          }
          setSelectedOption={(optionId) =>
            updateAnswer((current) => ({
              ...current,
              choices: { ...current.choices, [activeSlide.id]: optionId },
            }))
          }
          slideId={activeSlide.id}
        />

        <div className="slide-deck-controls">
          <div className="slide-deck-status" aria-live="polite">
            {isComplete
              ? "Presentatie afgerond"
              : `${completedSlides} van ${slides.length} slides afgerond`}
          </div>
          <div className="slide-deck-progress" aria-hidden="true">
            <span style={{ width: `${(completedSlides / slides.length) * 100}%` }} />
          </div>
          {block.show_thumbnails !== false && slides.length > 1 ? (
            <div className="slide-deck-player-thumbs" aria-label="Slides">
              {slides.map((slide, index) => (
                <button
                  aria-current={index === activeIndex}
                  aria-label={`Ga naar slide ${index + 1}`}
                  key={slide.id}
                  onClick={() => goTo(index)}
                  type="button"
                >
                  <img alt={slide.alt || `Slide ${index + 1}`} src={slide.url} />
                  <span>{index + 1}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SlideInteraction({
  interaction,
  reflection,
  selectedOptionId,
  setReflection,
  setSelectedOption,
  slideId,
}: {
  interaction?: SlideDeckSlideInteraction;
  reflection: string;
  selectedOptionId?: string;
  setReflection: (value: string) => void;
  setSelectedOption: (optionId: string) => void;
  slideId: string;
}) {
  if (!interaction || interaction.type === "none") return null;

  if (interaction.type === "reflection") {
    const fieldId = `slide-deck-reflection-${slideId}`;

    return (
      <div className="slide-deck-interaction">
        <label htmlFor={fieldId}>{interaction.prompt || "Wat neem je mee uit deze slide?"}</label>
        <textarea
          id={fieldId}
          onChange={(event) => setReflection(event.target.value)}
          placeholder={interaction.placeholder || "Schrijf je reflectie..."}
          rows={3}
          value={reflection}
        />
      </div>
    );
  }

  const options = normalizeMultipleChoiceOptions(interaction.options);
  const selectedNormalizedOption = options.find((option) => option.id === selectedOptionId);

  return (
    <div className="slide-deck-interaction">
      <p>{interaction.question || "Welke optie past het best bij deze slide?"}</p>
      <div className="slide-deck-choice-list">
        {options.map((option) => (
          <button
            aria-pressed={selectedOptionId === option.id}
            key={option.id}
            onClick={() => setSelectedOption(option.id)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      {selectedNormalizedOption ? (
        <div className={selectedNormalizedOption.is_correct ? "slide-deck-feedback correct" : "slide-deck-feedback incorrect"}>
          {selectedNormalizedOption.is_correct
            ? interaction.feedback_correct || "Goed gezien."
            : interaction.feedback_incorrect || "Bekijk de slide nog eens en probeer opnieuw."}
        </div>
      ) : null}
    </div>
  );
}

function parseSlideDeckAnswer(value?: string): SlideDeckAnswer {
  if (!value) {
    return { choices: {}, reflections: {}, visited: [] };
  }

  try {
    const parsed = JSON.parse(value) as Partial<SlideDeckAnswer>;
    return {
      choices: isRecord(parsed.choices) ? parsed.choices : {},
      reflections: isRecord(parsed.reflections) ? parsed.reflections : {},
      visited: Array.isArray(parsed.visited) ? parsed.visited.filter((item): item is string => typeof item === "string") : [],
    };
  } catch {
    return { choices: {}, reflections: {}, visited: [] };
  }
}

function isSlideSatisfied(
  interaction: SlideDeckSlideInteraction | undefined,
  answer: SlideDeckAnswer,
  slideId: string,
) {
  if (!interaction || interaction.type === "none") {
    return answer.visited.includes(slideId);
  }

  if (interaction.type === "reflection") {
    return answer.reflections[slideId]?.trim().length > 0;
  }

  return Boolean(answer.choices[slideId]);
}

function normalizeMultipleChoiceOptions(
  options: Array<{ id: string; label: string; is_correct: boolean }>,
) {
  const fallback = [
    { id: "option-a", label: "Optie A", is_correct: true },
    { id: "option-b", label: "Optie B", is_correct: false },
  ];
  const cleanOptions = options
    .map((option, index) => ({
      ...option,
      label: option.label?.trim() || `Optie ${index + 1}`,
    }))
    .filter((option) => option.label);

  return cleanOptions.length >= 2 ? cleanOptions : fallback;
}

function isRecord(value: unknown): value is Record<string, string> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
