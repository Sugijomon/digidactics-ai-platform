import JSZip from "jszip";
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireContentEditor } from "@/lib/learning-admin-data";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

const BUCKET = "lesson-files";
const MAX_PPTX_SIZE_BYTES = 60 * 1024 * 1024;
const MAX_EXTRACTED_SLIDES = 160;
const LOCAL_UPLOAD_FALLBACK = process.env.NODE_ENV !== "production";

export const runtime = "nodejs";

type ExtractedSlide = {
  id: string;
  title: string;
  url: string;
  alt: string;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Geen PPTX bestand ontvangen." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Het PPTX-bestand is leeg." }, { status: 400 });
    }

    if (!isPptxFile(file)) {
      return NextResponse.json({ error: "Gebruik een .pptx bestand." }, { status: 400 });
    }

    if (file.size > MAX_PPTX_SIZE_BYTES) {
      return NextResponse.json({ error: "PPTX is te groot. Gebruik maximaal 60MB." }, { status: 400 });
    }

    await requireContentEditor();

    const zip = await readPptxZip(file);
    const imageEntries = Object.values(zip.files)
      .filter((entry) => !entry.dir && /^ppt\/media\/image\d+\.(png|jpe?g|webp)$/i.test(entry.name))
      .sort((left, right) => imageSortKey(left.name) - imageSortKey(right.name));

    if (!imageEntries.length) {
      return NextResponse.json(
        {
          error:
            "Geen PNG/JPG slides gevonden in deze PPTX. Exporteer de slides eerst als afbeeldingen of voeg image-slides toe.",
        },
        { status: 400 },
      );
    }

    if (imageEntries.length > MAX_EXTRACTED_SLIDES) {
      return NextResponse.json(
        { error: `Deze PPTX bevat ${imageEntries.length} afbeeldingen. Importeer maximaal ${MAX_EXTRACTED_SLIDES} slides per keer.` },
        { status: 400 },
      );
    }

    const slides: ExtractedSlide[] = [];
    const sourceName = sanitizeFileName(file.name.replace(/\.pptx$/i, "")) || "presentatie";

    for (let index = 0; index < imageEntries.length; index += 1) {
      const entry = imageEntries[index];
      const body = await entry.async("nodebuffer");
      const extension = path.extname(entry.name).toLowerCase() || ".png";
      const slideNumber = String(index + 1).padStart(2, "0");
      const fileName = `${sourceName}-slide-${slideNumber}${extension}`;
      const publicUrl = LOCAL_UPLOAD_FALLBACK
        ? await writeLocalSlide(body, fileName)
        : await uploadStorageSlide(body, fileName, mimeFromExtension(extension));

      slides.push({
        id: `slide-${crypto.randomUUID()}`,
        title: `Slide ${index + 1}`,
        url: publicUrl,
        alt: `Slide ${index + 1}`,
      });
    }

    return NextResponse.json({ slides });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PPTX importeren is niet gelukt." },
      { status: 500 },
    );
  }
}

async function readPptxZip(file: File) {
  try {
    return await JSZip.loadAsync(Buffer.from(await file.arrayBuffer()));
  } catch {
    throw new Error("Dit bestand kon niet als PPTX worden gelezen. Controleer of het bestand niet beschadigd is.");
  }
}

function isPptxFile(file: File) {
  return (
    file.name.toLowerCase().endsWith(".pptx") ||
    file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  );
}

function imageSortKey(value: string) {
  const match = value.match(/image(\d+)\./i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

async function writeLocalSlide(body: Buffer, fileName: string) {
  const cwd = process.cwd();
  const isAppCwd = path.basename(cwd) === "rai" && path.basename(path.dirname(cwd)) === "apps";
  const appRoot = isAppCwd ? cwd : path.join(cwd, "apps", "rai");
  const uploadDir = path.join(appRoot, "public", "uploads", "learning-files", "slide-decks");
  const safeName = `${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, safeName), body);
  return `/uploads/learning-files/slide-decks/${safeName}`;
}

async function uploadStorageSlide(body: Buffer, fileName: string, contentType: string) {
  const { supabase: userSupabase } = await requireContentEditor();
  const adminSupabase = getSupabaseAdminClient();
  const uploadSupabase = adminSupabase ?? userSupabase;

  if (!uploadSupabase) {
    throw new Error("Supabase Storage is niet geconfigureerd.");
  }

  const storagePath = `learning-files/slide-decks/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
  const { error } = await uploadSupabase.storage.from(BUCKET).upload(storagePath, body, {
    cacheControl: "3600",
    contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || "Slide uploaden is niet gelukt.");
  }

  const { data } = uploadSupabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

function mimeFromExtension(extension: string) {
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

function sanitizeFileName(fileName: string) {
  return (
    fileName
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "slide.png"
  );
}
