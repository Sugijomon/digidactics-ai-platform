import type { ReactNode } from "react";
import type { LessonBlock } from "@digidactics/domain/learning";
import { AudioBlockPlayer } from "@/components/learning/AudioBlockPlayer";
import { DownloadBlockPlayer } from "@/components/learning/DownloadBlockPlayer";
import { LessonAccordionPlayer } from "@/components/learning/LessonAccordionPlayer";
import { SlideDeckPlayer } from "@/components/learning/SlideDeckPlayer";

export function LessonBlockRenderer({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case "hero":
      return (
        <section className={`block block-hero block-hero-${normalizeHeroColor((block as { background_color?: string }).background_color)}`}>
          <h1>{block.title}</h1>
          {block.subtitle ? <p>{block.subtitle}</p> : null}
        </section>
      );

    case "heading":
      return (
        <section className={`block lesson-heading-block lesson-heading-h${block.level ?? 2}`}>
          <Heading level={block.level ?? 2}>{block.text}</Heading>
        </section>
      );

    case "section_header":
    case "section_heading":
      return (
        <section className="block section-header-player">
          <div className="shp-player-inner">
            <div className="shp-player-line" />
            {block.title ? (
              <>
                <span className="shp-player-title">{block.title}</span>
                <div className="shp-player-line" />
              </>
            ) : null}
          </div>
          {block.subtitle ? <p className="shp-player-sub">{block.subtitle}</p> : null}
        </section>
      );

    case "paragraph": {
      const paragraphImageUrl = (block as { image_url?: string }).image_url;

      return (
        <section className="block">
          <div className="lesson-markdown">{renderMarkdown(block.markdown)}</div>
          {paragraphImageUrl ? (
            <figure className="lesson-image lesson-image-full paragraph-image">
              <img alt="" src={paragraphImageUrl} />
            </figure>
          ) : null}
        </section>
      );
    }

    case "callout":
      {
        const calloutBlock = block as typeof block & {
          content?: unknown;
          title?: unknown;
          tone?: "info" | "warning" | "success" | "tip";
        };
        const tone = calloutBlock.tone ?? "info";
        const visualTone = tone === "success" ? "tip" : tone;
        const icon = visualTone === "warning" ? "!" : visualTone === "tip" ? "✓" : "i";
        const title = calloutBlock.title ? String(calloutBlock.title) : "";
        const text = calloutBlock.content ? String(calloutBlock.content) : block.markdown;

        return (
          <section className={`block lesson-callout lesson-callout-${visualTone}`}>
            <span className="lesson-callout-icon">{icon}</span>
            <div className="lesson-callout-content">
              {title ? <strong>{title}</strong> : null}
              <p>{text}</p>
            </div>
          </section>
        );
      }

    case "quote":
      return (
        <section className="block quote-player">
          <div className="qp-accent" />
          <div className="qp-content">
            <div className="qp-text">"{block.quote}"</div>
            {block.author || block.source ? (
              <div className="qp-meta">
                {block.author ? <span className="qp-name">{block.author}</span> : null}
                {block.author && block.source ? <span className="qp-dot" /> : null}
                {block.source ? (
                  block.source_url ? (
                    <a className="qp-role qp-link" href={block.source_url} rel="noopener noreferrer" target="_blank">
                      {block.source}
                    </a>
                  ) : (
                    <span className="qp-role">{block.source}</span>
                  )
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="qp-bracket-right" />
        </section>
      );

    case "accordion":
      return <LessonAccordionPlayer block={block} />;

    case "image":
      return (
        <section className="block">
          <figure className={`lesson-image lesson-image-${block.width ?? "full"}`}>
            <img alt={block.alt} src={block.url} />
            {block.caption ? <figcaption>{block.caption}</figcaption> : null}
          </figure>
        </section>
      );

    case "timeline":
      return (
        <section className="block lesson-timeline-block">
          {block.title ? <h2>{block.title}</h2> : null}
          <div className="lesson-timeline">
            <div className="lesson-timeline-inner" style={{ minWidth: Math.max(block.items.length * 220, 620) }}>
              <div className="lesson-timeline-line" />
              <div className="lesson-timeline-events">
                {block.items.map((item, index) => {
                  const position = index % 2 === 1 ? "top" : "bottom";
                  const tone = `tone-${(index % 6) + 1}`;

                  return (
                    <article
                      className={`lesson-timeline-item ${position} ${tone}${item.highlight ? " highlighted" : ""}`}
                      key={item.id}
                    >
                      <div className="lesson-timeline-slot top-slot">
                        {position === "top" ? <TimelineEventContent item={item} showStem="after" /> : null}
                      </div>
                      <span className="lesson-timeline-dot" />
                      <div className="lesson-timeline-slot bottom-slot">
                        {position === "bottom" ? <TimelineEventContent item={item} showStem="before" /> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      );

    case "decision_matrix":
      return (
        <section className="block decision-matrix-block">
          {block.title ? <h2>{block.title}</h2> : null}
          <div className="decision-matrix-axis-label top">{block.y_axis_label}</div>
          <div className="decision-matrix-grid" role="list">
            {block.quadrants.map((quadrant) => (
              <details className={`decision-quadrant tone-${quadrant.tone}`} key={quadrant.id} role="listitem">
                <summary>
                  <span>{quadrant.subtitle}</span>
                  <strong>{quadrant.title}</strong>
                  <small>{quadrant.summary}</small>
                </summary>
                <div className="decision-quadrant-body">
                  <div className="decision-quadrant-columns">
                    <div>
                      <span>Aanpak</span>
                      <ul>
                        {quadrant.actions.map((action) => (
                          <li key={action}>{action}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span>Controleer</span>
                      <ul>
                        {quadrant.checks.map((check) => (
                          <li key={check}>{check}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <p className="decision-quadrant-rule">{quadrant.rule}</p>
                  <div className="decision-examples">
                    {quadrant.examples.map((example) => (
                      <article className="decision-example" key={example.id}>
                        <strong>{example.title}</strong>
                        <p>{example.description}</p>
                        <small>Waarde: {example.value}</small>
                        <small>Risico: {example.risk}</small>
                      </article>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
          <div className="decision-matrix-axis-label bottom">{block.x_axis_label}</div>
        </section>
      );

    case "comparison":
      return (
        <section className="block">
          {block.title ? <h2>{block.title}</h2> : null}
          <div className="lesson-comparison">
            <article>
              <h3>{block.left_label}</h3>
              <ul>
                {block.left_items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>{block.right_label}</h3>
              <ul>
                {block.right_items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      );

    case "scenario":
      return (
        <section className="block practice-block">
          <p className="eyebrow">Scenario</p>
          <p>{block.situation}</p>
          <h2>{block.question}</h2>
          <div className="quiz-options">
            {block.choices.map((choice) => (
              <details className={choice.is_recommended ? "scenario-choice recommended" : "scenario-choice"} key={choice.id}>
                <summary>{choice.label}</summary>
                <p>{choice.consequence}</p>
              </details>
            ))}
          </div>
        </section>
      );

    case "reflection":
      return (
        <section className="block practice-block">
          <p className="eyebrow">Reflectie</p>
          <h2>Reflectie</h2>
          <p>{block.prompt}</p>
          <div className="reflection-panel">
            <textarea
              aria-label="Reflectieantwoord"
              name={`answer:${block.id}`}
              placeholder={block.placeholder ?? "Schrijf hier je reflectie..."}
              rows={4}
            />
            {block.min_words ? <small>Minimaal {block.min_words} woorden</small> : null}
          </div>
        </section>
      );

    case "progress_check":
      return (
        <section className="block practice-block">
          <p className="eyebrow">Zelfbeoordeling</p>
          <h2>{block.question}</h2>
          <div className="progress-check-learner">
            <div className="star-row" aria-label="Zelfbeoordeling">
              {Array.from({ length: block.scale }).map((_, index) => (
                <label className="star-choice" key={index}>
                  <input name={`answer:${block.id}`} type="radio" value={index + 1} />
                  <span>*</span>
                </label>
              ))}
            </div>
            {block.show_labels ? (
              <div className="star-labels">
                <span>{block.label_low}</span>
                <span>{block.label_high}</span>
              </div>
            ) : null}
          </div>
        </section>
      );

    case "key_takeaways":
      return (
        <section className="block takeaway-block">
          <h2>{block.title || "Kernpunten"}</h2>
          <div className="takeaway-list" role="list">
            {block.items.map((item, index) => (
              <article className="takeaway-card" key={item} role="listitem">
                <span className="takeaway-badge" aria-hidden="true">Punt {index + 1}</span>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </section>
      );

    case "knowledge_cards":
      return (
        <section className="block knowledge-cards-block">
          <div className="knowledge-card-layout">
            {block.cards.map((card) => (
              <article className="knowledge-card" key={card.id}>
                <div className="knowledge-card-title">{card.title}</div>
                <p className="knowledge-card-text">{card.text}</p>
              </article>
            ))}
          </div>
        </section>
      );

    case "checklist":
      {
        const checklistBlock = block as typeof block & {
          title?: unknown;
          require_all?: unknown;
          items: unknown;
        };
        const rawItems = Array.isArray(checklistBlock.items) ? checklistBlock.items : [];
        const items = rawItems
          .map((item: unknown, index) =>
            typeof item === "string"
              ? { id: `item-${index}`, label: item, required: true }
              : {
                  id: (item as { id?: string }).id ?? `item-${index}`,
                  label: (item as { label?: string }).label ?? "",
                  required: (item as { required?: boolean }).required ?? true,
                },
          )
          .filter((item) => item.label.trim());
        const requireAll = checklistBlock.require_all ?? true;
        const title = checklistBlock.title ? String(checklistBlock.title) : "";

        return (
          <section className="block checklist-preview checklist-learner">
            {title ? <div className="checklist-preview-title">{title}</div> : null}
            <div className="checklist-preview-items">
              {items.map((item) => (
                <div className="checklist-preview-row" key={item.id}>
                  <span className={`checklist-box ${item.required ? "required" : ""}`} />
                  <span>{item.label}</span>
                  {item.required ? <span className="required-tag">verplicht</span> : null}
                </div>
              ))}
            </div>
            {requireAll && items.length ? (
              <p className="checklist-preview-notice">
                ✓ Alle punten moeten afgevinkt zijn om verder te gaan.
              </p>
            ) : null}
          </section>
        );
      }

    case "case_lab":
      return (
        <section className="block practice-block">
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
          <CheckQuestionIcon />
          <p className="quiz-question">{block.question}</p>
          <div className="quiz-options">
            {block.options.map((option) => (
              <label className="quiz-option" key={option.id}>
                <input name={`answer:${block.id}`} type="radio" value={option.id} />
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
          <CheckQuestionIcon />
          <p className="quiz-question">{block.question}</p>
          <div className="quiz-options">
            {block.options.map((option) => (
              <label className="quiz-option" key={option.id}>
                <input name={`answer:${block.id}`} type="checkbox" value={option.id} />
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
          <CheckQuestionIcon />
          <p className="true-false-question">{block.question}</p>
          <div className="quiz-options two-options">
            <label className="quiz-option">
              <input name={`answer:${block.id}`} type="radio" value="true" />
              <span>Waar</span>
            </label>
            <label className="quiz-option">
              <input name={`answer:${block.id}`} type="radio" value="false" />
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
              name={`answer:${block.id}`}
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
          <p className="open-question">{block.question}</p>
          <div className="answer-box">
            <textarea
              aria-label="Open antwoord"
              name={`answer:${block.id}`}
              placeholder={block.placeholder ?? "Schrijf je antwoord."}
              rows={4}
            />
          </div>
          {block.guidance ? <p>{block.guidance}</p> : null}
        </section>
      );

    case "video":
      {
        const embedUrl = toVideoEmbedUrl(block.url);

        return (
          <section className="block lesson-video-block">
            {embedUrl ? (
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="lesson-video-frame"
                loading="lazy"
                src={embedUrl}
                title={block.title ?? "Video"}
              />
            ) : (
              <div className="media-frame">
                <span>Video</span>
                <small>{block.url}</small>
              </div>
            )}
            {block.transcript_markdown ? (
              <div className="lesson-markdown">{renderMarkdown(block.transcript_markdown)}</div>
            ) : null}
          </section>
        );
      }

    case "iframe":
      return (
        <section className="block">
          <h2>{block.title}</h2>
          <iframe
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
            className="embed-frame"
            height={block.height ?? 360}
            loading="lazy"
            allowFullScreen={block.allow_fullscreen ?? true}
            sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
            src={block.url}
            title={block.title}
          />
          {block.caption ? <p>{block.caption}</p> : null}
        </section>
      );

    case "embed_h5p":
      return (
        <section className="block">
          <h2>{block.title}</h2>
          <iframe
            className="embed-frame"
            height={block.height ?? 400}
            loading="lazy"
            src={block.url}
            title={block.title}
          />
        </section>
      );

    case "download":
      return <DownloadBlockPlayer block={block} />;

    case "audio":
      return <AudioBlockPlayer block={block} />;

    case "slide_deck":
      return <SlideDeckPlayer block={block} />;

    default:
      return null;
  }
}

function Heading({ children, level }: { children: ReactNode; level: 1 | 2 | 3 | 4 | 5 | 6 }) {
  switch (level) {
    case 1:
      return <h1>{children}</h1>;
    case 2:
      return <h2>{children}</h2>;
    case 3:
      return <h3>{children}</h3>;
    case 4:
      return <h4>{children}</h4>;
    case 5:
      return <h5>{children}</h5>;
    case 6:
      return <h6>{children}</h6>;
    default:
      return <h2>{children}</h2>;
  }
}

function normalizeHeroColor(value?: string) {
  if (value === "primary" || value === "dark" || value === "bright" || value === "soft" || value === "muted") {
    return value;
  }

  if (value === "green" || value === "blue") return "primary";
  if (value === "purple" || value === "amber") return "bright";
  return "dark";
}

function toVideoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (parsed.pathname.startsWith("/embed/")) return url;
    }

    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : "";
    }

    if (host === "player.vimeo.com" || parsed.pathname.endsWith(".mp4")) {
      return url;
    }
  } catch {
    return "";
  }

  return "";
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

function TimelineEventContent({
  item,
  showStem,
}: {
  item: { date: string; title: string; description?: string };
  showStem: "before" | "after";
}) {
  const hasDescription = Boolean(item.description);

  return (
    <>
      {showStem === "before" ? <span className="lesson-timeline-stem" /> : null}
      <div
        className={`lesson-timeline-content ${showStem === "after" ? "is-top" : "is-bottom"}`}
        tabIndex={hasDescription ? 0 : undefined}
      >
        <span className="lesson-timeline-date">{item.date}</span>
        <strong className="lesson-timeline-title">{item.title}</strong>
        {item.description ? (
          <span className="lesson-timeline-tooltip" role="tooltip">
            {item.description}
          </span>
        ) : null}
      </div>
      {showStem === "after" ? <span className="lesson-timeline-stem" /> : null}
    </>
  );
}

function renderMarkdown(value: string) {
  const sizePattern = /\[\[size:(8|10|12|14|16|18|20|22)\]\]([\s\S]*?)\[\[\/size\]\]/g;
  const segments: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = sizePattern.exec(value))) {
    if (match.index > lastIndex) {
      segments.push(...(renderMarkdownBlocks(value.slice(lastIndex, match.index), `plain-${match.index}`) ?? []));
    }

    segments.push(
      <div className={`text-size-${match[1]}`} key={`size-${match.index}`}>
        {renderMarkdown(match[2])}
      </div>,
    );
    lastIndex = sizePattern.lastIndex;
  }

  if (lastIndex > 0) {
    if (lastIndex < value.length) {
      segments.push(...(renderMarkdownBlocks(value.slice(lastIndex), "plain-tail") ?? []));
    }

    return segments.length ? segments : null;
  }

  return renderMarkdownBlocks(value, "block");
}

function renderMarkdownBlocks(value: string, keyPrefix: string) {
  const blocks = value
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) {
    return null;
  }

  return blocks.map((block, index) => {
    if (block.startsWith("### ")) {
      return <h3 key={`${keyPrefix}-${index}`}>{renderInlineMarkdown(block.slice(4))}</h3>;
    }

    if (block.startsWith("## ")) {
      return <h2 key={`${keyPrefix}-${index}`}>{renderInlineMarkdown(block.slice(3))}</h2>;
    }

    if (block.startsWith("# ")) {
      return <h2 key={`${keyPrefix}-${index}`}>{renderInlineMarkdown(block.slice(2))}</h2>;
    }

    if (/^[-*]\s+/m.test(block)) {
      return (
        <ul key={`${keyPrefix}-${index}`}>
          {block
            .split("\n")
            .map((line) => line.replace(/^[-*]\s+/, "").trim())
            .filter(Boolean)
            .map((item, itemIndex) => (
              <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
            ))}
        </ul>
      );
    }

    if (/^\d+\.\s+/m.test(block)) {
      return (
        <ol key={`${keyPrefix}-${index}`}>
          {block
            .split("\n")
            .map((line) => line.replace(/^\d+\.\s+/, "").trim())
            .filter(Boolean)
            .map((item, itemIndex) => (
              <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
            ))}
        </ol>
      );
    }

    return <p key={`${keyPrefix}-${index}`}>{renderInlineMarkdown(block)}</p>;
  });
}

function isMeaningfulTitle(title: string | undefined, fallback: string) {
  return Boolean(title && title.trim().toLowerCase() !== fallback.toLowerCase());
}

function renderInlineMarkdown(value: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /\[\[size:(8|10|12|14|16|18|20|22)\]\]([\s\S]*?)\[\[\/size\]\]|<span class="text-size-(small|large|xlarge|8|10|12|14|16|18|20|22)">([\s\S]*?)<\/span>|<u>([\s\S]*?)<\/u>|!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|_([^_]+)_|`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      nodes.push(
        <span className={`text-size-${match[1]}`} key={match.index}>
          {renderInlineMarkdown(match[2])}
        </span>,
      );
    } else if (match[3] && match[4]) {
      nodes.push(
        <span className={`text-size-${normalizeTextSize(match[3])}`} key={match.index}>
          {renderInlineMarkdown(match[4])}
        </span>,
      );
    } else if (match[5]) {
      nodes.push(<u key={match.index}>{renderInlineMarkdown(match[5])}</u>);
    } else if (match[7]) {
      nodes.push(
        <img alt={match[6] ?? ""} className="inline-markdown-image" key={match.index} src={match[7]} />,
      );
    } else if (match[9]) {
      nodes.push(
        <a href={match[9]} key={match.index} rel="noopener" target="_blank">
          {match[8]}
        </a>,
      );
    } else if (match[10]) {
      nodes.push(<strong key={match.index}>{match[10]}</strong>);
    } else if (match[11]) {
      nodes.push(<em key={match.index}>{match[11]}</em>);
    } else if (match[12]) {
      nodes.push(<code key={match.index}>{match[12]}</code>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }

  return nodes;
}

function normalizeTextSize(value: string) {
  if (value === "small") return "10";
  if (value === "large") return "14";
  if (value === "xlarge") return "16";
  return value;
}
