"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import type { LessonBlock, LessonContent } from "@digidactics/domain/learning";
import { LessonBlockRenderer } from "@/components/learning/LessonBlockRenderer";
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
type EditorPanel = "content" | "preview" | "settings" | "advanced";

const blockTypes = [
  { category: "Basis", type: "hero", label: "Hero" },
  { category: "Basis", type: "paragraph", label: "Tekst" },
  { category: "Basis", type: "callout", label: "Callout" },
  { category: "Basis", type: "key_takeaways", label: "Kernpunten" },
  { category: "Basis", type: "checklist", label: "Checklist" },
  { category: "Oefenen", type: "case_lab", label: "Casus" },
  { category: "Vragen", type: "quiz_multiple_choice", label: "Multiple choice" },
  { category: "Vragen", type: "quiz_multiple_select", label: "Multiple select" },
  { category: "Vragen", type: "quiz_true_false", label: "Waar/niet waar" },
  { category: "Vragen", type: "quiz_essay", label: "Reflectievraag" },
  { category: "Vragen", type: "short_answer", label: "Open vraag" },
  { category: "Media", type: "video", label: "Video" },
  { category: "Media", type: "iframe", label: "Iframe" },
] as const;
const blockCategories = Array.from(new Set(blockTypes.map((block) => block.category)));
const blockTypeLabels = Object.fromEntries(
  blockTypes.map((block) => [block.type, block.label]),
) as Record<string, string>;

