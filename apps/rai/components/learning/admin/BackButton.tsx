"use client";

import { useRouter } from "next/navigation";

export function BackButton({
  fallbackHref,
  label = "Terug",
}: {
  fallbackHref: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <button
      className="content-editor-focus-back button button-secondary"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push(fallbackHref);
      }}
      type="button"
    >
      &larr; {label}
    </button>
  );
}
