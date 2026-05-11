"use client";

import { useEffect, useState } from "react";
import { consumeSurveyGuardNotice } from "@/lib/sai-rpc/session";

export function SurveyGuardNotice() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const notice = consumeSurveyGuardNotice();

      if (notice) {
        setMessage(notice.message);
      }
    });
  }, []);

  if (!message) {
    return null;
  }

  return (
    <section
      aria-live="polite"
      className="rounded-2xl border border-[#e5c687] bg-[#fff8df] px-4 py-3 text-sm font-medium leading-6 text-[#6f5600]"
    >
      {message}
    </section>
  );
}