export function LearningAdminEditor({
  course,
  createAction,
  initialPageCode,
  updateAction,
}: {
  course: LearningCourseView;
  createAction: (formData: FormData) => void | Promise<void>;
  initialPageCode?: string;
  updateAction: (formData: FormData) => void | Promise<void>;
}) {
  const pages = useMemo(() => course.topics.flatMap((topic) => topic.pages), [course]);
  const initialPageId =
    pages.find((page) => page.page_code === initialPageCode)?.id ?? pages[0]?.id ?? "";
  const [activePageId, setActivePageId] = useState(initialPageId);
  const [activePanel, setActivePanel] = useState<EditorPanel>("content");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0];
  const activeTopic =
    course.topics.find((topic) => topic.pages.some((page) => page.id === activePage?.id)) ??
    course.topics[0];
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
  const selectedBlock =
    blocks.find((block) => block.id === selectedBlockId) ?? blocks[0] ?? null;
  const selectedBlockIndex = selectedBlock
    ? blocks.findIndex((block) => block.id === selectedBlock.id)
    : -1;

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
    const nextBlock = createBlock(type);
    const insertAfter =
      selectedBlockIndex >= 0 && selectedBlockIndex < blocks.length
        ? selectedBlockIndex + 1
        : blocks.length;
    updateBlocks([...blocks.slice(0, insertAfter), nextBlock, ...blocks.slice(insertAfter)]);
    setSelectedBlockId(nextBlock.id);
    setActivePanel("content");
  }

  function duplicateBlock(index: number) {
    const source = blocks[index];
    if (!source) return;
    const nextBlock = cloneBlock(source);
    updateBlocks([...blocks.slice(0, index + 1), nextBlock, ...blocks.slice(index + 1)]);
    setSelectedBlockId(nextBlock.id);
    setActivePanel("content");
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    updateBlocks(next);
  }

  function removeBlock(index: number) {
    const nextBlocks = blocks.filter((_, itemIndex) => itemIndex !== index);
    updateBlocks(nextBlocks);
    setSelectedBlockId(nextBlocks[Math.max(0, index - 1)]?.id ?? "");
  }

  function selectPage(pageId: string) {
    setActivePageId(pageId);
    setSelectedBlockId("");
    setActivePanel("content");
  }

  return (
    <section className="editor-shell">
      <aside className="editor-nav" aria-label="Cursusstructuur">
        <div>
          <p className="eyebrow">Structuur</p>
          <h2>{course.title}</h2>
          <p className="muted">
            {course.topics.length} topics / {pages.length} pagina's
          </p>
        </div>
        <button
          className="button button-primary editor-new-page-button"
          onClick={() => setActivePanel("settings")}
          type="button"
        >
          Nieuwe pagina
        </button>
        <div className="editor-topic-list">
          {course.topics.map((topic) => (
            <TopicNavigation
              activePageId={activePage.id}
              key={topic.id}
              onSelect={selectPage}
              topic={topic}
            />
          ))}
        </div>
      </aside>

      <form action={updateAction} className="editor-canvas">
        <input name="pageId" type="hidden" value={activePage.id} />
        <input name="courseCode" type="hidden" value={course.course_code} />
        <input name="pageCode" type="hidden" value={activePage.page_code} />
        <input name="title" type="hidden" value={draft.title} />
        <input name="summary" type="hidden" value={draft.summary} />
        <input name="content" type="hidden" value={JSON.stringify(draft.content)} />
        <input name="pageType" type="hidden" value={draft.pageType} />
        <input name="estimatedMinutes" type="hidden" value={draft.estimatedMinutes} />
        <input name="isRequired" type="hidden" value={draft.isRequired ? "true" : "false"} />

        <div className="editor-toolbar">
          <div>
            <p className="eyebrow">Pagina</p>
            <div className="editor-breadcrumb">
              <span>{activeTopic?.title ?? "Topic"}</span>
              <span>{draft.pageType}</span>
              <span>{blocks.length} blocks</span>
            </div>
            <h1>{draft.title}</h1>
            <p className="muted">{draft.summary || "Geen samenvatting ingesteld."}</p>
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

        <div className="editor-tabs" role="tablist" aria-label="Editorweergave">
          <EditorTab active={activePanel === "content"} onClick={() => setActivePanel("content")}>
            Bewerken
          </EditorTab>
          <EditorTab active={activePanel === "preview"} onClick={() => setActivePanel("preview")}>
            Preview
          </EditorTab>
          <EditorTab active={activePanel === "settings"} onClick={() => setActivePanel("settings")}>
            Instellingen
          </EditorTab>
          <EditorTab active={activePanel === "advanced"} onClick={() => setActivePanel("advanced")}>
            Advanced
          </EditorTab>
        </div>

        {activePanel === "content" ? (
          <div className="editor-page-canvas">
            <EditorPageStatus
              blockCount={blocks.length}
              estimatedMinutes={draft.estimatedMinutes}
              isRequired={draft.isRequired}
              selectedBlock={selectedBlock}
            />
            {blocks.map((block, index) => (
              <BlockCard
                block={block}
                index={index}
                isSelected={selectedBlock?.id === block.id}
                key={block.id}
                onDuplicate={() => duplicateBlock(index)}
                onClick={() => setSelectedBlockId(block.id)}
                onMoveDown={() => moveBlock(index, 1)}
                onMoveUp={() => moveBlock(index, -1)}
                onRemove={() => removeBlock(index)}
              />
            ))}
            {blocks.length === 0 ? (
              <p className="empty-state">Deze pagina heeft nog geen blocks.</p>
            ) : null}
            <BlockAddTray onAddBlock={addBlock} />
          </div>
        ) : null}

        {activePanel === "preview" ? (
          <div className="editor-preview-frame">
            <div className="editor-preview-header">
              <span>Leerlingweergave</span>
              <small>{blocks.length} blocks</small>
            </div>
            <article className="lesson-shell page-canvas">
              {blocks.map((block) => (
                <LessonBlockRenderer block={block as LessonBlock} key={block.id} />
              ))}
            </article>
          </div>
        ) : null}

        {activePanel === "settings" ? (
          <PageSettings draft={draft} updateDraft={updateDraft} />
        ) : null}

        {activePanel === "advanced" ? (
          <div className="editor-advanced">
            <p className="muted">
              Inspectie van de opgeslagen content. Dit blijft bewust een advanced view.
            </p>
            <pre>{JSON.stringify(draft.content, null, 2)}</pre>
          </div>
        ) : null}
      </form>

      <aside className="editor-properties">
        {activePanel === "content" ? (
          <>
            <div className="cardless-panel">
              <p className="eyebrow">Eigenschappen</p>
              {selectedBlock && selectedBlockIndex >= 0 ? (
                <>
                  <h2>{getBlockTitle(selectedBlock, selectedBlockIndex)}</h2>
                  <BlockFields
                    block={selectedBlock}
                    onChange={(nextBlock) => updateBlock(selectedBlockIndex, nextBlock)}
                  />
                </>
              ) : (
                <p className="empty-state">Selecteer een block om de inhoud te bewerken.</p>
              )}
            </div>
            <div className="cardless-panel">
              <p className="eyebrow">Pagina</p>
              <h2>Rustig bouwen</h2>
              <p className="muted">
                Selecteer links een contentblok, bewerk hier de inhoud en voeg onderaan nieuwe
                blokken toe.
              </p>
            </div>
          </>
        ) : null}

        {activePanel === "preview" ? (
          <div className="cardless-panel">
            <p className="eyebrow">Preview</p>
            <h2>Controleer de lesflow</h2>
            <p className="muted">
              Dit gebruikt dezelfde renderer als de learner route. Zo zie je sneller of de pagina
              logisch opbouwt voordat je opslaat.
            </p>
          </div>
        ) : null}

        {activePanel === "settings" ? (
          <div className="cardless-panel">
            <p className="eyebrow">Nieuwe pagina</p>
            <NewPageForm course={course} createAction={createAction} />
          </div>
        ) : null}

        {activePanel === "advanced" ? (
          <div className="cardless-panel">
            <p className="eyebrow">Technisch</p>
            <h2>Content JSON</h2>
            <p className="muted">
              De JSON blijft los inspecteerbaar zodat content later goed te versioneren is.
            </p>
          </div>
        ) : null}
      </aside>
    </section>
  );
}

