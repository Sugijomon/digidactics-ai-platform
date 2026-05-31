"use client";

import { useRef, useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";
import { uploadLessonFile } from "@/components/learning/admin/uploadLessonFile";
import { SlideDeckPlayer } from "@/components/learning/SlideDeckPlayer";

type SlideDeckInteraction =
  | { type: "none" }
  | { type: "reflection"; prompt: string; placeholder?: string }
  | {
      type: "multiple_choice";
      question: string;
      options: Array<{ id: string; label: string; is_correct: boolean }>;
      feedback_correct?: string;
      feedback_incorrect?: string;
    };

type SlideDeckSlide = {
  id: string;
  title?: string;
  url: string;
  alt?: string;
  caption?: string;
  notes?: string;
  interaction?: SlideDeckInteraction;
};

export function SlideDeckBlockModal({
  blockNumber,
  initialSlides = [],
  initialTitle = "",
  initialShowThumbnails = true,
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialTitle?: string;
  initialSlides?: SlideDeckSlide[];
  initialShowThumbnails?: boolean;
  onClose: () => void;
  onSave: (data: { title?: string; slides: SlideDeckSlide[]; show_thumbnails: boolean }) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [slides, setSlides] = useState<SlideDeckSlide[]>(initialSlides);
  const [selectedId, setSelectedId] = useState(initialSlides[0]?.id ?? "");
  const [showThumbnails, setShowThumbnails] = useState(initialShowThumbnails);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const selectedSlide = slides.find((slide) => slide.id === selectedId) ?? slides[0];
  const validationErrors = validateSlides(slides);
  const canSave = slides.length > 0 && validationErrors.length === 0 && !uploading;

  async function uploadSlides(files: FileList | File[]) {
    const allFiles = Array.from(files);
    const imageFiles = allFiles.filter(isSlideImage);
    const pptxFiles = allFiles.filter(isPptxFile);
    const rejectedFiles = allFiles.filter((file) => !isSlideImage(file) && !isPptxFile(file));

    if (rejectedFiles.length) {
      setUploadError("Gebruik PNG, JPG, WebP of PPTX. Andere bestanden zijn overgeslagen.");
    }

    if (!imageFiles.length && !pptxFiles.length) {
      setUploadError("Kies minimaal een PNG, JPG, WebP of PPTX-bestand.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setShowValidation(false);

    try {
      const uploadedSlides: SlideDeckSlide[] = [];
      for (const file of pptxFiles) {
        uploadedSlides.push(...(await importPptxSlides(file)));
      }

      for (const file of imageFiles) {
        const url = await uploadLessonFile(file);
        uploadedSlides.push({
          id: `slide-${crypto.randomUUID()}`,
          url,
          title: file.name.replace(/\.[^.]+$/, ""),
          alt: file.name.replace(/\.[^.]+$/, ""),
        });
      }

      setSlides((current) => {
        const next = [...current, ...uploadedSlides];
        if (!selectedId && uploadedSlides[0]) setSelectedId(uploadedSlides[0].id);
        return next;
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Uploaden is niet gelukt.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function replaceSlideImage(slideId: string, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    if (!isSlideImage(file)) {
      setUploadError("Gebruik PNG, JPG of WebP als slide-afbeelding.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const url = await uploadLessonFile(file);
      updateSlide(slideId, {
        url,
        alt: slides.find((slide) => slide.id === slideId)?.alt || file.name.replace(/\.[^.]+$/, ""),
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Afbeelding vervangen is niet gelukt.");
    } finally {
      setUploading(false);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  }

  function updateSlide(id: string, patch: Partial<SlideDeckSlide>) {
    setSlides((current) => current.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)));
  }

  function updateInteraction(id: string, patch: SlideDeckInteraction) {
    updateSlide(id, { interaction: patch });
  }

  function updateMultipleChoiceOption(slide: SlideDeckSlide, optionId: string, patch: { label?: string; is_correct?: boolean }) {
    const interaction = normalizeInteraction(slide.interaction);
    if (interaction.type !== "multiple_choice") return;

    updateInteraction(slide.id, {
      ...interaction,
      options: interaction.options.map((option) => ({
        ...option,
        ...(option.id === optionId ? patch : {}),
        is_correct: patch.is_correct === true ? option.id === optionId : option.is_correct,
      })),
    });
  }

  function addMultipleChoiceOption(slide: SlideDeckSlide) {
    const interaction = normalizeInteraction(slide.interaction);
    if (interaction.type !== "multiple_choice") return;

    updateInteraction(slide.id, {
      ...interaction,
      options: [...interaction.options, { id: `option-${crypto.randomUUID()}`, label: "", is_correct: false }],
    });
  }

  function removeMultipleChoiceOption(slide: SlideDeckSlide, optionId: string) {
    const interaction = normalizeInteraction(slide.interaction);
    if (interaction.type !== "multiple_choice" || interaction.options.length <= 2) return;

    updateInteraction(slide.id, {
      ...interaction,
      options: interaction.options.filter((option) => option.id !== optionId),
    });
  }

  function moveSlide(id: string, direction: -1 | 1) {
    setSlides((current) => {
      const index = current.findIndex((slide) => slide.id === id);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      const [slide] = next.splice(index, 1);
      next.splice(targetIndex, 0, slide);
      return next;
    });
  }

  function removeSlide(id: string) {
    setSlides((current) => {
      const next = current.filter((slide) => slide.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? "");
      return next;
    });
  }

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      title: title.trim() || undefined,
      slides: slides.map(normalizeSlide),
      show_thumbnails: showThumbnails,
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Presentatie"
      description="Upload slides, zet ze in de juiste volgorde en voeg interactie per slide toe."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={uploading}
      title="Presentatie bewerken"
    >
      <div className="modal-field">
        <label className="m-label" htmlFor="slide-deck-title">
          Titel <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="slide-deck-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Bijv. Shadow AI presentatie"
          type="text"
          value={title}
        />
      </div>

      <div className="slide-deck-editor-tabs" aria-label="Slide deck editor stappen">
        <span className={slides.length ? "done" : "active"}>1. Upload</span>
        <span className={selectedSlide ? "active" : ""}>2. Beheer</span>
        <span className={canSave ? "done" : ""}>3. Preview</span>
      </div>

      <div className="modal-field">
        <span className="m-label">
          Slides <span className="m-label-opt">PNG/JPG/WebP of PPTX met afbeeldingen</span>
        </span>
        <label
          className={[
            "upload-zone",
            "slide-deck-upload",
            dragging ? "dragging" : "",
            showValidation && !slides.length ? "m-input-error" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
            setDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            uploadSlides(event.dataTransfer.files);
          }}
        >
          <input
            accept="image/png,image/jpeg,image/webp,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            multiple
            onChange={(event) => {
              if (event.target.files) uploadSlides(event.target.files);
            }}
            ref={inputRef}
            style={{ display: "none" }}
            type="file"
          />
          <div className="upload-icon">+</div>
          <p>{uploading ? "Slides importeren..." : "Klik of sleep slides of PPTX hierheen"}</p>
          <small>Sleep losse afbeeldingen of een PPTX. Daarna kun je slides ordenen en interacties toevoegen.</small>
        </label>
        {uploadError ? <p className="m-hint m-error">{uploadError}</p> : null}
        {showValidation && !slides.length ? <p className="field-error">Voeg minimaal een slide toe.</p> : null}
        {showValidation && validationErrors.length ? (
          <ul className="slide-deck-validation" aria-live="polite">
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {slides.length ? (
        <div className="slide-deck-modal-layout">
          <div className="slide-deck-modal-main">
            {selectedSlide ? (
              <figure className="slide-deck-preview">
                <img alt={selectedSlide.alt || "Slide preview"} src={selectedSlide.url} />
                <figcaption>
                  {selectedSlide.title || `Slide ${slides.findIndex((slide) => slide.id === selectedSlide.id) + 1}`} ·{" "}
                  {slides.findIndex((slide) => slide.id === selectedSlide.id) + 1} van {slides.length}
                </figcaption>
              </figure>
            ) : null}
            <div className="slide-deck-thumb-grid">
              {slides.map((slide, index) => (
                <div
                  className={slide.id === selectedSlide?.id ? "slide-deck-thumb active" : "slide-deck-thumb"}
                  key={slide.id}
                >
                  <button
                    aria-label={`Slide ${index + 1} selecteren`}
                    onClick={() => setSelectedId(slide.id)}
                    type="button"
                  >
                    <img alt={slide.alt || `Slide ${index + 1}`} src={slide.url} />
                    <span>{index + 1}</span>
                  </button>
                  <div className="slide-deck-thumb-actions">
                    <button
                      aria-label={`Slide ${index + 1} naar links`}
                      disabled={index === 0}
                      onClick={() => moveSlide(slide.id, -1)}
                      type="button"
                    >
                      ←
                    </button>
                    <button
                      aria-label={`Slide ${index + 1} naar rechts`}
                      disabled={index === slides.length - 1}
                      onClick={() => moveSlide(slide.id, 1)}
                      type="button"
                    >
                      →
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="m-hint">Gebruik de pijlen onder elke thumbnail of in het zijpaneel om de volgorde te wijzigen.</p>
            <div className="slide-deck-editor-preview" aria-label="Preview voor deelnemers">
              <strong>Preview voor deelnemer</strong>
              <SlideDeckPlayer
                block={{
                  id: "editor-preview",
                  type: "slide_deck",
                  title: title.trim() || "Presentatie",
                  slides: slides.map(normalizeSlide),
                  show_thumbnails: showThumbnails,
                }}
              />
            </div>
          </div>

          {selectedSlide ? (
            <aside className="slide-deck-side-panel">
              <strong>Slide {slides.findIndex((slide) => slide.id === selectedSlide.id) + 1} instellingen</strong>
              <div className="modal-field">
                <label className="m-label" htmlFor="slide-title">
                  Slidetitel <span className="m-label-opt">optioneel</span>
                </label>
                <input
                  className="m-input"
                  id="slide-title"
                  onChange={(event) => updateSlide(selectedSlide.id, { title: event.target.value })}
                  placeholder="Bijv. Risico herkennen"
                  type="text"
                  value={selectedSlide.title ?? ""}
                />
              </div>
              <div className="modal-field">
                <label className="m-label" htmlFor="slide-alt">
                  Alt-tekst <span className="m-label-opt">verplicht</span>
                </label>
                <input
                  className={showValidation && !selectedSlide.alt?.trim() ? "m-input m-input-error" : "m-input"}
                  id="slide-alt"
                  onChange={(event) => updateSlide(selectedSlide.id, { alt: event.target.value })}
                  placeholder="Beschrijf kort wat er op de slide staat"
                  type="text"
                  value={selectedSlide.alt ?? ""}
                />
                {showValidation && !selectedSlide.alt?.trim() ? <p className="field-error">Alt-tekst is nodig voor toegankelijkheid.</p> : null}
              </div>
              <div className="modal-field">
                <label className="m-label" htmlFor="slide-caption">
                  Bijschrift
                </label>
                <input
                  className="m-input"
                  id="slide-caption"
                  onChange={(event) => updateSlide(selectedSlide.id, { caption: event.target.value })}
                  placeholder="Optioneel"
                  type="text"
                  value={selectedSlide.caption ?? ""}
                />
              </div>
              <div className="modal-field">
                <label className="m-label" htmlFor="slide-notes">
                  Notities <span className="m-label-opt">alleen editor</span>
                </label>
                <textarea
                  className="m-input"
                  id="slide-notes"
                  onChange={(event) => updateSlide(selectedSlide.id, { notes: event.target.value })}
                  placeholder="Interne notities of spreektekst voor deze slide."
                  rows={3}
                  value={selectedSlide.notes ?? ""}
                />
              </div>
              <div className="modal-field">
                <span className="m-label">Afbeelding</span>
                <input
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => replaceSlideImage(selectedSlide.id, event.target.files)}
                  ref={replaceInputRef}
                  type="file"
                />
                <p className="m-hint">Vervang alleen deze slide. PNG, JPG of WebP.</p>
              </div>

              <div className="modal-field">
                <label className="m-label" htmlFor="slide-interaction-type">
                  Interactie
                </label>
                <select
                  className="m-input"
                  id="slide-interaction-type"
                  onChange={(event) => {
                    if (event.target.value === "reflection") {
                      updateInteraction(selectedSlide.id, {
                        type: "reflection",
                        prompt: "Wat neem je mee uit deze slide?",
                        placeholder: "Schrijf je reflectie...",
                      });
                      return;
                    }

                    if (event.target.value === "multiple_choice") {
                      updateInteraction(selectedSlide.id, {
                        type: "multiple_choice",
                        question: "Welke uitspraak past het best bij deze slide?",
                        options: [
                          { id: `option-${crypto.randomUUID()}`, label: "Optie A", is_correct: true },
                          { id: `option-${crypto.randomUUID()}`, label: "Optie B", is_correct: false },
                        ],
                        feedback_correct: "Goed gezien.",
                        feedback_incorrect: "Bekijk de slide nog eens en probeer opnieuw.",
                      });
                      return;
                    }

                    updateInteraction(selectedSlide.id, { type: "none" });
                  }}
                  value={normalizeInteraction(selectedSlide.interaction).type}
                >
                  <option value="none">Geen interactie</option>
                  <option value="reflection">Reflectievraag</option>
                  <option value="multiple_choice">Meerkeuzevraag</option>
                </select>
              </div>

              <SlideInteractionFields
                addOption={() => addMultipleChoiceOption(selectedSlide)}
                interaction={normalizeInteraction(selectedSlide.interaction)}
                onChange={(interaction) => updateInteraction(selectedSlide.id, interaction)}
                removeOption={(optionId) => removeMultipleChoiceOption(selectedSlide, optionId)}
                updateOption={(optionId, patch) => updateMultipleChoiceOption(selectedSlide, optionId, patch)}
              />

              <div className="slide-deck-actions">
                <button disabled={slides.findIndex((slide) => slide.id === selectedSlide.id) === 0} onClick={() => moveSlide(selectedSlide.id, -1)} type="button">
                  Omhoog
                </button>
                <button disabled={slides.findIndex((slide) => slide.id === selectedSlide.id) === slides.length - 1} onClick={() => moveSlide(selectedSlide.id, 1)} type="button">
                  Omlaag
                </button>
                <button className="danger" onClick={() => removeSlide(selectedSlide.id)} type="button">
                  Verwijderen
                </button>
              </div>
              <label className="toggle-row">
                <div className="toggle-switch">
                  <input
                    checked={showThumbnails}
                    onChange={(event) => setShowThumbnails(event.target.checked)}
                    type="checkbox"
                  />
                  <span className="toggle-track">
                    <span className="toggle-thumb" />
                  </span>
                </div>
                <span className="toggle-label">Thumbnails tonen</span>
              </label>
            </aside>
          ) : null}
        </div>
      ) : null}
    </ModalShell>
  );
}

function SlideInteractionFields({
  addOption,
  interaction,
  onChange,
  removeOption,
  updateOption,
}: {
  addOption: () => void;
  interaction: SlideDeckInteraction;
  onChange: (interaction: SlideDeckInteraction) => void;
  removeOption: (optionId: string) => void;
  updateOption: (optionId: string, patch: { label?: string; is_correct?: boolean }) => void;
}) {
  if (interaction.type === "reflection") {
    return (
      <div className="slide-deck-interaction-fields">
        <div className="modal-field">
          <label className="m-label" htmlFor="slide-reflection-prompt">
            Reflectievraag
          </label>
          <textarea
            className="m-input"
            id="slide-reflection-prompt"
            onChange={(event) => onChange({ ...interaction, prompt: event.target.value })}
            placeholder="Vraag aan de deelnemer"
            rows={3}
            value={interaction.prompt}
          />
        </div>
        <div className="modal-field">
          <label className="m-label" htmlFor="slide-reflection-placeholder">
            Placeholder
          </label>
          <input
            className="m-input"
            id="slide-reflection-placeholder"
            onChange={(event) => onChange({ ...interaction, placeholder: event.target.value })}
            placeholder="Schrijf je antwoord..."
            type="text"
            value={interaction.placeholder ?? ""}
          />
        </div>
      </div>
    );
  }

  if (interaction.type === "multiple_choice") {
    return (
      <div className="slide-deck-interaction-fields">
        <div className="modal-field">
          <label className="m-label" htmlFor="slide-mc-question">
            Vraag
          </label>
          <textarea
            className="m-input"
            id="slide-mc-question"
            onChange={(event) => onChange({ ...interaction, question: event.target.value })}
            placeholder="Vraag bij deze slide"
            rows={3}
            value={interaction.question}
          />
        </div>
        <div className="slide-deck-options-editor">
          {interaction.options.map((option, index) => (
            <div className="slide-deck-option-row" key={option.id}>
              <label className="slide-deck-option-correct">
                <input
                  checked={option.is_correct}
                  onChange={(event) => updateOption(option.id, { is_correct: event.target.checked })}
                  type="checkbox"
                />
                Juist
              </label>
              <input
                className="m-input"
                onChange={(event) => updateOption(option.id, { label: event.target.value })}
                placeholder={`Optie ${index + 1}`}
                type="text"
                value={option.label}
              />
              <button
                aria-label={`Optie ${index + 1} verwijderen`}
                disabled={interaction.options.length <= 2}
                onClick={() => removeOption(option.id)}
                type="button"
              >
                x
              </button>
            </div>
          ))}
          <button className="slide-deck-add-option" onClick={addOption} type="button">
            Optie toevoegen
          </button>
        </div>
        <div className="modal-field">
          <label className="m-label" htmlFor="slide-feedback-correct">
            Feedback goed
          </label>
          <input
            className="m-input"
            id="slide-feedback-correct"
            onChange={(event) => onChange({ ...interaction, feedback_correct: event.target.value })}
            type="text"
            value={interaction.feedback_correct ?? ""}
          />
        </div>
        <div className="modal-field">
          <label className="m-label" htmlFor="slide-feedback-incorrect">
            Feedback fout
          </label>
          <input
            className="m-input"
            id="slide-feedback-incorrect"
            onChange={(event) => onChange({ ...interaction, feedback_incorrect: event.target.value })}
            type="text"
            value={interaction.feedback_incorrect ?? ""}
          />
        </div>
      </div>
    );
  }

  return null;
}

function normalizeSlide(slide: SlideDeckSlide): SlideDeckSlide {
  const interaction = normalizeInteraction(slide.interaction);

  return {
    ...slide,
    title: slide.title?.trim() || undefined,
    url: slide.url.trim(),
    alt: slide.alt?.trim() || undefined,
    caption: slide.caption?.trim() || undefined,
    notes: slide.notes?.trim() || undefined,
    interaction: interaction.type === "none" ? undefined : interaction,
  };
}

function normalizeInteraction(interaction?: SlideDeckInteraction): SlideDeckInteraction {
  if (!interaction || interaction.type === "none") return { type: "none" };

  if (interaction.type === "reflection") {
    return {
      type: "reflection",
      prompt: interaction.prompt.trim() || "Wat neem je mee uit deze slide?",
      placeholder: interaction.placeholder?.trim() || undefined,
    };
  }

  const options = interaction.options
    .map((option, index) => ({
      ...option,
      label: option.label.trim() || `Optie ${index + 1}`,
    }))
    .filter((option) => option.label);
  const correctOptionId = options.find((option) => option.is_correct)?.id ?? options[0]?.id;

  return {
    type: "multiple_choice",
    question: interaction.question.trim() || "Welke optie past het best bij deze slide?",
    options: options.length >= 2 && correctOptionId
      ? options.map((option) => ({ ...option, is_correct: option.id === correctOptionId }))
      : [
          { id: `option-${crypto.randomUUID()}`, label: "Optie A", is_correct: true },
          { id: `option-${crypto.randomUUID()}`, label: "Optie B", is_correct: false },
        ],
    feedback_correct: interaction.feedback_correct?.trim() || undefined,
    feedback_incorrect: interaction.feedback_incorrect?.trim() || undefined,
  };
}

function validateSlides(slides: SlideDeckSlide[]) {
  const errors: string[] = [];

  if (!slides.length) {
    errors.push("Voeg minimaal een slide toe.");
    return errors;
  }

  slides.forEach((slide, index) => {
    const label = slide.title?.trim() || `Slide ${index + 1}`;
    if (!slide.url?.trim()) {
      errors.push(`${label}: voeg een afbeelding toe.`);
    }
    if (!slide.alt?.trim()) {
      errors.push(`${label}: vul alt-tekst in voor toegankelijkheid.`);
    }

    const interaction = slide.interaction;
    if (!interaction || interaction.type === "none") return;

    if (interaction.type === "reflection" && !interaction.prompt.trim()) {
      errors.push(`${label}: vul de reflectievraag in.`);
    }

    if (interaction.type === "multiple_choice") {
      const filledOptions = interaction.options.filter((option) => option.label.trim());
      const correctCount = interaction.options.filter((option) => option.is_correct).length;

      if (!interaction.question.trim()) {
        errors.push(`${label}: vul de meerkeuzevraag in.`);
      }
      if (filledOptions.length < 2) {
        errors.push(`${label}: voeg minimaal twee antwoordopties toe.`);
      }
      if (correctCount !== 1) {
        errors.push(`${label}: kies precies één correct antwoord.`);
      }
    }
  });

  return Array.from(new Set(errors));
}

function isSlideImage(file: File) {
  return ["image/png", "image/jpeg", "image/webp"].includes(file.type);
}

function isPptxFile(file: File) {
  return (
    file.name.toLowerCase().endsWith(".pptx") ||
    file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  );
}

async function importPptxSlides(file: File): Promise<SlideDeckSlide[]> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/learning/admin/slide-decks/import-pptx", {
    body: formData,
    method: "POST",
  });

  const responseText = await response.text();
  const payload = parseImportResponse(responseText);

  if (!response.ok || !payload?.slides) {
    throw new Error(
      payload?.error ||
        `PPTX importeren is niet gelukt (${response.status}). ${responseText.slice(0, 160)}`.trim(),
    );
  }

  return payload.slides;
}

function parseImportResponse(value: string) {
  try {
    return JSON.parse(value) as { error?: string; slides?: SlideDeckSlide[] };
  } catch {
    return null;
  }
}
