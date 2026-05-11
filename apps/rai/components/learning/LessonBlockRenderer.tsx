import type { LessonBlock } from "@digidactics/domain/learning";

export function LessonBlockRenderer({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case "hero":
      return (
        <section className="block block-hero">
          <h1>{block.title}</h1>
          {block.subtitle ? <p>{block.subtitle}</p> : null}
        </section>
      );

    case "paragraph":
      return (
        <section className="block">
          <p>{block.markdown}</p>
        </section>
      );

    case "callout":
      return (
        <section className={`block callout-${block.tone}`}>
          <p>{block.markdown}</p>
        </section>
      );

    case "key_takeaways":
      return (
        <section className="block">
          <h2>Kernpunten</h2>
          <ul className="takeaway-list">
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      );

    case "checklist":
      return (
        <section className="block">
          <h2>Controlepunten</h2>
          <ul className="checklist">
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      );

    case "case_lab":
      return (
        <section className="block practice-block">
          <p className="eyebrow">Casus</p>
          <h2>{block.title}</h2>
          <p>{block.markdown}</p>
          {block.reflection_prompt ? (
            <div className="reflection-panel">
              <strong>Reflectie</strong>
              <p>{block.reflection_prompt}</p>
              <textarea
                aria-label="Reflectieantwoord"
                placeholder="Noteer kort je afweging. Opslaan volgt in een latere sprint."
                rows={4}
              />
            </div>
          ) : null}
        </section>
      );

    case "quiz_multiple_choice":
      return (
        <section className="block practice-block">
          <p className="eyebrow">Checkvraag</p>
          <h2>Checkvraag</h2>
          <p>{block.question}</p>
          <div className="quiz-options">
            {block.options.map((option) => (
              <label className="quiz-option" key={option.id}>
                <input name={block.id} type="radio" value={option.id} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <Explanation text={block.explanation} />
        </section>
      );

    case "quiz_multiple_select":
      return (
        <section className="block practice-block">
          <p className="eyebrow">Checkvraag</p>
          <h2>Checkvraag</h2>
          <p>{block.question}</p>
          <div className="quiz-options">
            {block.options.map((option) => (
              <label className="quiz-option" key={option.id}>
                <input name={`${block.id}-${option.id}`} type="checkbox" value={option.id} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <Explanation text={block.explanation} />
        </section>
      );

    case "quiz_true_false":
      return (
        <section className="block practice-block">
          <p className="eyebrow">Waar of niet waar</p>
          <h2>Waar of niet waar</h2>
          <p>{block.question}</p>
          <div className="quiz-options two-options">
            <label className="quiz-option">
              <input name={block.id} type="radio" value="true" />
              <span>Waar</span>
            </label>
            <label className="quiz-option">
              <input name={block.id} type="radio" value="false" />
              <span>Niet waar</span>
            </label>
          </div>
          <Explanation text={block.explanation} />
        </section>
      );

    case "quiz_essay":
      return (
        <section className="block practice-block">
          <p className="eyebrow">Reflectievraag</p>
          <h2>Reflectievraag</h2>
          <p>{block.question}</p>
          <div className="answer-box">
            <span>
              {block.min_words ?? 0}-{block.max_words ?? "open"} woorden
            </span>
            <textarea
              aria-label="Reflectieantwoord"
              placeholder="Schrijf hier je reflectie. Opslaan volgt in een latere sprint."
              rows={6}
            />
          </div>
        </section>
      );

    case "short_answer":
      return (
        <section className="block practice-block">
          <p className="eyebrow">Open vraag</p>
          <h2>Open vraag</h2>
          <p>{block.question}</p>
          <div className="answer-box">
            <textarea
              aria-label="Open antwoord"
              placeholder={block.placeholder ?? "Schrijf je antwoord."}
              rows={4}
            />
          </div>
          {block.guidance ? <p>{block.guidance}</p> : null}
        </section>
      );

    case "video":
      return (
        <section className="block">
          <h2>{block.title ?? "Video"}</h2>
          <div className="media-frame">
            <span>Video placeholder</span>
            <small>{block.url}</small>
          </div>
          {block.transcript_markdown ? <p>{block.transcript_markdown}</p> : null}
        </section>
      );

    case "iframe":
      return (
        <section className="block">
          <h2>{block.title}</h2>
          <iframe
            className="embed-frame"
            height={block.height ?? 360}
            loading="lazy"
            sandbox=""
            src={block.url}
            title={block.title}
          />
          {block.caption ? <p>{block.caption}</p> : null}
        </section>
      );

    case "download":
      return (
        <section className="block">
          <h2>{block.title}</h2>
          {block.description ? <p>{block.description}</p> : null}
        </section>
      );

    default:
      return null;
  }
}

function Explanation({ text }: { text?: string }) {
  if (!text) return null;

  return (
    <details className="answer-explanation">
      <summary>Toon toelichting</summary>
      <p>{text}</p>
    </details>
  );
}
