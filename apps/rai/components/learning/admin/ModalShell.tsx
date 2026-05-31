import type { ReactNode } from "react";

export function ModalShell({
  blockNumber,
  blockType,
  children,
  description,
  onClose,
  onSave,
  saveDisabled = false,
  saveLabel = "Opslaan",
  title,
}: {
  title: string;
  description: string;
  blockNumber?: number;
  blockType?: string;
  onClose: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button aria-label="Sluiten" className="modal-x" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <div className="modal-hr" />

        <div className="modal-body">{children}</div>

        <div className="modal-foot">
          <div className="modal-meta">
            {blockNumber !== undefined ? <span className="meta-badge">Blok {blockNumber}</span> : null}
            {blockType ? <span className="meta-badge">{blockType}</span> : null}
          </div>
          <div className="modal-actions">
            <button className="button button-secondary" onClick={onClose} type="button">
              Annuleren
            </button>
            <button className="button button-primary" disabled={saveDisabled} onClick={onSave} type="button">
              {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
