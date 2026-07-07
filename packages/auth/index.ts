export type PlatformRole =
  | "user"
  | "manager"
  | "org_admin"
  | "dpo"
  | "content_editor"
  | "super_admin";

export interface UserContext {
  userId: string;
  orgId: string | null;
  roles: PlatformRole[];
  primaryRole: PlatformRole | null;
  productAccess: {
    sai: boolean;
    rai: boolean;
  };
}

export interface SupabaseAuthQueryClient {
  auth: {
    getUser(): Promise<{
      data: {
        user: { id: string } | null;
      };
      error?: { message: string } | null;
    }>;
  };
  from(table: string): {
    select(columns?: string): any;
  };
}

interface ProfileOrgRow {
  org_id: string | null;
}

interface RoleRow {
  role: unknown;
}

export const platformRoles: PlatformRole[] = [
  "user",
  "manager",
  "org_admin",
  "dpo",
  "content_editor",
  "super_admin",
];

export const rolePriority: PlatformRole[] = [
  "super_admin",
  "content_editor",
  "org_admin",
  "dpo",
  "manager",
  "user",
];

export function isPlatformRole(value: unknown): value is PlatformRole {
  return typeof value === "string" && platformRoles.includes(value as PlatformRole);
}

export function getPrimaryRole(roles: PlatformRole[]): PlatformRole | null {
  return rolePriority.find((role) => roles.includes(role)) ?? null;
}

export function canAccessProduct(
  context: Pick<UserContext, "productAccess"> | null,
  product: keyof UserContext["productAccess"],
) {
  return Boolean(context?.productAccess[product]);
}

export function getDefaultEntryPath(context: UserContext | null): string {
  switch (context?.primaryRole) {
    case "super_admin":
      return "/admin";
    case "content_editor":
      return "/learning/admin";
    case "org_admin":
    case "dpo":
    case "manager":
      return "/dashboard";
    case "user":
    case null:
    default:
      return "/learning";
  }
}

export async function getCurrentUserContext(
  supabase: SupabaseAuthQueryClient | null,
): Promise<UserContext | null> {
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const { data: profile } = (await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle()) as { data: ProfileOrgRow | null };

  const { data: roleRows } = (await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)) as { data: RoleRow[] | null };

  const roles = normalizeRoles(roleRows);
  const primaryRole = getPrimaryRole(roles);

  return {
    userId: user.id,
    orgId: profile?.org_id ?? null,
    roles,
    primaryRole,
    productAccess: getProductAccess(roles),
  };
}

function normalizeRoles(rows: unknown): PlatformRole[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  const roles = rows
    .map((row) =>
      row && typeof row === "object" && "role" in row
        ? (row as { role: unknown }).role
        : null,
    )
    .filter(isPlatformRole);

  return Array.from(new Set(roles)).sort(
    (left, right) => rolePriority.indexOf(left) - rolePriority.indexOf(right),
  );
}

function getProductAccess(roles: PlatformRole[]) {
  const hasAnyRole = roles.length > 0;

  return {
    sai: hasAnyRole,
    rai: hasAnyRole,
  };
}
