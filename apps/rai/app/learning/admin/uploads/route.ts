import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireContentEditor } from "@/lib/learning-admin-data";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

const DOWNLOAD_BUCKET = "lesson-files";
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_INLINE_FALLBACK_BYTES = 2 * 1024 * 1024;
const LOCAL_UPLOAD_FALLBACK = process.env.NODE_ENV !== "production";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Geen bestand ontvangen." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Bestand is te groot. Gebruik maximaal 50MB." }, { status: 400 });
    }

    if (LOCAL_UPLOAD_FALLBACK) {
      const body = Buffer.from(await file.arrayBuffer());
      const localUpload = await writeLocalUpload(body, file.name);
      return NextResponse.json({
        bucket: null,
        path: localUpload.path,
        publicUrl: localUpload.publicUrl,
        storageMode: "local-dev",
      });
    }

    const { supabase: userSupabase } = await requireContentEditor();
    const body = Buffer.from(await file.arrayBuffer());
    const adminSupabase = getSupabaseAdminClient();
    const uploadSupabase = adminSupabase ?? userSupabase;
    if (!uploadSupabase) {
      return NextResponse.json({ error: "Supabase Storage is niet geconfigureerd." }, { status: 500 });
    }

    const bucketError = adminSupabase ? await ensureDownloadBucket() : "";
    if (bucketError) {
      return NextResponse.json({ error: bucketError }, { status: 500 });
    }

    const storagePath = `learning-files/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await uploadSupabase.storage.from(DOWNLOAD_BUCKET).upload(storagePath, body, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadError) {
      if (/bucket not found/i.test(uploadError.message) && file.size <= MAX_INLINE_FALLBACK_BYTES) {
        return NextResponse.json({
          bucket: null,
          path: null,
          publicUrl: toDataUrl(body, file.type),
          storageMode: "inline",
        });
      }

      const missingBucketHint = /bucket not found/i.test(uploadError.message)
        ? " Bucket 'lesson-files' ontbreekt en het bestand is te groot voor inline opslag. Voer de storage bucket migratie uit of configureer SUPABASE_SERVICE_ROLE_KEY zodat de app deze kan aanmaken."
        : "";
      return NextResponse.json({ error: `${uploadError.message || "Uploaden is niet gelukt."}${missingBucketHint}` }, { status: 500 });
    }

    const { data } = uploadSupabase.storage.from(DOWNLOAD_BUCKET).getPublicUrl(storagePath);

    return NextResponse.json({
      bucket: DOWNLOAD_BUCKET,
      path: storagePath,
      publicUrl: data.publicUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Uploaden is niet gelukt." },
      { status: 500 },
    );
  }
}

async function writeLocalUpload(body: Buffer, fileName: string) {
  const cwd = process.cwd();
  const isAppCwd = path.basename(cwd) === "rai" && path.basename(path.dirname(cwd)) === "apps";
  const appRoot = isAppCwd ? cwd : path.join(cwd, "apps", "rai");
  const uploadDir = path.join(appRoot, "public", "uploads", "learning-files");
  const safeName = `${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
  const targetPath = path.join(uploadDir, safeName);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(targetPath, body);

  return {
    path: `uploads/learning-files/${safeName}`,
    publicUrl: `/uploads/learning-files/${safeName}`,
  };
}

function toDataUrl(body: Buffer, mimeType: string) {
  return `data:${mimeType || "application/octet-stream"};base64,${body.toString("base64")}`;
}

async function ensureDownloadBucket() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return "Supabase Storage is niet geconfigureerd.";

  const { error: getError } = await supabase.storage.getBucket(DOWNLOAD_BUCKET);
  if (!getError) return "";

  const { error: createError } = await supabase.storage.createBucket(DOWNLOAD_BUCKET, {
    public: true,
    fileSizeLimit: `${MAX_FILE_SIZE_BYTES}`,
  });

  if (!createError || /already exists/i.test(createError.message)) return "";
  return createError.message || "Bucket kon niet worden aangemaakt.";
}

function sanitizeFileName(fileName: string) {
  return (
    fileName
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "download"
  );
}
