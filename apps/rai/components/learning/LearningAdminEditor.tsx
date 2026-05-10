"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LessonBlock, LessonContent } from "@digidactics/domain/learning";
import type {
  LearningCourseView,
  LearningTopicView,
} from "@/lib/learning-preview-data";

type EditableBlock = LessonBlock & { id: string; type: string };
type PageDraft = { title: string; summary: string; content: LessonContent };

const blockTypes = [
  { type: "paragraph", label: "Tekst" },
  { type: "callout", label: "Callout" },
  { type: "checklist", label: "Checklist" },
  { type: "quiz_multiple_choice", label: "Multiple choice" },
] as const;

export function LearningAdminEditor({
  course,
  createAction,
  updateAction,
}: {
  course: LearningCourseView;
  createAction: (formData: FormData) => void | Promise<void>;
  updateAction: (formData: FormData) => void | Promise<void>;
}) {
  const pages = useMemo(() => course.topics.flatMap((topic) => topic.pages), [course]);
  const [activePageId, setActivePageId] = useState(pages[0]?.id ?? "");
  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0];
  const [drafts, setDrafts] = useState<Record<string, PageDraft>>(() =>
    Object.fromEntries(
      pages.map((page) => [
        page.id,
        {
          title: page.title,
          summary: page.summary ?? "",
          content: page.content,
        },
      ]),
    ),
  );

  if (!activePage) {
    return <p className="empty-state">Geen pagina's gevonden.</p>;
  }

  const draft = drafts[activePage.id] ?? {
    title: activePage.title,
    summary: activePage.summary ?? "",
    content: activePage.content,
  };
  const blocks = draft.content.blocks as EditableBlock[];

  function updateDraft(pageId: string, patch: Partial<PageDraft>) {
    setDrafts((current) => ({
      ...current,
      [pageId]: {
        title: current[pageId]?.title ?? activePage.title,
        summary: current[pageId]?.summary ?? activePage.summary ?? "",
        content: current[pageId]?.content ?? activePage.content,
        ...patch,
      },
    }));
  }

  function updateBlocks(nextBlocks: EditableBlock[]) {
    updateDraft(activePage.id, {
      content: { ...draft.content, blocks: nextBlocks },
    });
  }

  function updateBlock(index: number, block: EditableBlock) {
    updateBlocks(blocks.map((item, itemIndex) => (itemIndex === index ? block : item)));
  }

  function addBlock(type: string) {
    updateBlocks([...blocks, createBlock(type)]);
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= blocks.length) {
      return;
    }

    const nextBlocks = [...blocks];
    const current = nextBlocks[index];
    nextBlocks[index] = nextBlocks[nextIndex];
    nextBlocks[nextIndex] = current;
    updateBlocks(nextBlocks);
  }

  function removeBlock(index: number) {
    updateBlocks(blocks.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <section className="editor-shell">
      <aside className="editor-nav" aria-label="Cursusstructuur">
        <div>
          <p className="eyebrow">Structuur</p>
          <h2>{course.title}</h2>
        </div>
        <div className="editor-topic-list">
          {course.topics.map((topic) => (
            <TopicNavigation
              activePageId={activePage.id}
              key={topic.id}
              onSelect={setActivePageId}
              topic={topic}
            />
          ))}
        </div>
      </aside>

      <form action={updateAction} className="editor-canvas">
        <input name="pageId" type="hidden" value={activePage.id} />
        <input name="courseCode" type="hidden" value={course.course_code} />
        <input name="pageCode" type="hidden" value={activePage.page_code} />
        <input name="content" type="hidden" value={JSON.stringify(draft.content)} />

        <div className="editor-toolbar">
          <div>
            <p className="eyebrow">Pagina</p>
            <h1>{draft.title}</h1>
          </div>
          <div className="actions">
            <Link
              className="button button-secondary"
              href={`/learning/${course.course_code}/${activePage.page_code}`}
            >
              Preview
            </Link>
            <button className="button button-primary" type="submit">
              Opslaan
            </button>
          </div>
        </div>

        <div className="editor-meta-grid">
          <label className="field">
            <span>Titel</span>
            <input
              name="title"
              onChange={(event) =>
                updateDraft(activePage.id, { title: event.target.value })
              }
              value={draft.title}
            />
          </label>
          <label className="field">
            <span>Samenvatting</span>
            <input
              name="summary"
              onChange={(event) =>
                updateDraft(activePage.id, { summary: event.target.value })
              }
              value={draft.summary}
            />
          </label>
        </div>

        <div className="editor-block-stack">
          {blocks.map((block, index) => (
            <BlockEditor
              block={block}
              index={index}
              key={block.id}
              onChange={(nextBlock) => updateBlock(index, nextBlock)}
              onMoveDown={() => moveBlock(index, 1)}
              onMoveUp={() => moveBlock(index, -1)}
              onRemove={() => removeBlock(index)}
            />
          ))}
        </div>
      </form>

      <aside className="editor-properties">
        <div className="cardless-panel">
          <p className="eyebrow">Blocks</p>
          <h2>Toevoegen</h2>
          <div className="block-picker">
            {blockTypes.map((blockType) => (
              <button
                className="button button-secondary"
                key={blockType.type}
                onClick={() => addBlock(blockType.type)}
                type="button"
              >
                {blockType.label}
              </button>
            ))}
          </div>
        </div>

        <div className="cardless-panel">
          <p className="eyebrow">Nieuwe pagina</p>
          <form action={createAction} className="form-stack compact-form">
            <input name="courseId" type="hidden" value={course.id} />
            <input name="courseCode" type="hidden" value={course.course_code} />
            <label className="field">
              <span>Topic</span>
              <select name="topicId">
                {course.topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Page code</span>
              <input name="pageCode" placeholder="aisa-nieuwe-pagina" />
            </label>
            <label className="field">
              <span>Titel</span>
              <input name="title" placeholder="Nieuwe learningpagina" />
            </label>
            <label className="field">
              <span>Samenvatting</span>
              <input name="summary" placeholder="Korte omschrijving" />
            </label>
            <label className="field">
              <span>Type</span>
              <select name="pageType" defaultValue="content">
                <option value="content">content</option>
                <option value="question">question</option>
                <option value="case">case</option>
                <option value="video">video</option>
                <option value="embed">embed</option>
                <option value="assessment">assessment</option>
              </select>
            </label>
            <div className="editor-two-column">
              <label className="field">
                <span>Volgorde</span>
                <input name="sequenceOrder" type="number" min="1" defaultValue="1" />
              </label>
              <label className="field">
                <span>Minuten</span>
                <input name="estimatedMinutes" type="number" min="1" defaultValue="5" />
              </label>
            </div>
            <button className="button button-primary" type="submit">
              Pagina maken
            </button>
          </form>
        </div>

        <details className="json-inspector">
          <summary>JSON inspectie</summary>
          <pre>{JSON.stringify(draft.content, null, 2)}</pre>
        </details>
      </aside>
    </section>
  );
}

function TopicNavigation({
  activePageId,
  onSelect,
  topic,
}: {
  activePageId: string;
  onSelect: (pageId: string) => void;
  topic: LearningTopicView;
}) {
  return (
    <section className="editor-topic">
      <h3>{topic.title}</h3>
      <div className="editor-page-list">
        {topic.pages.map((page) => (
          <button
            aria-current={activePageId === page.id ? "page" : undefined}
            className="editor-page-button"
            key={page.id}
            onClick={() => onSelect(page.id)}
            type="button"
          >
            <span>{page.title}</span>
            <small>{page.content.blocks.length} blocks</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function BlockEditor({
  block,
  index,
  onChange,
  onMoveDown,
  onMoveUp,
  onRemove,
}: {
  block: EditableBlock;
  index: number;
  onChange: (block: EditableBlock) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
}) {
  return (
    <section className="editor-block">
      <div className="editor-block-header">
        <div>
          <span className="pill">{block.type}</span>
          <h2>Block {index + 1}</h2>
        </div>
        <div className="icon-actions">
          <button type="button" onClick={onMoveUp} aria-label="Block omhoog">
            ↑
          </button>
          <button type="button" onClick={onMoveDown} aria-label="Block omlaag">
            ↓
          </button>
          <button type="button" onClick={onRemove} aria-label="Block verwijderen">
            ×
          </button>
        </div>
      </div>
      <BlockFields block={block} onChange={onChange} />
    </section>
  );
}

function BlockFields({
  block,
  onChange,
}: {
  block: EditableBlock;
  onChange: (block: EditableBlock) => void;
}) {
  switch (block.type) {
    case "hero":
      return (
        <div className="form-stack">
          <TextField
            label="Titel"
            value={readString(block.title)}
            onChange={(title) => onChange({ ...block, title })}
          />
          <TextField
            label="Subtitle"
            value={readString(block.subtitle)}
            onChange={(subtitle) => onChange({ ...block, subtitle })}
          />
        </div>
      );
    case "paragraph":
      return (
        <TextareaField
          label="Tekst"
          value={readString(block.markdown)}
          onChange={(markdown) => onChange({ ...block, markdown })}
        />
      );
    case "callout":
      return (
        <div className="form-stack">
          <label className="field">
            <span>Tone</span>
            <select
              value={readString(block.tone) || "info"}
              onChange={(event) =>
                onChange({
                  ...block,
                  tone: event.target.value as "info" | "warning" | "success",
                })
              }
            >
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="success">success</option>
            </select>
          </label>
          <TextareaField
            label="Tekst"
            value={readString(block.markdown)}
            onChange={(markdown) => onChange({ ...block, markdown })}
          />
        </div>
      );
    case "checklist":
    case "key_takeaways":
      return (
        <TextareaField
          label="Items, één per regel"
          value={Array.isArray(block.items) ? block.items.join("\n") : ""}
          onChange={(value) =>
            onChange({
              ...block,
              items: value
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
        />
      );
    case "quiz_multiple_choice":
      return (
        <div className="form-stack">
          <TextareaField
            label="Vraag"
            value={readString(block.question)}
            onChange={(question) => onChange({ ...block, question })}
          />
          <TextareaField
            label="Opties, één per regel"
            value={
              Array.isArray(block.options)
                ? block.options.map((option) => option.label).join("\n")
                : ""
            }
            onChange={(value) =>
              onChange({
                ...block,
                options: value
                  .split("\n")
                  .map((label, optionIndex) => ({
                    id: String.fromCharCode(97 + optionIndex),
                    label: label.trim(),
                  }))
                  .filter((option) => option.label),
              })
            }
          />
          <TextField
            label="Correct option id"
            value={readString(block.correct_option_id)}
            onChange={(correct_option_id) =>
              onChange({ ...block, correct_option_id })
            }
          />
          <TextareaField
            label="Uitleg"
            value={readString(block.explanation)}
            onChange={(explanation) => onChange({ ...block, explanation })}
          />
        </div>
      );
    default:
      return (
        <TextareaField
          label="Raw JSON voor dit block"
          value={JSON.stringify(block, null, 2)}
          onChange={(value) => {
            try {
              onChange(JSON.parse(value) as EditableBlock);
            } catch {
              onChange(block);
            }
          }}
        />
      );
  }
}

function TextField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function TextareaField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        value={value}
      />
    </label>
  );
}

function createBlock(type: string): EditableBlock {
  const id = `block-${Date.now()}`;

  switch (type) {
    case "callout":
      return { id, type, tone: "info", markdown: "Nieuwe callout." } as EditableBlock;
    case "checklist":
      return { id, type, items: ["Eerste controlepunt"] } as EditableBlock;
    case "quiz_multiple_choice":
      return {
        id,
        type,
        question: "Nieuwe vraag?",
        options: [
          { id: "a", label: "Optie A" },
          { id: "b", label: "Optie B" },
        ],
        correct_option_id: "a",
      } as EditableBlock;
    case "paragraph":
    default:
      return { id, type: "paragraph", markdown: "Nieuwe tekst." } as EditableBlock;
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}
