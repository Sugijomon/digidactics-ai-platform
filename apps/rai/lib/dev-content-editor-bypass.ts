import "server-only";

import type { UserContext } from "@digidactics/auth";
import { getSupabaseAdminClient } from "./supabase-server";

export function isDevContentEditorBypassEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.RAI_DEV_CONTENT_EDITOR_BYPASS === "true"
  );
}

export function getDevContentEditorContext(): UserContext {
  return {
    userId: "00000000-0000-0000-0000-000000000000",
    orgId: null,
    roles: ["content_editor"],
    primaryRole: "content_editor",
    productAccess: {
      rai: true,
      sai: true,
    },
  };
}

export function getDevContentEditorSupabaseClient() {
  if (!isDevContentEditorBypassEnabled()) {
    return null;
  }

  return getSupabaseAdminClient();
}
