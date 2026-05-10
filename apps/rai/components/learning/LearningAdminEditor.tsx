"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LessonContent } from "@digidactics/domain/learning";
import type {
  LearningCourseView,
  LearningTopicView,
} from "@/lib/learning-preview-data";

type EditableBlock = Record<string, any> & { id: string; type: string };
type PageDraft = {
  title: string;
  summary: string;
  pageType: string;
  estimatedMinutes: number;
  isRequired: boolean;
  content: LessonContent;
};

const blockTypes = [
  ["hero", "Hero"],
  ["paragraph", "Tekst"],
  ["callout", "Callout"],
  ["key_takeaways", "Kernpunten"],
  ["checklist", "Checklist"],
  ["case_lab", "Casus"],
  ["quiz_multiple_choice", "Multiple choice"],
  ["quiz_multiple_select", "Multiple select"],
  ["quiz_true_false", "Waar/niet waar"],
  ["quiz_essay", "Reflectievraag"],
  ["short_answer", "Open vraag"],
  ["video", "Video"],
  ["iframe", "Iframe"],
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
          pageType: page.page_type,
          estimatedMinutes: page.estimated_duration_minutes ?? 5,
          isRequired: page.is_required,
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
    pageType: activePage.page_type,
    estimatedMinutes: activePage.estimated_duration_minutes ?? 5,
    isRequired: activePage.is_required,
    content: activePage.content,
  };
  const blocks = draft.content.blocks as EditableBlock[];

  function updateDraft(patch: Partial<PageDraft>) {
    setDrafts((current) => ({
      ...current,
      [activePage.id]: { ...draft, ...patch },
    }));
  }

  function updateBlocks(nextBlocks: EditableBlock[]) {
    updateDraft({
      content: { ...draft.content, blocks: nextBlocks as LessonContent["blocks"] },
    });
  }

  function updateBlock(index: number, block: EditableBlock) {
    updateBlocks(blocks.map((item, itemIndex) => (itemIndex === index ? block : item)));
  }

  function addBlock(type: string) {
    updateBlocks([...blocks, createBlock(type)]);
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    updateBlocks(next);
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
        <input name="pageType" type="hidden" value={draft.pageType} />
        <input name="estimatedMinutes" type="hidden" value={draft.estimatedMinutes} />
        <input name="isRequired" type="hidden" value={draft.isRequired ? "true" : "false"} />

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
          <TextField
            label="Titel"
            name="title"
            value={draft.title}
            onChange={(title) => updateDraft({ title })}
          />
          <TextField
            label="Samenvatting"
            name="summary"
            value={draft.summary}
            onChange={(summary) => updateDraft({ summary })}
          />
          <label className="field">
            <span>Type</span>
            <select
              value={draft.pageType}
              onChange={(event) => updateDraft({ pageType: event.target.value })}
            >
              <option value="content">content</option>
              <option value="question">question</option>
              <option value="case">case</option>
              <option value="video">video</option>
              <option value="embed">embed</option>
              <option value="assessment">assessment</option>
            </select>
          </label>
          <div className="editor-two-column">
            <TextField
              label="Minuten"
              type="number"
              value={String(draft.estimatedMinutes)}
              onChange={(value) =>
                updateDraft({ estimatedMinutes: Number(value) || 1 })
              }
            />
            <label className="field checkbox-field">
              <span>Verplicht</span>
              <input
                checked={draft.isRequired}
                onChange={(event) =>
                  updateDraft({ isRequired: event.target.checked })
                }
                type="checkbox"
              />
            </label>
          </div>
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
            {blockTypes.map(([type, label]) => (
              <button
                className="button button-secondary"
                key={type}
                onClick={() => addBlock(type)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="cardless-panel">
          <p className="eyebrow">Nieuwe pagina</p>
          <NewPageForm course={course} createAction={createAction} />
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
            <small>
              {page.page_type} / {page.content.blocks.length} blocks
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}

function NewPageForm({
  course,
  createAction,
}: {
  course: LearningCourseView;
  createAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
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
      <TextField label="Page code" name="pageCode" placeholder="aisa-nieuwe-pagina" />
      <TextField label="Titel" name="title" placeholder="Nieuwe learningpagina" />
      <TextField label="Samenvatting" name="summary" placeholder="Korte omschrijving" />
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
        <TextField label="Volgorde" name="sequenceOrder" type="number" defaultValue="1" />
        <TextField label="Minuten" name="estimatedMinutes" type="number" defaultValue="5" />
      </div>
      <button className="button button-primary" type="submit">
        Pagina maken
      </button>
    </form>
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
            ^
          </button>
          <button type="button" onClick={onMoveDown} aria-label="Block omlaag">
            v
          </button>
          <button type="button" onClick={onRemove} aria-label="Block verwijderen">
            x
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
          <TextField label="Titel" value={s(block.title)} onChange={(title) => onChange({ ...block, title })} />
          <TextField label="Subtitle" value={s(block.subtitle)} onChange={(subtitle) => onChange({ ...block, subtitle })} />
        </div>
      );
    case "paragraph":
      return <TextareaField label="Tekst" value={s(block.markdown)} onChange={(markdown) => onChange({ ...block, markdown })} />;
    case "callout":
      return (
        <div className="form-stack">
          <label className="field">
            <span>Tone</span>
            <select value={s(block.tone) || "info"} onChange={(event) => onChange({ ...block, tone: event.target.value })}>
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="success">success</option>
            </select>
          </label>
          <TextareaField label="Tekst" value={s(block.markdown)} onChange={(markdown) => onChange({ ...block, markdown })} />
        </div>
      );
    case "checklist":
    case "key_takeaways":
      return <ListField label="Items, een per regel" values={block.items} onChange={(items) => onChange({ ...block, items })} />;
    case "case_lab":
      return (
        <div className="form-stack">
          <TextField label="Titel" value={s(block.title)} onChange={(title) => onChange({ ...block, title })} />
          <TextareaField label="Casus" value={s(block.markdown)} onChange={(markdown) => onChange({ ...block, markdown })} />
          <TextareaField label="Reflectieprompt" value={s(block.reflection_prompt)} onChange={(reflection_prompt) => onChange({ ...block, reflection_prompt })} />
        </div>
      );
    case "quiz_multiple_choice":
      return <ChoiceFields block={block} multiple={false} onChange={onChange} />;
    case "quiz_multiple_select":
      return <ChoiceFields block={block} multiple onChange={onChange} />;
    case "quiz_true_false":
      return (
        <div className="form-stack">
          <TextareaField label="Vraag" value={s(block.question)} onChange={(question) => onChange({ ...block, question })} />
          <label className="field">
            <span>Correct antwoord</span>
            <select value={String(Boolean(block.correct_answer))} onChange={(event) => onChange({ ...block, correct_answer: event.target.value === "true" })}>
              <option value="true">waar</option>
              <option value="false">niet waar</option>
            </select>
          </label>
          <TextareaField label="Uitleg" value={s(block.explanation)} onChange={(explanation) => onChange({ ...block, explanation })} />
        </div>
      );
    case "quiz_essay":
      return (
        <div className="form-stack">
          <TextareaField label="Vraag" value={s(block.question)} onChange={(question) => onChange({ ...block, question })} />
          <div className="editor-two-column">
            <TextField label="Min woorden" type="number" value={s(block.min_words)} onChange={(min_words) => onChange({ ...block, min_words: n(min_words) })} />
            <TextField label="Max woorden" type="number" value={s(block.max_words)} onChange={(max_words) => onChange({ ...block, max_words: n(max_words) })} />
          </div>
        </div>
      );
    case "short_answer":
      return (
        <div className="form-stack">
          <TextareaField label="Vraag" value={s(block.question)} onChange={(question) => onChange({ ...block, question })} />
          <TextField label="Placeholder" value={s(block.placeholder)} onChange={(placeholder) => onChange({ ...block, placeholder })} />
          <TextareaField label="Guidance" value={s(block.guidance)} onChange={(guidance) => onChange({ ...block, guidance })} />
        </div>
      );
    case "video":
      return (
        <div className="form-stack">
          <TextField label="Titel" value={s(block.title)} onChange={(title) => onChange({ ...block, title })} />
          <TextField label="URL" value={s(block.url)} onChange={(url) => onChange({ ...block, url })} />
          <TextareaField label="Transcript" value={s(block.transcript_markdown)} onChange={(transcript_markdown) => onChange({ ...block, transcript_markdown })} />
        </div>
      );
    case "iframe":
      return (
        <div className="form-stack">
          <TextField label="Titel" value={s(block.title)} onChange={(title) => onChange({ ...block, title })} />
          <TextField label="URL" value={s(block.url)} onChange={(url) => onChange({ ...block, url })} />
          <TextField label="Hoogte" type="number" value={s(block.height)} onChange={(height) => onChange({ ...block, height: n(height) })} />
          <TextareaField label="Caption" value={s(block.caption)} onChange={(caption) => onChange({ ...block, caption })} />
        </div>
      );
    default:
      return <TextareaField label="Raw JSON" value={JSON.stringify(block, null, 2)} onChange={(value) => tryJson(value, block, onChange)} />;
  }
}

function ChoiceFields({
  block,
  multiple,
  onChange,
}: {
  block: EditableBlock;
  multiple: boolean;
  onChange: (block: EditableBlock) => void;
}) {
  return (
    <div className="form-stack">
      <TextareaField label="Vraag" value={s(block.question)} onChange={(question) => onChange({ ...block, question })} />
      <TextareaField
        label="Opties, een per regel"
        value={Array.isArray(block.options) ? block.options.map((option) => option.label).join("\n") : ""}
        onChange={(value) => onChange({ ...block, options: optionsFromText(value) })}
      />
      <TextField
        label={multiple ? "Correcte ids, komma-gescheiden" : "Correct option id"}
        value={multiple ? (block.correct_option_ids ?? []).join(", ") : s(block.correct_option_id)}
        onChange={(value) =>
          onChange(
            multiple
              ? { ...block, correct_option_ids: splitCsv(value) }
              : { ...block, correct_option_id: value },
          )
        }
      />
      <TextareaField label="Uitleg" value={s(block.explanation)} onChange={(explanation) => onChange({ ...block, explanation })} />
    </div>
  );
}

function TextField({
  defaultValue,
  label,
  name,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  defaultValue?: string;
  label: string;
  name?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  value?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        defaultValue={defaultValue}
        name={name}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        placeholder={placeholder}
        type={type}
        value={value}
      />
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
      <textarea onChange={(event) => onChange(event.target.value)} rows={5} value={value} />
    </label>
  );
}

function ListField({
  label,
  onChange,
  values,
}: {
  label: string;
  onChange: (values: string[]) => void;
  values: unknown;
}) {
  return (
    <TextareaField
      label={label}
      value={Array.isArray(values) ? values.join("\n") : ""}
      onChange={(value) => onChange(value.split("\n").map((item) => item.trim()).filter(Boolean))}
    />
  );
}

function createBlock(type: string): EditableBlock {
  const id = `block-${Date.now()}`;
  switch (type) {
    case "hero":
      return { id, type, title: "Nieuwe hero", subtitle: "" };
    case "callout":
      return { id, type, tone: "info", markdown: "Nieuwe callout." };
    case "key_takeaways":
    case "checklist":
      return { id, type, items: ["Eerste item"] };
    case "case_lab":
      return { id, type, title: "Nieuwe casus", markdown: "Beschrijf de situatie.", reflection_prompt: "" };
    case "quiz_multiple_choice":
      return { id, type, question: "Nieuwe vraag?", options: optionsFromText("Optie A\nOptie B"), correct_option_id: "a" };
    case "quiz_multiple_select":
      return { id, type, question: "Nieuwe vraag?", options: optionsFromText("Optie A\nOptie B"), correct_option_ids: ["a"] };
    case "quiz_true_false":
      return { id, type, question: "Nieuwe stelling?", correct_answer: true };
    case "quiz_essay":
      return { id, type, question: "Nieuwe reflectievraag?", min_words: 50, max_words: 200, manual_review_required: true };
    case "short_answer":
      return { id, type, question: "Nieuwe open vraag?", placeholder: "Schrijf je antwoord.", min_words: 20 };
    case "video":
      return { id, type, title: "Nieuwe video", url: "" };
    case "iframe":
      return { id, type, title: "Nieuwe embed", url: "", height: 360 };
    default:
      return { id, type: "paragraph", markdown: "Nieuwe tekst." };
  }
}

function optionsFromText(value: string) {
  return value
    .split("\n")
    .map((label, index) => ({ id: String.fromCharCode(97 + index), label: label.trim() }))
    .filter((option) => option.label);
}

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function tryJson(
  value: string,
  fallback: EditableBlock,
  onChange: (block: EditableBlock) => void,
) {
  try {
    onChange(JSON.parse(value) as EditableBlock);
  } catch {
    onChange(fallback);
  }
}

function s(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function n(value: string) {
  return Number(value) || undefined;
}
