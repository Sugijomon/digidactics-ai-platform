"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { MouseEvent } from "react";
import { AccordionBlockModal } from "@/components/learning/admin/AccordionBlockModal";
import { AudioBlockModal } from "@/components/learning/admin/AudioBlockModal";
import { Breadcrumb } from "@/components/learning/admin/Breadcrumb";
import { CaseStudyBlockModal } from "@/components/learning/admin/CaseStudyBlockModal";
import { ChecklistBlockModal } from "@/components/learning/admin/ChecklistBlockModal";
import { CalloutBlockModal } from "@/components/learning/admin/CalloutBlockModal";
import { ComparisonBlockModal } from "@/components/learning/admin/ComparisonBlockModal";
import { DownloadBlockModal } from "@/components/learning/admin/DownloadBlockModal";
import { EmbedH5PBlockModal } from "@/components/learning/admin/EmbedH5PBlockModal";
import { HeadingBlockModal } from "@/components/learning/admin/HeadingBlockModal";
import { HeroBlockModal } from "@/components/learning/admin/HeroBlockModal";
import { ImageBlockModal } from "@/components/learning/admin/ImageBlockModal";
import { IframeBlockModal } from "@/components/learning/admin/IframeBlockModal";
import { KeyTakeawaysBlockModal } from "@/components/learning/admin/KeyTakeawaysBlockModal";
import { KnowledgeCardsBlockModal } from "@/components/learning/admin/KnowledgeCardsBlockModal";
import { ProgressCheckBlockModal } from "@/components/learning/admin/ProgressCheckBlockModal";
import { QuizEssayBlockModal } from "@/components/learning/admin/QuizEssayBlockModal";
import { QuizFillBlockModal } from "@/components/learning/admin/QuizFillBlockModal";
import { QuizMCBlockModal } from "@/components/learning/admin/QuizMCBlockModal";
import { QuizMSBlockModal } from "@/components/learning/admin/QuizMSBlockModal";
import { QuizTFBlockModal } from "@/components/learning/admin/QuizTFBlockModal";
import { ReflectionBlockModal } from "@/components/learning/admin/ReflectionBlockModal";
import { QuoteBlockModal } from "@/components/learning/admin/QuoteBlockModal";
import { ScenarioBlockModal } from "@/components/learning/admin/ScenarioBlockModal";
import { SectionHeaderBlockModal } from "@/components/learning/admin/SectionHeaderBlockModal";
import { SlideDeckBlockModal } from "@/components/learning/admin/SlideDeckBlockModal";
import { TextBlockModal } from "@/components/learning/admin/TextBlockModal";
import { TimelineBlockModal } from "@/components/learning/admin/TimelineBlockModal";
import { VideoBlockModal } from "@/components/learning/admin/VideoBlockModal";
import type { LessonContent } from "@digidactics/domain/learning";
import type { LearningCourseView } from "@/lib/learning-preview-data";

type EditableBlock = Record<string, any> & { id: string; type: string };
type ChoiceOption = { id: string; label: string };
type PageDraft = {
  title: string;
  summary: string;
  pageType: string;
  estimatedMinutes: number;
  isRequired: boolean;
  status: string;
  content: LessonContent;
};

const contentBlockTypes = [
  { type: "paragraph", label: "Tekst", description: "Markdown tekstblok." },
  { type: "heading", label: "Heading", description: "Kop H1-H6." },
  { type: "video", label: "Video", description: "Video met transcript." },
  { type: "audio", label: "Audio", description: "Audiofragment of podcast." },
  { type: "hero", label: "Hero", description: "Grote opener." },
  { type: "section_header", label: "Sectielijn", description: "Lijn met sectienaam." },
  { type: "quote", label: "Quote", description: "Citaat met bron." },
  { type: "accordion", label: "Accordion", description: "Uitklapbare uitleg." },
  { type: "image", label: "Afbeelding", description: "Illustratie of schema." },
  { type: "timeline", label: "Timeline", description: "Tijdlijn of mijlpalen." },
  { type: "comparison", label: "Vergelijking", description: "Twee kolommen." },
  { type: "scenario", label: "Scenario", description: "Keuze met gevolgen." },
  { type: "reflection", label: "Reflectie", description: "Persoonlijke reflectie." },
  { type: "progress_check", label: "Progress check", description: "Zelfbeoordeling." },
  { type: "callout", label: "Callout", description: "Tip of waarschuwing." },
  { type: "key_takeaways", label: "Kernpunten", description: "Korte puntenlijst." },
  { type: "knowledge_cards", label: "Kenniskaarten", description: "Inline kenniskaarten." },
  { type: "checklist", label: "Checklist", description: "Actiepunten afvinken." },
  { type: "case_lab", label: "Case", description: "Praktijkcasus." },
  { type: "download", label: "Download", description: "Bestand of link." },
  { type: "slide_deck", label: "Slide deck", description: "Presentatie met slides." },
  { type: "iframe", label: "Iframe", description: "Externe embed." },
  { type: "embed_h5p", label: "H5P", description: "Interactieve H5P activiteit." },
] as const;

const questionBlockTypes = [
  { type: "quiz_multiple_choice", label: "Meerkeuze", description: "Een correct antwoord." },
  { type: "quiz_multiple_select", label: "Multi-select", description: "Meerdere juiste antwoorden." },
  { type: "quiz_true_false", label: "Waar/Onwaar", description: "Stelling met keuze." },
  { type: "short_answer", label: "Invulvraag", description: "Kort open antwoord." },
  { type: "quiz_essay", label: "Essay", description: "Langer antwoord." },
] as const;

