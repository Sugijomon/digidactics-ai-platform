export const APP_ROLES = [
  "super_admin",
  "content_editor",
  "org_admin",
  "dpo",
  "manager",
  "user",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(role: string | null | undefined): role is AppRole {
  return APP_ROLES.some((knownRole) => knownRole === role);
}
