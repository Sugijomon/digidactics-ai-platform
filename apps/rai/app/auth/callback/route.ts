import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserContext, getDefaultEntryPath } from "@digidactics/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/learning";

  if (code) {
    const supabase = await getSupabaseServerClient();
    await supabase?.auth.exchangeCodeForSession(code);

    if (next === "/dashboard") {
      const context = await getCurrentUserContext(supabase);
      return NextResponse.redirect(
        new URL(getDefaultEntryPath(context), requestUrl.origin),
      );
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