const blockTypes = [...contentBlockTypes, ...questionBlockTypes] as const;
const addBlockGroups = [
  {
    label: "Tekst & Media",
    tone: "content",
    blocks: [
      { type: "paragraph", name: "Tekst", icon: "¶", desc: "Markdown met opmaak" },
      { type: "heading", name: "Heading", icon: "H", desc: "Kop H1-H6" },
      { type: "video", name: "Video", icon: "▶", desc: "YouTube of Vimeo" },
      { type: "audio", name: "Audio", icon: "♪", desc: "Audiofragment of podcast" },
      { type: "image", name: "Afbeelding", icon: "▧", desc: "Illustratie of schema" },
      { type: "download", name: "Download", icon: "↓", desc: "Bestand of link" },
      { type: "hero", name: "Hero", icon: "✦", desc: "Grote opener" },
      { type: "section_header", name: "Sectielijn", icon: "-", desc: "Lijn met sectienaam" },
      { type: "quote", name: "Quote", icon: '"', desc: "Citaat met bron" },
    ],
  },
  {
    label: "Structuur & Interactie",
    tone: "content",
    blocks: [
      { type: "callout", name: "Callout", icon: "!", desc: "Tip of waarschuwing" },
      { type: "key_takeaways", name: "Kernpunten", icon: "✓", desc: "Korte puntenlijst" },
      { type: "knowledge_cards", name: "Kenniskaarten", icon: "▤", desc: "Inline kenniskaarten" },
      { type: "checklist", name: "Checklist", icon: "☑", desc: "Actiepunten afvinken" },
      { type: "accordion", name: "Accordion", icon: "▼", desc: "Uitklapbare uitleg" },
      { type: "comparison", name: "Vergelijking", icon: "↔", desc: "Twee kolommen" },
      { type: "timeline", name: "Timeline", icon: "◎", desc: "Tijdlijn" },
    ],
  },
  {
    label: "Leeractiviteiten",
    tone: "content",
    blocks: [
      { type: "scenario", name: "Scenario", icon: "⬡", desc: "Keuze met gevolgen" },
      { type: "case_lab", name: "Case", icon: "▤", desc: "Praktijkcasus" },
      { type: "reflection", name: "Reflectie", icon: "✍", desc: "Persoonlijk antwoord" },
      { type: "progress_check", name: "Progress check", icon: "★", desc: "Zelfbeoordeling" },
      { type: "iframe", name: "Iframe", icon: "▢", desc: "Externe embed" },
    ],
  },
  {
    label: "Presentaties",
    tone: "content",
    blocks: [
      { type: "slide_deck", name: "Slide deck", icon: "S", desc: "Presentatie slides" },
    ],
  },
  {
    label: "Vragen & Toetsing",
    tone: "quiz",
    blocks: [
      { type: "quiz_multiple_choice", name: "Meerkeuze", icon: "◉", desc: "Een correct antwoord" },
      { type: "quiz_multiple_select", name: "Multi-select", icon: "☑", desc: "Meerdere juist" },
      { type: "quiz_true_false", name: "Waar/Onwaar", icon: "⇄", desc: "Stelling beoordelen" },
      { type: "short_answer", name: "Invulvraag", icon: "_", desc: "Kort open antwoord" },
      { type: "quiz_essay", name: "Essay", icon: "≡", desc: "Langer antwoord" },
      { type: "embed_h5p", name: "H5P", icon: "H5", desc: "Interactieve oefening" },
    ],
  },
] as const;
const blockTypeLabels = Object.fromEntries(
  blockTypes.map((block) => [block.type, block.label]),
) as Record<string, string>;
blockTypeLabels.section_heading = "Sectielijn";

export function LearningAdminEditor({
  course,
  initialPageCode,
  mode = "page",
  updateAction,
}: {
  course: LearningCourseView;
  initialPageCode?: string;
  mode?: "page" | "microlearning";
  updateAction: (formData: FormData) => void | Promise<void>;
}) {
  const pages = useMemo(() => course.topics.flatMap((topic) => topic.pages), [course]);
  const activePage = pages.find((page) => page.page_code === initialPageCode) ?? pages[0];
  const activeTopic =
    course.topics.find((topic) => topic.pages.some((page) => page.id === activePage?.id)) ??
    course.topics[0];
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBlockDraft, setEditingBlockDraft] = useState<EditableBlock | null>(null);
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);
  const [isCreatingBlock, setIsCreatingBlock] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [isPending, startTransition] = useTransition();
  const didMount = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingBlockDraftRef = useRef<EditableBlock | null>(null);
  const [draft, setDraft] = useState<PageDraft>(() => ({
    title: activePage?.title ?? "",
    summary: activePage?.summary ?? "",
    pageType: activePage?.page_type ?? "content",
    estimatedMinutes: activePage?.estimated_duration_minutes ?? 5,
    isRequired: activePage?.is_required ?? true,
    status: activePage?.status ?? "published",
    content: activePage?.content ?? { blocks: [] },
  }));
  const draftRef = useRef(draft);

  const blocks = (draft.content.blocks ?? []) as EditableBlock[];
  const selectedBlock = selectedBlockId
    ? blocks.find((block) => block.id === selectedBlockId) ?? null
    : null;
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(() => {
      saveDraft();
    }, 1500);

    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [draft]);

  if (!activePage) {
    return <p className="empty-state">Geen pagina's gevonden.</p>;
  }

  function updateDraft(patch: Partial<PageDraft>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      draftRef.current = next;
      return next;
    });
  }

  function updateBlocks(nextBlocks: EditableBlock[]) {
    const currentDraft = draftRef.current;
    const nextDraft = {
      ...currentDraft,
      content: { ...currentDraft.content, blocks: nextBlocks as LessonContent["blocks"] },
    };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    return nextDraft;
  }

  function updateBlock(index: number, block: EditableBlock) {
    updateBlocks(blocks.map((item, itemIndex) => (itemIndex === index ? block : item)));
  }

  function addBlock(type: string) {
    const nextBlock = createBlock(type);
    setSelectedBlockId(nextBlock.id);
    editingBlockDraftRef.current = nextBlock;
    setEditingBlockDraft(nextBlock);
    setEditingBlockIndex(blocks.length);
    setIsCreatingBlock(true);
    setIsAddModalOpen(false);
  }

  function openBlockEditor(block: EditableBlock, index: number) {
    setSelectedBlockId(block.id);
    editingBlockDraftRef.current = block;
    setEditingBlockDraft(block);
    setEditingBlockIndex(index);
    setIsCreatingBlock(false);
  }

  function closeBlockEditor() {
    editingBlockDraftRef.current = null;
    setEditingBlockDraft(null);
    setEditingBlockIndex(null);
    setIsCreatingBlock(false);
  }

  function saveBlockEditor(nextBlock?: EditableBlock) {
    const blockToSave = nextBlock ?? editingBlockDraftRef.current ?? editingBlockDraft;
    if (!blockToSave || editingBlockIndex === null) return;
    editingBlockDraftRef.current = blockToSave;
    const currentBlocks = (draftRef.current.content.blocks ?? []) as EditableBlock[];
    let nextBlocks: EditableBlock[];

    if (isCreatingBlock) {
      nextBlocks = [...currentBlocks, blockToSave];
    } else {
      nextBlocks = currentBlocks.map((item, itemIndex) =>
        itemIndex === editingBlockIndex ? blockToSave : item,
      );
    }

    const nextDraft = updateBlocks(nextBlocks);
    setSelectedBlockId(blockToSave.id);
    closeBlockEditor();
    saveDraft(nextDraft);
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    updateBlocks(next);
    setSelectedBlockId(next[target].id);
  }

  function removeBlock(index: number) {
    const nextBlocks = blocks.filter((_, itemIndex) => itemIndex !== index);
    updateBlocks(nextBlocks);
    setSelectedBlockId(nextBlocks[Math.max(0, index - 1)]?.id ?? "");
  }

  function saveDraft(draftToSave: PageDraft = draftRef.current) {
    setSaveError("");
    startTransition(async () => {
      try {
        await updateAction(toFormData(activePage.id, course.course_code, activePage.page_code, draftToSave));
        setSavedAt(new Intl.DateTimeFormat("nl-NL", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()));
      } catch (error) {
        console.error("Learning admin save failed", error);
        setSaveError("Opslaan mislukt");
      }
    });
  }

  return (
    <section className="lesson-editor-page">
      <div className="topbar-save-indicator">
        <span className={saveError ? "save-dot error" : isPending ? "save-dot saving" : "save-dot saved"} />
        <span className="save-text">
          {saveError || (isPending ? "Opslaan..." : savedAt ? `Opgeslagen ${savedAt}` : "Klaar voor autosave")}
        </span>
      </div>

      <div className="lesson-editor-header">
        <div>
          <Breadcrumb
            items={
              mode === "microlearning"
                ? [
                    { label: "Content Editor", href: "/learning/admin" },
                    { label: "Cursussen", href: "/learning/admin/courses" },
                    { label: "Micro-learnings", href: "/learning/admin/courses?view=microlearnings" },
                    { label: draft.title },
                  ]
                : [
                    { label: "Content Editor", href: "/learning/admin" },
                    { label: "Cursussen", href: "/learning/admin/courses" },
                    { label: course.title, href: `/learning/admin/courses/${course.course_code}` },
                    { label: draft.title },
                  ]
            }
          />
          <h1>Les bewerken</h1>
        </div>
      </div>

      <form
        className="lesson-editor-layout"
        onSubmit={(event) => {
          event.preventDefault();
          saveDraft();
        }}
      >
        <main className="lesson-main-card">
          <header className="lesson-meta-section">
            <div className="lesson-header-edit-fields">
              <label className="field">
                <span className="meta-field-label">Lesnaam</span>
                <input
                  className="lesson-title-input"
                  value={draft.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                />
              </label>
              <label className="field">
                <span className="meta-field-label">Samenvatting</span>
                <textarea
                  rows={3}
                  value={draft.summary}
                  onChange={(event) => updateDraft({ summary: event.target.value })}
                />
              </label>
            </div>
            <div className="lesson-meta-pills">
              <MetaPill label="Topic" value={activeTopic?.title ?? "Geen topic"} />
              <MetaPill label="Type" value={draft.pageType} />
              <MetaPill label="Duur" value={`${draft.estimatedMinutes} min`} />
              <MetaPill isPublished={draft.status === "published"} label="Status" value={draft.status === "published" ? "Gepubliceerd" : "Concept"} />
            </div>
          </header>

          <div className="lesson-blocks-section">
            {blocks.map((block, index) => (
              <BlockCard
                block={block}
                index={index}
                isSelected={selectedBlock?.id === block.id}
                key={block.id}
                onClick={() => openBlockEditor(block, index)}
                onMoveDown={() => moveBlock(index, 1)}
                onMoveUp={() => moveBlock(index, -1)}
                onRemove={() => removeBlock(index)}
                total={blocks.length}
              />
            ))}
            {!blocks.length ? <p className="empty-state">Deze les heeft nog geen blokken.</p> : null}
          </div>

          <footer className="lesson-frame-footer">
            <button className="dashed-add-button wide" onClick={() => setIsAddModalOpen(true)} type="button">
              ＋ Item toevoegen
            </button>
          </footer>
        </main>

        <aside className="lesson-editor-side">
          <section className="lesson-sidebar-card">
            <header className="lesson-sidebar-card-head panel-head">
              <h3>Blokken bewerken</h3>
              <span className="panel-count">{blocks.length} blokken</span>
            </header>
            <div className="lesson-sidebar-card-body">
              <p className="empty-state compact-empty-state">
                Klik op een blokkaart om de inhoud in een popup te bewerken.
              </p>
            </div>
          </section>

          <section className="lesson-sidebar-card">
            <header className="lesson-sidebar-card-head panel-head">
              <h3>Pagina-metadata</h3>
              <button className="button button-secondary" type="submit">
                Opslaan
              </button>
            </header>
            <div className="lesson-sidebar-card-body">
              <PageSettings draft={draft} mode={mode} updateDraft={updateDraft} />
            </div>
          </section>
        </aside>
      </form>

      {isAddModalOpen ? (
        <AddItemModal onAddBlock={addBlock} onClose={() => setIsAddModalOpen(false)} />
      ) : null}
      {editingBlockDraft ? (
        <BlockEditDialog
          block={editingBlockDraft}
          blockIndex={editingBlockIndex ?? 0}
          isNew={isCreatingBlock}
          onChange={(block) => {
            editingBlockDraftRef.current = block;
            setEditingBlockDraft(block);
          }}
          onClose={closeBlockEditor}
          onSave={saveBlockEditor}
        />
      ) : null}
    </section>
  );
}

