import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAppRole, type AppRole } from "@/lib/supabase/roles";

const ROLE_PRIORITY: AppRole[] = [
  "super_admin",
  "org_admin",
  "dpo",
  "manager",
  "content_editor",
  "user",
];

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

  const { data, error: roleError } = await supabase
    .from("user_roles")
    .select("role, org_id")
    .eq("user_id", user.id)
    .returns<UserRoleRecord[]>();

  if (roleError) {
    return {
      user,
      role: null,
      orgId: null,
      error: roleError.message,
    };
  }

  const selectedRole = selectHighestPriorityRole(data ?? []);

  return {
    user,
    role: selectedRole?.role ?? null,
    orgId: selectedRole?.org_id ?? null,
    error: null,
  };
}

function selectHighestPriorityRole(records: UserRoleRecord[]) {
  return records
    .filter(
      (record): record is UserRoleRecord & { role: AppRole } =>
        isAppRole(record.role),
    )
    .sort((a, b) => {
      const roleDiff = rolePriority(a.role) - rolePriority(b.role);
      if (roleDiff !== 0) return roleDiff;
      return (a.org_id ?? "").localeCompare(b.org_id ?? "");
    })[0];
}

function rolePriority(role: AppRole) {
  return ROLE_PRIORITY.indexOf(role);
}
