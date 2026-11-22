import type { Role } from "@/types/domain";

/** Guard used by non-component navigation helpers. */
export function requireAuth(user: { role: Role } | null, roles: readonly Role[]): boolean {
  return user !== null && roles.includes(user.role);
}