function BlockAddTray({ onAddBlock }: { onAddBlock: (type: string) => void }) {
  return (
    <section className="editor-add-tray" aria-label="Blok toevoegen">
      <div>
        <p className="eyebrow">Blok toevoegen</p>
        <h2>Contentblokken</h2>
      </div>
      <div className="editor-add-groups">
        {blockCategories.map((category) => (
          <div className="editor-add-group" key={category}>
            <span>{category}</span>
            <div>
              {blockTypes
                .filter((blockType) => blockType.category === category)
                .map((blockType) => (
                  <button
                    className="button button-secondary"
                    key={blockType.type}
                    onClick={() => onAddBlock(blockType.type)}
                    type="button"
                  >
                    {blockType.label}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EditorTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className="editor-tab"
      onClick={onClick}
      role="tab"
      type="button"
    >
      {children}
    </button>
  );
}

function PageSettings({
  draft,
  updateDraft,
}: {
  draft: PageDraft;
  updateDraft: (patch: Partial<PageDraft>) => void;
}) {
  return (
    <div className="editor-page-settings">
      <TextField label="Titel" value={draft.title} onChange={(title) => updateDraft({ title })} />
      <TextField
        label="Samenvatting"
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
          onChange={(value) => updateDraft({ estimatedMinutes: Number(value) || 1 })}
        />
        <label className="field checkbox-field">
          <span>Verplicht</span>
          <input
            checked={draft.isRequired}
            onChange={(event) => updateDraft({ isRequired: event.target.checked })}
            type="checkbox"
          />
        </label>
      </div>
    </div>
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
      <div className="editor-topic-heading">
        <h3>{topic.title}</h3>
        <span>{topic.pages.length}</span>
      </div>
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

function EditorPageStatus({
  blockCount,
  estimatedMinutes,
  isRequired,
  selectedBlock,
}: {
  blockCount: number;
  estimatedMinutes: number;
  isRequired: boolean;
  selectedBlock: EditableBlock | null;
}) {
  return (
    <div className="editor-page-status" aria-label="Pagina-overzicht">
      <StatusMetric label="Blocks" value={String(blockCount)} />
      <StatusMetric label="Duur" value={`${estimatedMinutes} min`} />
      <StatusMetric label="Status" value={isRequired ? "Verplicht" : "Optioneel"} />
      <StatusMetric
        label="Selectie"
        value={selectedBlock ? getBlockLabel(selectedBlock.type) : "Geen block"}
      />
    </div>
  );
}

function StatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BlockCard({
  block,
  index,
  isSelected,
  onClick,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  onRemove,
}: {
  block: EditableBlock;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onDuplicate: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
}) {
  return (
    <section
      aria-current={isSelected ? "true" : undefined}
      className="editor-block-card"
      onClick={onClick}
    >
      <button className="editor-block-select" type="button">
        <span className="pill">{getBlockLabel(block.type)}</span>
        <strong>{getBlockTitle(block, index)}</strong>
        <small>{getBlockSummary(block)}</small>
      </button>
      <div className="icon-actions">
        <button type="button" onClick={stopAnd(onMoveUp)} aria-label="Block omhoog">
          ^
        </button>
        <button type="button" onClick={stopAnd(onMoveDown)} aria-label="Block omlaag">
          v
        </button>
        <button type="button" onClick={stopAnd(onDuplicate)} aria-label="Block dupliceren">
          +
        </button>
        <button type="button" onClick={stopAnd(onRemove)} aria-label="Block verwijderen">
          x
        </button>
      </div>
    </section>
  );
}

function stopAnd(action: () => void) {
  return (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    action();
  };
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

function getBlockTitle(block: EditableBlock, index: number) {
  const label = getBlockLabel(block.type);
  const specific = s(block.title) || s(block.question);
  return specific || `${label} ${index + 1}`;
}

function getBlockLabel(type: string) {
  return blockTypeLabels[type] ?? type;
}

function getBlockSummary(block: EditableBlock) {
  if (block.type === "key_takeaways" || block.type === "checklist") {
    return Array.isArray(block.items) ? `${block.items.length} items` : "Geen items";
  }
  const text =
    s(block.subtitle) ||
    s(block.markdown) ||
    s(block.reflection_prompt) ||
    s(block.explanation) ||
    s(block.url) ||
    s(block.caption);
  return text ? truncate(text, 120) : "Klik om eigenschappen te bewerken";
}

function truncate(value: string, maxLength: number) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength - 1)}...` : compact;
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

function cloneBlock(block: EditableBlock): EditableBlock {
  const copy = structuredClone(block) as EditableBlock;
  return {
    ...copy,
    id: `block-${Date.now()}`,
    title: copy.title ? `${copy.title} kopie` : copy.title,
  };
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
