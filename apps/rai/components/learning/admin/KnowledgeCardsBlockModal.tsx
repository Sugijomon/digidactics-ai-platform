"use client";

import { useMemo, useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

type KnowledgeCard = { id: string; title: string; text: string };

export function KnowledgeCardsBlockModal({
  blockNumber,
  initialCards,
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialCards?: KnowledgeCard[];
  onClose: () => void;
  onSave: (data: { cards: KnowledgeCard[] }) => void;
}) {
  const [cards, setCards] = useState<KnowledgeCard[]>(
    initialCards?.length
      ? initialCards
      : [
          { id: "card-a", title: "Wettelijke plicht", text: "" },
          { id: "card-b", title: "Deadline", text: "" },
          { id: "card-c", title: "Methode", text: "" },
        ],
  );
  const [showValidation, setShowValidation] = useState(false);

  const filledCards = useMemo(
    () => cards.filter((card) => card.title.trim() || card.text.trim()),
    [cards],
  );
  const canSave = filledCards.some((card) => card.title.trim() && card.text.trim());

  function updateCard(index: number, patch: Partial<KnowledgeCard>) {
    setCards(cards.map((card, cardIndex) => (cardIndex === index ? { ...card, ...patch } : card)));
  }

  function addCard() {
    setCards([...cards, { id: `card-${Date.now()}`, title: "", text: "" }]);
  }

  function removeCard(index: number) {
    if (cards.length <= 1) return;
    setCards(cards.filter((_, cardIndex) => cardIndex !== index));
  }

  function handleSave() {
    const normalized = filledCards
      .map((card) => ({
        id: card.id || `card-${Date.now()}`,
        title: card.title.trim(),
        text: card.text.trim(),
      }))
      .filter((card) => card.title && card.text);

    if (!normalized.length) {
      setShowValidation(true);
      return;
    }

    onSave({ cards: normalized });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Kenniskaarten"
      description="Maak compacte redactionele kenniskaarten."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Kenniskaarten bewerken"
    >
      <div className="modal-field">
        <span className="preview-label">Voorvertoning</span>
        <div className="knowledge-cards-preview">
          {filledCards.length ? (
            filledCards.slice(0, 3).map((card) => (
              <article className="knowledge-card-preview" key={card.id}>
                <strong>{card.title || "Titel"}</strong>
                <p>{card.text || "Korte uitleg..."}</p>
              </article>
            ))
          ) : (
            <p className="kp-empty">Voeg kaarten toe om de preview te zien.</p>
          )}
        </div>
      </div>

      <div className="modal-field">
        <div className="item-heading">
          <span className="m-label">
            Kaarten <span className="m-label-opt">min. 1 volledig</span>
          </span>
          <button className="add-btn" onClick={addCard} type="button">
            + Kaart toevoegen
          </button>
        </div>

        <div className="knowledge-card-editor-list">
          {cards.map((card, index) => (
            <div className="knowledge-card-editor" key={card.id}>
              <div className="item-heading">
                <span className="item-num">Kaart {index + 1}</span>
                <button
                  className="remove-btn"
                  disabled={cards.length <= 1}
                  onClick={() => removeCard(index)}
                  type="button"
                >
                  x
                </button>
              </div>
              <input
                className={showValidation && !canSave ? "m-input m-input-error" : "m-input"}
                onChange={(event) => {
                  updateCard(index, { title: event.target.value });
                  setShowValidation(false);
                }}
                placeholder="Titel, bijv. Wettelijke plicht"
                value={card.title}
              />
              <textarea
                className={showValidation && !canSave ? "m-textarea compact m-input-error" : "m-textarea compact"}
                onChange={(event) => {
                  updateCard(index, { text: event.target.value });
                  setShowValidation(false);
                }}
                placeholder="Korte uitleg..."
                rows={3}
                value={card.text}
              />
            </div>
          ))}
        </div>
        {showValidation && !canSave ? (
          <span className="field-error">Vul minimaal een kaart met titel en tekst in.</span>
        ) : null}
      </div>
    </ModalShell>
  );
}
