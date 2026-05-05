import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAppRole, type AppRole } from "@/lib/supabase/roles";

type UserRoleRecord = {
  role: string | null;
  org_id: string | null;
};

export type UserRoleState = {
  user: User | null;
  role: AppRole | null;
  orgId: string | null;
  error: string | null;
};

export async function getUserRole(): Promise<UserRoleState> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return {
      user: null,
      role: null,
      orgId: null,
      error: userError.message,
    };
  }

  if (!user) {
    return {
      user: null,
      role: null,
      orgId: null,
      error: null,
    };
  }

  // Future roles: manager, content_editor, juridisch.
  // Add routing and permissions when RouteAI Platform functionality is active.
  const { data, error: roleError } = await supabase
    .from("user_roles")
    .select("role, org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle<UserRoleRecord>();

  if (roleError) {
    return {
      user,
      role: null,
      orgId: null,
      error: roleError.message,
    };
  }

  return {
    user,
    role: isAppRole(data?.role) ? data.role : null,
    orgId: data?.org_id ?? null,
    error: null,
  };
}
