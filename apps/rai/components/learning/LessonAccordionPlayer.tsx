"use client";

import { useState } from "react";
import type { AccordionBlock } from "@digidactics/domain/learning";

export function LessonAccordionPlayer({ block }: { block: AccordionBlock }) {
  const [openIds, setOpenIds] = useState<string[]>([]);
  const allowMultiple = block.allow_multiple_open ?? false;

  function toggleItem(id: string) {
    setOpenIds((current) => {
      if (current.includes(id)) {
        return current.filter((itemId) => itemId !== id);
      }

      return allowMultiple ? [...current, id] : [id];
    });
  }

  return (
    <section className="block lesson-accordion-block">
      {block.title ? <h2>{block.title}</h2> : null}
      <div className="lesson-accordion">
        {block.items.map((item) => {
          const isOpen = openIds.includes(item.id);

          return (
            <div className={`acc-item ${isOpen ? "acc-item-open" : ""}`} key={item.id}>
              <button
                aria-expanded={isOpen}
                className="acc-trigger"
                onClick={() => toggleItem(item.id)}
                type="button"
              >
                <span>{item.question}</span>
                <span className="acc-icon" aria-hidden="true">
                  <svg fill="none" viewBox="0 0 16 16">
                    <path d="m3 5.5 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
                  </svg>
                </span>
              </button>

              <div className="acc-panel" aria-hidden={!isOpen}>
                <div className="acc-answer">
                  {item.answer.split(/\n{2,}/).map((paragraph, index) => (
                    <p key={`${item.id}-${index}`}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
