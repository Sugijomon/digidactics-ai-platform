"use client";

import Link from "next/link";
import { useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

export function QuoteBlockModal({
  blockNumber,
  initialAuthor = "",
  initialQuote = "",
  initialRole = "",
  initialSource = "",
  initialSourceUrl = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialQuote?: string;
  initialAuthor?: string;
  initialRole?: string;
  initialSource?: string;
  initialSourceUrl?: string;
  onClose: () => void;
  onSave: (data: {
    quote: string;
    author?: string;
    role?: string;
    source?: string;
    source_url?: string;
  }) => void;
}) {
  const [quote, setQuote] = useState(initialQuote);
  const [author, setAuthor] = useState(initialAuthor);
  const [role, setRole] = useState(initialRole);
  const [source, setSource] = useState(initialSource);
  const [sourceUrl, setSourceUrl] = useState(initialSourceUrl);
  const [showValidation, setShowValidation] = useState(false);
  const canSave = Boolean(quote.trim());

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      quote: quote.trim(),
      author: author.trim() || undefined,
      role: role.trim() || undefined,
      source: source.trim() || undefined,
      source_url: sourceUrl.trim() || undefined,
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Quote"
      description="Pas het citaat van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Quote Block"
    >
      <div className="modal-field">
        <div className="m-label">Voorvertoning</div>
        <div className="quote-preview">
          <div className="quote-mark">"</div>
          <blockquote className="quote-text">
            {quote || <em className="empty">Citaattekst verschijnt hier...</em>}
          </blockquote>
          {author || role || source ? (
            <div className="quote-attribution">
              {author ? <strong>{author}</strong> : null}
              {role ? <span> - {role}</span> : null}
              {source ? (
                <span className="quote-source">
                  {sourceUrl ? (
                    <Link href={sourceUrl} rel="noopener" target="_blank">
                      {source}
                    </Link>
                  ) : (
                    source
                  )}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="quote-text">
          Citaat <span className="m-label-opt">verplicht</span>
        </label>
        <textarea
          className={showValidation && !quote.trim() ? "m-textarea m-input-error" : "m-textarea"}
          id="quote-text"
          onChange={(event) => {
            setQuote(event.target.value);
            setShowValidation(false);
          }}
          placeholder="Voer de volledige citaattekst in..."
          rows={4}
          value={quote}
        />
        <p className="m-hint">Gebruik de exacte bewoordingen - geen parafrase.</p>
      </div>

      <div className="quiz-settings">
        <div className="quiz-setting">
          <div className="quiz-setting-label">Auteur</div>
          <input
            className="m-input"
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="Bijv. European Commission"
            type="text"
            value={author}
          />
        </div>
        <div className="quiz-setting">
          <div className="quiz-setting-label">Functie / rol</div>
          <input
            className="m-input"
            onChange={(event) => setRole(event.target.value)}
            placeholder="Bijv. DG CONNECT"
            type="text"
            value={role}
          />
        </div>
      </div>

      <div>
        <div className="quiz-settings">
          <div className="quiz-setting">
            <div className="quiz-setting-label">Bron</div>
            <input
              className="m-input"
              onChange={(event) => setSource(event.target.value)}
              placeholder="Bijv. EU AI Act, Article 4"
              type="text"
              value={source}
            />
          </div>
          <div className="quiz-setting">
            <div className="quiz-setting-label">Bron URL</div>
            <input
              className="m-input"
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://..."
              type="url"
              value={sourceUrl}
            />
          </div>
        </div>
        <p className="m-hint">Als URL ingevuld wordt de bron een klikbare link in de les.</p>
      </div>
    </ModalShell>
  );
}
