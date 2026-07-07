"use client";

export async function uploadLessonFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/learning/admin/uploads", {
    body: formData,
    method: "POST",
  });

  const responseText = await response.text();
  const payload = parseUploadResponse(responseText);

  if (!response.ok || !payload?.publicUrl) {
    throw new Error(
      payload?.error ||
        `Uploaden is niet gelukt (${response.status}). ${responseText.slice(0, 160)}`.trim(),
    );
  }

  return payload.publicUrl;
}

function parseUploadResponse(value: string) {
  try {
    return JSON.parse(value) as { error?: string; publicUrl?: string };
  } catch {
    return null;
  }
}
