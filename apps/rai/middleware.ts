import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase-middleware";

const learningCourseCodes = new Set([
  "ai-literacy-foundation",
  "ai-proficiency",
  "ai-mastery",
]);

const lessonCodeAliases: Record<string, string> = {
  "aisa-l1-genai-gpai": "genai",
  "generatieve-ai-gpai": "genai",
  "generative-ai-gpai": "genai",
};

export async function middleware(request: NextRequest) {
  const redirectUrl = getLearningRedirectUrl(request);

  if (redirectUrl) {
    return NextResponse.redirect(redirectUrl);
  }

  return updateSession(request);
}

function getLearningRedirectUrl(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);

  if (!segments.length) {
    return null;
  }

  const hasLearningPrefix = segments[0] === "learning";
  const courseIndex = hasLearningPrefix ? 1 : 0;
  const courseCode = segments[courseIndex];
  const lessonCode = segments[courseIndex + 1];

  if (!courseCode || !learningCourseCodes.has(courseCode)) {
    return null;
  }

  const canonicalLessonCode = lessonCode ? lessonCodeAliases[lessonCode] ?? lessonCode : null;
  const canonicalSegments = ["learning", courseCode, ...(canonicalLessonCode ? [canonicalLessonCode] : [])];
  const canonicalPathname = `/${canonicalSegments.join("/")}`;

  if (hasLearningPrefix && canonicalPathname === pathname) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = canonicalPathname;
  return url;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
