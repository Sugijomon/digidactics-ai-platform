"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChecklistBlock } from "@digidactics/domain/learning";

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
}

export function ChecklistBlockPlayer({
  block,
  onCanProceed,
}: {
  block: ChecklistBlock;
  onCanProceed: (can: boolean) => void;
}) {
  const items = useMemo(() => normalizeItems(block.items), [block.items]);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const requiredItems = useMemo(() => items.filter((item) => item.required), [items]);
  const allRequiredChecked = requiredItems.every((item) => checked.has(item.id));
  const requireAll = block.require_all ?? true;
  const checkedCount = checked.size;
  const totalRequired = requiredItems.length;

  useEffect(() => {
    onCanProceed(requireAll ? allRequiredChecked : true);
  }, [allRequiredChecked, checked, onCanProceed, requireAll]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="block checklist-player">
      <div className="clp-head">
        <span className="clp-title">{block.title || "Controleer voor je verder gaat"}</span>
        <span className="clp-progress">
          {checkedCount} van {totalRequired} afgevinkt
        </span>
      </div>

      <div className="clp-items">
        {items.map((item) => {
          const isChecked = checked.has(item.id);
          return (
            <div
              aria-checked={isChecked}
              className={`clp-item ${isChecked ? "clp-checked" : ""}`}
              key={item.id}
              onClick={() => toggle(item.id)}
              onKeyDown={(event) => {
                if (event.key === " ") {
                  event.preventDefault();
                  toggle(item.id);
                }
              }}
              role="checkbox"
              tabIndex={0}
            >
              <div className="clp-box">{isChecked ? <span className="clp-check">✓</span> : null}</div>
              <span className="clp-text">{item.label}</span>
              {item.required ? (
                <span className={`clp-badge ${isChecked ? "clp-badge-done" : ""}`}>
                  {isChecked ? "✓" : "Verplicht"}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className={`clp-footer ${allRequiredChecked ? "clp-footer-ready" : ""}`}>
        <span className="clp-footer-text">
          {allRequiredChecked
            ? "Alle punten afgevinkt — je kunt verder."
            : requireAll
              ? "Vink alle verplichte punten af om verder te gaan."
              : "Vink de punten af die je hebt doorgenomen."}
        </span>
      </div>
    </div>
  );
}

function normalizeItems(items: ChecklistBlock["items"]): ChecklistItem[] {
  return items
    .map((item, index) => {
      if (typeof item === "string") {
        return { id: `item-${index}`, label: item, required: true };
      }

      return {
        id: item.id || `item-${index}`,
        label: item.label,
        required: item.required,
      };
    })
    .filter((item) => item.label.trim());
}