function MetaPill({ isPublished = false, label, value }: { isPublished?: boolean; label: string; value: string }) {
  return (
    <span className={isPublished ? "lesson-meta-pill meta-pill-published" : "lesson-meta-pill"}>
      <strong>{label}</strong>
      {value}
    </span>
  );
}

function AddItemModal({
  onAddBlock,
  onClose,
}: {
  onAddBlock: (type: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="admin-dialog-backdrop" role="presentation">
      <section
        aria-labelledby="add-item-title"
        aria-modal="true"
        className="admin-dialog add-item-dialog"
        role="dialog"
      >
        <header className="admin-dialog-header">
          <div>
            <h2 id="add-item-title">Item toevoegen</h2>
            <p>Kies het type contentblok dat je aan deze les wilt toevoegen.</p>
          </div>
          <button aria-label="Sluiten" className="admin-dialog-close" onClick={onClose} type="button">
            x
          </button>
        </header>
        <div className="add-item-body">
          {addBlockGroups.map((group) => (
            <BlockTypeGroup group={group} key={group.label} onAddBlock={onAddBlock} />
          ))}
        </div>
        <footer className="admin-dialog-actions">
          <button className="button button-secondary" onClick={onClose} type="button">
            Annuleren
          </button>
        </footer>
      </section>
    </div>
  );
}

function BlockTypeGroup({
  group,
  label,
  onAddBlock,
}: {
  group: (typeof addBlockGroups)[number];
  label?: string;
  onAddBlock: (type: string) => void;
}) {
  return (
    <section className="add-section">
      <h3 className="add-section-label">{label ?? group.label}</h3>
      <div className="block-grid">
        {group.blocks.map((block) => (
          <button
            className={`block-btn ${group.tone}`}
            key={block.type}
            onClick={() => onAddBlock(block.type)}
            type="button"
          >
            <span className="block-icon">{block.icon}</span>
            <span className="block-name">{block.name}</span>
            <span className="block-desc">{block.desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function BlockEditDialog({
  block,
  blockIndex,
  isNew,
  onChange,
  onClose,
  onSave,
}: {
  block: EditableBlock;
  blockIndex: number;
  isNew: boolean;
  onChange: (block: EditableBlock) => void;
  onClose: () => void;
  onSave: (block?: EditableBlock) => void;
}) {
  const label = getBlockLabel(block.type);

  if (block.type === "paragraph") {
    return (
      <TextBlockModal
        blockNumber={blockIndex + 1}
        initialContent={s(block.markdown)}
        initialImageUrl={s(block.image_url)}
        onClose={onClose}
        onSave={(content, imageUrl) => {
          const nextBlock = { ...block, markdown: content, image_url: imageUrl };
          onChange(nextBlock);
          onSave(nextBlock);
        }}
      />
    );
  }

  if (block.type === "video") {
    return (
      <VideoBlockModal
        blockNumber={blockIndex + 1}
        initialCaption={s(block.caption || block.title)}
        initialDurationSeconds={typeof block.duration_seconds === "number" ? block.duration_seconds : undefined}
        initialRequired={Boolean(block.require_full_watch)}
        initialTranscript={s(block.transcript || block.transcript_markdown)}
        initialUrl={s(block.url)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            url: data.url,
            caption: data.caption,
            title: data.caption,
            duration_seconds: data.duration_seconds,
            transcript: data.transcript,
            transcript_markdown: data.transcript,
            require_full_watch: data.require_full_watch,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "hero") {
    return (
      <HeroBlockModal
        blockNumber={blockIndex + 1}
        initialColor={s(block.background_color) || "primary"}
        initialSubtitle={s(block.subtitle)}
        initialTitle={s(block.title)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            title: data.title,
            subtitle: data.subtitle,
            background_color: data.background_color,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "heading") {
    return (
      <HeadingBlockModal
        blockNumber={blockIndex + 1}
        initialLevel={normalizeHeadingLevel(block.level)}
        initialText={s(block.text)}
        onClose={onClose}
        onSave={(data) => {
          const nextBlock = {
            ...block,
            text: data.text,
            level: data.level,
          };
          onChange(nextBlock);
          onSave(nextBlock);
        }}
      />
    );
  }

  if (block.type === "section_header" || block.type === "section_heading") {
    return (
      <SectionHeaderBlockModal
        blockNumber={blockIndex + 1}
        initialSubtitle={s(block.subtitle)}
        initialTitle={s(block.title)}
        onClose={onClose}
        onSave={(data) => {
          const nextBlock = {
            ...block,
            type: "section_heading",
            title: data.title,
            subtitle: data.subtitle,
          };
          onChange(nextBlock);
          onSave(nextBlock);
        }}
      />
    );
  }

  if (block.type === "callout") {
    return (
      <CalloutBlockModal
        blockNumber={blockIndex + 1}
        initialContent={s(block.content || block.markdown)}
        initialTitle={s(block.title)}
        initialTone={normalizeTone(block.tone)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            tone: data.tone,
            title: data.title,
            content: data.content,
            markdown: data.content,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "quote") {
    return (
      <QuoteBlockModal
        blockNumber={blockIndex + 1}
        initialAuthor={s(block.author)}
        initialQuote={s(block.quote || block.markdown)}
        initialRole={s(block.role)}
        initialSource={s(block.source)}
        initialSourceUrl={s(block.source_url)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            quote: data.quote,
            markdown: data.quote,
            author: data.author,
            role: data.role,
            source: data.source,
            source_url: data.source_url,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "accordion") {
    return (
      <AccordionBlockModal
        blockNumber={blockIndex + 1}
        initialAllowMultiple={Boolean(block.allow_multiple_open)}
        initialItems={normalizeAccordionItems(block.items)}
        initialTitle={s(block.title)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            title: data.title,
            items: data.items,
            allow_multiple_open: data.allow_multiple_open,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "image") {
    return (
      <ImageBlockModal
        blockNumber={blockIndex + 1}
        initialAlt={s(block.alt)}
        initialCaption={s(block.caption)}
        initialUrl={s(block.url)}
        initialWidth={normalizeImageWidth(block.width)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            url: data.url,
            alt: data.alt,
            caption: data.caption,
            width: data.width,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "timeline") {
    return (
      <TimelineBlockModal
        blockNumber={blockIndex + 1}
        initialItems={normalizeTimelineItems(block.items)}
        initialTitle={s(block.title)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            title: data.title,
            items: data.items,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "comparison") {
    return (
      <ComparisonBlockModal
        blockNumber={blockIndex + 1}
        initialLeftColor={normalizeComparisonColor(block.left_color)}
        initialLeftItems={Array.isArray(block.left_items) ? block.left_items.map(String) : []}
        initialLeftLabel={s(block.left_label) || "✓ Toegestaan"}
        initialRightColor={normalizeComparisonColor(block.right_color)}
        initialRightItems={Array.isArray(block.right_items) ? block.right_items.map(String) : []}
        initialRightLabel={s(block.right_label) || "✕ Verboden"}
        initialTitle={s(block.title)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            title: data.title,
            left_label: data.left_label,
            right_label: data.right_label,
            left_items: data.left_items,
            right_items: data.right_items,
            left_color: data.left_color,
            right_color: data.right_color,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "scenario") {
    return (
      <ScenarioBlockModal
        blockNumber={blockIndex + 1}
        initialChoices={normalizeScenarioChoices(block.choices)}
        initialQuestion={s(block.question)}
        initialSituation={s(block.situation)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            situation: data.situation,
            question: data.question,
            choices: data.choices,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "reflection") {
    return (
      <ReflectionBlockModal
        blockNumber={blockIndex + 1}
        initialMinWords={typeof block.min_words === "number" ? block.min_words : undefined}
        initialPlaceholder={s(block.placeholder) || "Schrijf hier je reflectie..."}
        initialPrompt={s(block.prompt)}
        initialSavePersonal={Boolean(block.save_personal)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            prompt: data.prompt,
            placeholder: data.placeholder,
            min_words: data.min_words,
            save_personal: data.save_personal,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "progress_check") {
    return (
      <ProgressCheckBlockModal
        blockNumber={blockIndex + 1}
        initialLabels={{ low: s(block.label_low) || "Helemaal niet zeker", high: s(block.label_high) || "Volledig zeker" }}
        initialQuestion={s(block.question)}
        initialScale={block.scale === 3 ? 3 : 5}
        initialShowLabels={block.show_labels !== false}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            question: data.question,
            scale: data.scale,
            label_low: data.label_low,
            label_high: data.label_high,
            show_labels: data.show_labels,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "key_takeaways") {
    return (
      <KeyTakeawaysBlockModal
        blockNumber={blockIndex + 1}
        initialItems={Array.isArray(block.items) ? block.items.map(String) : []}
        initialTitle={s(block.title) || "Kernpunten"}
        onClose={onClose}
        onSave={(data) => {
          const nextBlock = {
            ...block,
            title: data.title,
            items: data.items,
          };
          onChange(nextBlock);
          onSave(nextBlock);
        }}
      />
    );
  }

  if (block.type === "knowledge_cards") {
    const cards = Array.isArray(block.cards)
      ? block.cards.map((card: any, index: number) => ({
          id: s(card?.id) || `card-${index}`,
          title: s(card?.title),
          text: s(card?.text),
        }))
      : [];

    return (
      <KnowledgeCardsBlockModal
        blockNumber={blockIndex + 1}
        initialCards={cards}
        onClose={onClose}
        onSave={(data) => {
          const nextBlock = {
            ...block,
            cards: data.cards,
          };
          onChange(nextBlock);
          onSave(nextBlock);
        }}
      />
    );
  }

  if (block.type === "checklist") {
    return (
      <ChecklistBlockModal
        blockNumber={blockIndex + 1}
        initialItems={normalizeChecklistItems(block.items)}
        initialRequireAll={block.require_all !== false}
        initialTitle={s(block.title)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            title: data.title,
            items: data.items,
            require_all: data.require_all,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "case_lab") {
    return (
      <CaseStudyBlockModal
        blockNumber={blockIndex + 1}
        initialChallenge={s(block.challenge)}
        initialContext={s(block.context || block.markdown)}
        initialHints={Array.isArray(block.hints) ? block.hints.map(String) : []}
        initialQuestion={s(block.question)}
        initialReflection={s(block.reflection_prompt)}
        initialRole={s(block.role)}
        initialTitle={s(block.title)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            title: data.title,
            context: data.context,
            challenge: data.challenge,
            question: data.question,
            hints: data.hints,
            reflection_prompt: data.reflection_prompt,
            role: data.role,
            markdown: data.context,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "download") {
    return (
      <DownloadBlockModal
        blockNumber={blockIndex + 1}
        initialDescription={s(block.description)}
        initialFileName={s(block.file_name || block.title)}
        initialFileSizeLabel={s(block.file_size_label)}
        initialFileUrl={s(block.file_url || block.url)}
        initialLabel={s(block.label || block.button_label) || "Download"}
        initialMimeType={s(block.mime_type)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            file_url: data.file_url,
            url: data.file_url,
            file_name: data.file_name,
            file_size_label: data.file_size_label,
            mime_type: data.mime_type,
            title: data.file_name,
            description: data.description,
            label: data.label,
            button_label: data.label,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "audio") {
    return (
      <AudioBlockModal
        blockNumber={blockIndex + 1}
        initialDurationSeconds={typeof block.duration_seconds === "number" ? block.duration_seconds : undefined}
        initialFileName={s(block.file_name || block.title)}
        initialFileUrl={s(block.file_url || block.url)}
        initialTitle={s(block.title)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            file_url: data.file_url,
            url: data.file_url,
            file_name: data.file_name,
            title: data.title || data.file_name,
            duration_seconds: data.duration_seconds,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "slide_deck") {
    return (
      <SlideDeckBlockModal
        blockNumber={blockIndex + 1}
        initialShowThumbnails={block.show_thumbnails !== false}
        initialSlides={Array.isArray(block.slides) ? block.slides : []}
        initialTitle={s(block.title)}
        onClose={onClose}
        onSave={(data) => {
          const nextBlock = {
            ...block,
            title: data.title,
            slides: data.slides,
            show_thumbnails: data.show_thumbnails,
          };
          onChange(nextBlock);
          onSave(nextBlock);
        }}
      />
    );
  }

  if (block.type === "iframe") {
    return (
      <IframeBlockModal
        blockNumber={blockIndex + 1}
        initialAllowFullscreen={block.allow_fullscreen !== false}
        initialHeight={typeof block.height === "number" ? block.height : 500}
        initialEvidenceKind={block.evidence_kind === "none" ? "none" : s(block.evidence_kind) ? block.evidence_kind : "none"}
        initialProvider={s(block.provider)}
        initialTitle={s(block.title)}
        initialUrl={s(block.url)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            url: data.url,
            title: data.title,
            height: data.height,
            provider: data.provider,
            allow_fullscreen: data.allow_fullscreen,
            evidence_kind: data.evidence_kind,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "embed_h5p") {
    return (
      <EmbedH5PBlockModal
        blockNumber={blockIndex + 1}
        initialActivityType={s(block.activity_type)}
        initialHeight={typeof block.height === "number" ? block.height : 400}
        initialTitle={s(block.title)}
        initialUrl={s(block.url)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            url: data.url,
            title: data.title,
            height: data.height,
            activity_type: data.activity_type,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "quiz_multiple_choice") {
    return (
      <QuizMCBlockModal
        blockNumber={blockIndex + 1}
        initialCorrectId={s(block.correct_option_id) || "a"}
        initialExplanation={s(block.explanation)}
        initialMaxAttempts={typeof block.max_attempts === "number" ? block.max_attempts : 3}
        initialOptions={normalizeOptions(block.options)}
        initialPoints={typeof block.points === "number" ? block.points : 10}
        initialQuestion={s(block.question)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            question: data.question,
            options: data.options,
            correct_option_id: data.correct_option_id,
            explanation: data.explanation,
            points: data.points,
            max_attempts: data.max_attempts,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "quiz_multiple_select") {
    return (
      <QuizMSBlockModal
        blockNumber={blockIndex + 1}
        initialCorrectIds={Array.isArray(block.correct_option_ids) ? block.correct_option_ids.map(String) : []}
        initialExplanation={s(block.explanation)}
        initialMaxAttempts={typeof block.max_attempts === "number" ? block.max_attempts : 3}
        initialOptions={normalizeOptions(block.options)}
        initialPoints={typeof block.points === "number" ? block.points : 10}
        initialQuestion={s(block.question)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            question: data.question,
            options: data.options,
            correct_option_ids: data.correct_option_ids,
            explanation: data.explanation,
            points: data.points,
            max_attempts: data.max_attempts,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "quiz_true_false") {
    return (
      <QuizTFBlockModal
        blockNumber={blockIndex + 1}
        initialAnswer={typeof block.correct_answer === "boolean" ? block.correct_answer : true}
        initialExplanation={s(block.explanation)}
        initialMaxAttempts={typeof block.max_attempts === "number" ? block.max_attempts : 3}
        initialPoints={typeof block.points === "number" ? block.points : 10}
        initialQuestion={s(block.question)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            question: data.question,
            correct_answer: data.correct_answer,
            explanation: data.explanation,
            points: data.points,
            max_attempts: data.max_attempts,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "short_answer") {
    return (
      <QuizFillBlockModal
        blockNumber={blockIndex + 1}
        initialAlternatives={Array.isArray(block.alternative_answers) ? block.alternative_answers.map(String) : []}
        initialAnswer={s(block.correct_answer)}
        initialCaseSensitive={Boolean(block.case_sensitive)}
        initialExplanation={s(block.explanation)}
        initialMaxAttempts={typeof block.max_attempts === "number" ? block.max_attempts : 3}
        initialPlaceholder={s(block.placeholder) || "Vul hier je antwoord in..."}
        initialPoints={typeof block.points === "number" ? block.points : 10}
        initialQuestion={s(block.question)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            question: data.question,
            correct_answer: data.correct_answer,
            alternative_answers: data.alternative_answers,
            case_sensitive: data.case_sensitive,
            placeholder: data.placeholder,
            explanation: data.explanation,
            points: data.points,
            max_attempts: data.max_attempts,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  if (block.type === "quiz_essay") {
    return (
      <QuizEssayBlockModal
        blockNumber={blockIndex + 1}
        initialMaxWords={typeof block.max_words === "number" ? block.max_words : undefined}
        initialMinWords={typeof block.min_words === "number" ? block.min_words : undefined}
        initialPlaceholder={s(block.placeholder) || "Schrijf hier je antwoord..."}
        initialPoints={typeof block.points === "number" ? block.points : 20}
        initialQuestion={s(block.question)}
        onClose={onClose}
        onSave={(data) => {
          onChange({
            ...block,
            question: data.question,
            min_words: data.min_words,
            max_words: data.max_words,
            placeholder: data.placeholder,
            points: data.points,
            manual_review_required: true,
          });
          window.requestAnimationFrame(() => onSave());
        }}
      />
    );
  }

  return (
    <div className="admin-dialog-backdrop" role="presentation">
      <section
        aria-labelledby="edit-block-title"
        aria-modal="true"
        className="admin-dialog block-edit-dialog"
        role="dialog"
      >
        <header className="admin-dialog-header">
          <div>
            <h2 id="edit-block-title">
              {isNew ? "Nieuw" : "Bewerk"} {label} blok
            </h2>
            <p>Pas de inhoud van dit blok aan.</p>
          </div>
          <button aria-label="Sluiten" className="admin-dialog-close" onClick={onClose} type="button">
            x
          </button>
        </header>
        <div className="block-edit-dialog-body">
          <BlockFields block={block} onChange={onChange} />
        </div>
        <footer className="admin-dialog-actions">
          <span className="block-edit-context">Blok {blockIndex + 1}</span>
          <button className="button button-secondary" onClick={onClose} type="button">
            Annuleren
          </button>
          <button className="button button-primary" onClick={() => onSave()} type="button">
            Opslaan
          </button>
        </footer>
      </section>
    </div>
  );
}

function PageSettings({
  draft,
  mode,
  updateDraft,
}: {
  draft: PageDraft;
  mode: "page" | "microlearning";
  updateDraft: (patch: Partial<PageDraft>) => void;
}) {
  return (
    <div className="editor-page-settings">
      {mode === "page" ? (
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
      ) : null}
      <div className="editor-two-column">
        <TextField
          label="Minuten"
          type="number"
          value={String(draft.estimatedMinutes)}
          onChange={(value) => updateDraft({ estimatedMinutes: Number(value) || 1 })}
        />
        <label className="field">
          <span>Status</span>
          <select
            value={draft.status}
            onChange={(event) => updateDraft({ status: event.target.value })}
          >
            <option value="published">published</option>
            <option value="draft">draft</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function BlockMiniActions({
  disabled,
  index,
  onMoveDown,
  onMoveUp,
  onRemove,
  total,
}: {
  disabled: boolean;
  index: number;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  total: number;
}) {
  return (
    <div className="lesson-mini-actions">
      <button disabled={disabled || index <= 0} onClick={(event) => stopAnd(event, onMoveUp)} type="button">
        ↑
      </button>
      <button disabled={disabled || index < 0 || index >= total - 1} onClick={(event) => stopAnd(event, onMoveDown)} type="button">
        ↓
      </button>
      <button disabled={disabled || index < 0} onClick={(event) => stopAnd(event, onRemove)} type="button">
        ✕
      </button>
    </div>
  );
}

function BlockCard({
  block,
  index,
  isSelected,
  onClick,
  onMoveDown,
  onMoveUp,
  onRemove,
  total,
}: {
  block: EditableBlock;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  total: number;
}) {
  return (
    <article
      aria-current={isSelected ? "true" : undefined}
      className="lesson-canvas-block-card"
      onClick={onClick}
    >
      <header>
        <span>{getBlockLabel(block.type).toUpperCase()}</span>
        <BlockMiniActions
          disabled={false}
          index={index}
          onMoveDown={onMoveDown}
          onMoveUp={onMoveUp}
          onRemove={onRemove}
          total={total}
        />
      </header>
      <button className="lesson-canvas-block-body" type="button">
        <strong>{getBlockTitle(block, index)}</strong>
        <BlockPreview block={block} />
      </button>
    </article>
  );
}

function BlockPreview({ block }: { block: EditableBlock }) {
  if (block.type === "key_takeaways") {
    const items = Array.isArray(block.items) ? block.items.map(String).filter(Boolean).slice(0, 3) : [];

    return (
      <div className="kp-preview-list">
        {items.length ? (
          items.map((item) => (
            <div className="kp-preview-item" key={item}>
              <div className="kp-preview-dot">✓</div>
              <span>{item}</span>
            </div>
          ))
        ) : (
          <small>Geen kernpunten</small>
        )}
      </div>
    );
  }

  if (block.type === "knowledge_cards") {
    const cards = Array.isArray(block.cards) ? block.cards.slice(0, 3) : [];

    return (
      <div className="knowledge-preview-list">
        {cards.length ? (
          cards.map((card: any, index: number) => (
            <div className="knowledge-preview-item" key={s(card?.id) || index}>
              <strong>{s(card?.title) || "Titel"}</strong>
              <span>{s(card?.text) || "Korte uitleg"}</span>
            </div>
          ))
        ) : (
          <small>Geen kenniskaarten</small>
        )}
      </div>
    );
  }

  if (block.type === "callout") {
    const tone = normalizeTone(block.tone);
    const content = s(block.content || block.markdown);
    const icon = tone === "warning" ? "!" : tone === "tip" ? "i" : "i";

    return (
      <div className={`callout-inline callout-inline-${tone}`}>
        <span>{icon}</span>
        <p>{content ? truncate(content, 120) : "Geen callout tekst"}</p>
      </div>
    );
  }

  if (block.type === "hero") {
    const color = s(block.background_color) || "green";
    const gradient = getHeroPreviewGradient(color);

    return (
      <div className="hero-inline" style={{ background: gradient }}>
        <strong>{s(block.title) || "Hero titel"}</strong>
        {s(block.subtitle) ? <span>{s(block.subtitle)}</span> : null}
      </div>
    );
  }

  if (block.type === "heading") {
    return (
      <div className="heading-inline-preview">
        <span>H{normalizeHeadingLevel(block.level)}</span>
        <strong>{s(block.text) || "Heading"}</strong>
      </div>
    );
  }

  if (block.type === "section_header" || block.type === "section_heading") {
    return (
      <div className="section-header-preview">
        <div className="shp-line" />
        <span className="shp-title">{s(block.title) || "Sectielijn"}</span>
        <div className="shp-line" />
      </div>
    );
  }

  if (block.type === "paragraph") {
    return <small>{plainTextPreview(s(block.markdown), 100) || "Geen tekst"}</small>;
  }

  if (block.type === "video") {
    return <span className="muted-pill">{s(block.url) || "Geen video URL"}</span>;
  }

  if (block.type === "audio") {
    return <span className="muted-pill">{s(block.title || block.file_name || block.file_url || block.url) || "Geen audio"}</span>;
  }

  return <small>{getBlockSummary(block)}</small>;
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
          <TextField label="Ondertitel" value={s(block.subtitle)} onChange={(subtitle) => onChange({ ...block, subtitle })} />
        </div>
      );
    case "heading":
      return (
        <div className="form-stack">
          <TextField label="Tekst" value={s(block.text)} onChange={(text) => onChange({ ...block, text })} />
          <label className="field">
            <span>Niveau</span>
            <select
              value={normalizeHeadingLevel(block.level)}
              onChange={(event) => onChange({ ...block, level: Number(event.target.value) })}
            >
              <option value={1}>H1</option>
              <option value={2}>H2</option>
              <option value={3}>H3</option>
              <option value={4}>H4</option>
              <option value={5}>H5</option>
              <option value={6}>H6</option>
            </select>
          </label>
        </div>
      );
    case "section_header":
    case "section_heading":
      return (
        <div className="form-stack">
          <TextField label="Titel" value={s(block.title)} onChange={(title) => onChange({ ...block, title })} />
          <TextField label="Ondertitel" value={s(block.subtitle)} onChange={(subtitle) => onChange({ ...block, subtitle })} />
        </div>
      );
    case "paragraph":
      return <TextareaField label="Markdown" value={s(block.markdown)} onChange={(markdown) => onChange({ ...block, markdown })} />;
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
    case "key_takeaways":
    case "knowledge_cards":
    case "checklist":
      return block.type === "knowledge_cards" ? (
        <TextareaField
          label="Raw kaarten JSON"
          value={JSON.stringify(block.cards ?? [], null, 2)}
          onChange={(value) => {
            try {
              onChange({ ...block, cards: JSON.parse(value || "[]") });
            } catch {
              onChange(block);
            }
          }}
        />
      ) : (
        <ListField label="Kernpunten" values={block.items} onChange={(items) => onChange({ ...block, items })} />
      );
    case "quiz_multiple_choice":
      return <ChoiceFields block={block} multiple={false} onChange={onChange} />;
    case "quiz_multiple_select":
      return <ChoiceFields block={block} multiple onChange={onChange} />;
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
          <TextareaField label="Guidance" value={s(block.guidance)} onChange={(guidance) => onChange({ ...block, guidance })} rows={3} />
        </div>
      );
    case "video":
      return (
        <div className="form-stack">
          <TextField label="Titel" value={s(block.title)} onChange={(title) => onChange({ ...block, title })} />
          <TextField label="URL" value={s(block.url)} onChange={(url) => onChange({ ...block, url })} />
          <TextareaField label="Transcript" value={s(block.transcript_markdown)} onChange={(transcript_markdown) => onChange({ ...block, transcript_markdown })} rows={3} />
        </div>
      );
    case "audio":
      return (
        <div className="form-stack">
          <TextField label="Titel" value={s(block.title)} onChange={(title) => onChange({ ...block, title })} />
          <TextField label="Bestandsnaam" value={s(block.file_name)} onChange={(file_name) => onChange({ ...block, file_name })} />
          <TextField label="Audio URL" value={s(block.file_url || block.url)} onChange={(file_url) => onChange({ ...block, file_url, url: file_url })} />
        </div>
      );
    case "download":
      return (
        <div className="form-stack">
          <TextField label="Titel" value={s(block.title)} onChange={(title) => onChange({ ...block, title })} />
          <TextField label="Bestands-URL" value={s(block.url)} onChange={(url) => onChange({ ...block, url })} />
          <TextareaField label="Omschrijving" value={s(block.description)} onChange={(description) => onChange({ ...block, description })} rows={3} />
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
  const options = normalizeOptions(block.options);
  const selectedIds = new Set(
    multiple
      ? Array.isArray(block.correct_option_ids)
        ? block.correct_option_ids.map(String)
        : []
      : [s(block.correct_option_id)].filter(Boolean),
  );

  function updateOptions(nextOptions: ChoiceOption[]) {
    onChange({ ...block, options: nextOptions });
  }

  function updateOption(index: number, patch: Partial<ChoiceOption>) {
    updateOptions(
      options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    );
  }

  function addOption() {
    const nextId = nextOptionId(options);
    updateOptions([...options, { id: nextId, label: `Optie ${nextId.toUpperCase()}` }]);
  }

  function toggleCorrect(optionId: string) {
    if (multiple) {
      const nextIds = new Set(selectedIds);
      if (nextIds.has(optionId)) {
        nextIds.delete(optionId);
      } else {
        nextIds.add(optionId);
      }
      onChange({ ...block, correct_option_ids: Array.from(nextIds) });
      return;
    }

    onChange({ ...block, correct_option_id: optionId });
  }

  return (
    <div className="form-stack">
      <TextareaField label="Vraag" value={s(block.question)} onChange={(question) => onChange({ ...block, question })} />
      <div className="choice-editor">
        <div className="choice-editor-heading">
          <span>Opties</span>
          <button type="button" onClick={addOption}>+ Optie</button>
        </div>
        {options.map((option, index) => (
          <div className="choice-option-row compact-choice-row" key={`${option.id}-${index}`}>
            <label className="choice-correct-toggle">
              <input
                checked={selectedIds.has(option.id)}
                onChange={() => toggleCorrect(option.id)}
                type={multiple ? "checkbox" : "radio"}
              />
              <span>Correct</span>
            </label>
            <label className="field option-label-field">
              <span>Antwoord</span>
              <input
                value={option.label}
                onChange={(event) => updateOption(index, { label: event.target.value })}
              />
            </label>
          </div>
        ))}
      </div>
      <TextareaField label="Uitleg" value={s(block.explanation)} onChange={(explanation) => onChange({ ...block, explanation })} rows={3} />
    </div>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        onChange={(event) => onChange(event.target.value)}
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
  rows = 5,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  rows?: number;
  value: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea onChange={(event) => onChange(event.target.value)} rows={rows} value={value} />
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
  const items = Array.isArray(values) ? values.map(String) : [];
  return (
    <div className="form-stack list-field">
      <div className="choice-editor-heading">
        <span>{label}</span>
        <button type="button" onClick={() => onChange([...items, "Nieuw kernpunt"])}>
          + Punt
        </button>
      </div>
      {items.map((item, index) => (
        <input
          key={`${index}-${item}`}
          value={item}
          onChange={(event) =>
            onChange(items.map((current, itemIndex) => (itemIndex === index ? event.target.value : current)))
          }
        />
      ))}
    </div>
  );
}

function toFormData(pageId: string, courseCode: string, pageCode: string, draft: PageDraft) {
  const formData = new FormData();
  formData.set("pageId", pageId);
  formData.set("courseCode", courseCode);
  formData.set("pageCode", pageCode);
  formData.set("title", draft.title);
  formData.set("summary", draft.summary);
  formData.set("content", JSON.stringify(draft.content));
  formData.set("pageType", draft.pageType);
  formData.set("estimatedMinutes", String(draft.estimatedMinutes));
  formData.set("isRequired", String(draft.isRequired));
  formData.set("status", draft.status);
  return formData;
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
  if (block.type === "key_takeaways") {
    return Array.isArray(block.items) ? `${block.items.length} items` : "Geen items";
  }
  if (block.type === "knowledge_cards") {
    return Array.isArray(block.cards) ? `${block.cards.length} kaarten` : "Geen kaarten";
  }
  if (block.type === "checklist") {
    const items = normalizeChecklistItems(block.items);
    return items.length ? `${items.length} actiepunten` : "Geen actiepunten";
  }
  const text =
    s(block.subtitle) ||
    s(block.markdown) ||
    s(block.description) ||
    s(block.explanation) ||
    s(block.url) ||
    s(block.caption);
  return text ? truncate(text, 140) : "Klik om eigenschappen te bewerken";
}

function normalizeChecklistItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (typeof item === "string") {
        return { id: `item-${index + 1}`, label: item, required: true };
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return {
          id: s(record.id) || `item-${index + 1}`,
          label: s(record.label),
          required: record.required !== false,
        };
      }
      return null;
    })
    .filter((item): item is { id: string; label: string; required: boolean } => Boolean(item));
}

function normalizeAccordionItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return {
          id: s(record.id) || `item-${index + 1}`,
          question: s(record.question),
          answer: s(record.answer),
        };
      }
      return null;
    })
    .filter((item): item is { id: string; question: string; answer: string } => Boolean(item));
}

function normalizeImageWidth(value: unknown): "small" | "medium" | "full" {
  return value === "small" || value === "medium" || value === "full" ? value : "full";
}

function normalizeTimelineItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return {
          id: s(record.id) || `item-${index + 1}`,
          date: s(record.date),
          title: s(record.title),
          description: s(record.description),
          highlight: Boolean(record.highlight),
        };
      }
      return null;
    })
    .filter((item): item is { id: string; date: string; title: string; description: string; highlight: boolean } => Boolean(item));
}

function normalizeComparisonColor(value: unknown): "green" | "red" | "blue" | "neutral" {
  return value === "green" || value === "red" || value === "blue" || value === "neutral"
    ? value
    : "neutral";
}

function normalizeScenarioChoices(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((choice, index) => {
      if (choice && typeof choice === "object") {
        const record = choice as Record<string, unknown>;
        return {
          id: s(record.id) || `choice-${index + 1}`,
          label: s(record.label),
          consequence: s(record.consequence),
          isRecommended: Boolean(record.isRecommended ?? record.is_recommended),
        };
      }
      return null;
    })
    .filter((choice): choice is { id: string; label: string; consequence: string; isRecommended: boolean } => Boolean(choice));
}

function truncate(value: string, maxLength: number) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength - 1)}...` : compact;
}

function plainTextPreview(value: string, maxLength: number) {
  const plain = value
    .replace(/[#*_`>~-]/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return truncate(plain, maxLength);
}

function getHeroPreviewGradient(color: string) {
  const gradients: Record<string, string> = {
    bright: "linear-gradient(135deg, #00a1da 0%, #7dd0ff 100%)",
    dark: "linear-gradient(135deg, #001e2b 0%, #00658b 100%)",
    muted: "linear-gradient(135deg, #396379 0%, #6993aa 100%)",
    primary: "linear-gradient(135deg, #00658b 0%, #00a1da 100%)",
    soft: "linear-gradient(135deg, #bae6ff 0%, #c4e7ff 100%)",
  };

  if (color === "green" || color === "blue") return gradients.primary;
  if (color === "purple" || color === "amber") return gradients.bright;
  return gradients[color] ?? gradients.primary;
}

function createBlock(type: string): EditableBlock {
  const id = `block-${Date.now()}`;
  switch (type) {
    case "hero":
      return { id, type, title: "Nieuwe hero", subtitle: "", background_color: "primary" };
    case "heading":
      return { id, type, text: "Nieuwe heading", level: 2 };
    case "section_header":
    case "section_heading":
      return { id, type: "section_heading", title: "Nieuwe sectielijn", subtitle: "" };
    case "callout":
      return { id, type, tone: "info", markdown: "Nieuwe callout." };
    case "quote":
      return { id, type, quote: "", author: "", role: "", source: "", source_url: "" };
    case "accordion":
      return { id, type, title: "Nieuwe accordion", items: [{ id: "item-a", question: "", answer: "" }], allow_multiple_open: false };
    case "image":
      return { id, type, url: "", alt: "", caption: "", width: "full" };
    case "timeline":
      return { id, type, title: "Nieuwe tijdlijn", items: [{ id: "item-a", date: "", title: "", description: "", highlight: false }] };
    case "comparison":
      return { id, type, title: "", left_label: "✓ Toegestaan", right_label: "✕ Verboden", left_items: [""], right_items: [""], left_color: "green", right_color: "red" };
    case "scenario":
      return { id, type, situation: "", question: "", choices: [{ id: "choice-a", label: "", consequence: "", is_recommended: false }, { id: "choice-b", label: "", consequence: "", is_recommended: false }] };
    case "reflection":
      return { id, type, prompt: "", placeholder: "Schrijf hier je reflectie...", min_words: undefined, save_personal: false };
    case "progress_check":
      return { id, type, question: "", scale: 5, label_low: "Helemaal niet zeker", label_high: "Volledig zeker", show_labels: true };
    case "key_takeaways":
      return { id, type, title: "Kernpunten", items: ["Eerste kernpunt"] };
    case "knowledge_cards":
      return {
        id,
        type,
        cards: [
          { id: "card-a", title: "Wettelijke plicht", text: "EU AI Act Article 4 maakt AI literacy een verplichte basisnorm." },
          { id: "card-b", title: "Deadline", text: "De verplichting is officieel van kracht sinds 2 februari 2025." },
          { id: "card-c", title: "Methode", text: "Trainingen moeten risk-based zijn en passen bij de specifieke rol." },
        ],
      };
    case "checklist":
      return { id, type, title: "Nieuwe checklist", items: [{ id: "item-a", label: "Eerste actiepunt", required: true }], require_all: true };
    case "case_lab":
      return { id, type, title: "Nieuwe case", context: "", challenge: "", question: "", hints: [], reflection_prompt: "" };
    case "download":
      return { id, type, title: "Nieuwe download", url: "", description: "" };
    case "audio":
      return { id, type, title: "Nieuwe audio", file_url: "", url: "", file_name: "audio.mp3" };
    case "slide_deck":
      return { id, type, title: "Nieuwe slide deck", slides: [], show_thumbnails: true };
    case "iframe":
      return { id, type, title: "Nieuwe embed", url: "", height: 500, provider: "", allow_fullscreen: true };
    case "embed_h5p":
      return { id, type, title: "Nieuwe H5P activiteit", url: "", height: 400, activity_type: "" };
    case "quiz_multiple_choice":
      return { id, type, question: "Nieuwe vraag?", options: optionsFromText("Optie A\nOptie B"), correct_option_id: "a" };
    case "quiz_multiple_select":
      return { id, type, question: "Nieuwe vraag?", options: optionsFromText("Optie A\nOptie B"), correct_option_ids: ["a"] };
    case "quiz_true_false":
      return { id, type, question: "Nieuwe stelling?", correct_answer: true };
    case "quiz_essay":
      return { id, type, question: "Nieuwe essayvraag?", min_words: 50, max_words: 200, manual_review_required: true };
    case "short_answer":
      return { id, type, question: "Nieuwe invulvraag?", placeholder: "Schrijf je antwoord." };
    case "video":
      return { id, type, title: "Nieuwe video", url: "" };
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

function normalizeOptions(value: unknown): ChoiceOption[] {
  if (!Array.isArray(value)) {
    return optionsFromText("Optie A\nOptie B");
  }

  const options = value
    .map((option, index) => ({
      id: s((option as ChoiceOption)?.id) || String.fromCharCode(97 + index),
      label: s((option as ChoiceOption)?.label) || `Optie ${index + 1}`,
    }))
    .filter((option) => option.label);

  return options.length ? options : optionsFromText("Optie A\nOptie B");
}

function nextOptionId(options: ChoiceOption[]) {
  const usedIds = new Set(options.map((option) => option.id));
  for (let index = 0; index < 26; index += 1) {
    const id = String.fromCharCode(97 + index);
    if (!usedIds.has(id)) return id;
  }

  return `optie-${options.length + 1}`;
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

function stopAnd(event: MouseEvent<HTMLButtonElement>, action: () => void) {
  event.stopPropagation();
  action();
}

function s(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function n(value: string) {
  return Number(value) || undefined;
}

function normalizeHeadingLevel(value: unknown): 1 | 2 | 3 | 4 | 5 | 6 {
  const level = Number(value);
  return level === 1 || level === 2 || level === 3 || level === 4 || level === 5 || level === 6 ? level : 2;
}

function normalizeTone(value: unknown): "tip" | "info" | "warning" {
  if (value === "tip" || value === "warning") return value;
  return "info";
}
