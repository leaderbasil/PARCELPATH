// demo-aware users service
import type { Page, User, UserCreate, UserStatusIn, UserUpdate } from "@/types/domain";

import { api, unwrap } from "./api";
import { demoError, isDemoMode, paginateDemoItems } from "./demoMode";
import { DEMO_ADMIN_ID, getStoredDemoUsers, makeDemoId, saveDemoUsers } from "./mockDemoData";

export interface UserQuery {
  page?: number;
  page_size?: number;
  search?: string;
  role?: "ADMIN" | "CUSTOMER";
  is_active?: boolean;
}

function findUser(u: User[], id: string): User {
  const found = u.find(x => x.id === id);
  if (!found) throw demoError("USER_NOT_FOUND", 404);
  return found;
}
function activeAdminCount(users: User[]): number {
  return users.filter(x => x.role === "ADMIN" && x.is_active).length;
}
export const usersService = {

  async list(params: UserQuery = {}): Promise<Page<User>> {
    if (!isDemoMode()) return unwrap(api.get<{ data: Page<User> }>("/users", { params }));
    let users = getStoredDemoUsers();
    const q = (params.search ?? "").trim().toLowerCase();
    if (q) users = users.filter(x => [x.full_name, x.email, x.phone ?? ""].join(" ").toLowerCase().includes(q));
    if (params.role) users = users.filter(x => x.role === params.role);
    if (params.is_active !== undefined) users = users.filter(x => x.is_active === params.is_active);
    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return paginateDemoItems(users, params);
  },

  async create(payload: UserCreate): Promise<User> {
    if (!isDemoMode()) return unwrap(api.post<{ data: User }>("/users", payload));
    const users = getStoredDemoUsers();
    const email = payload.email.trim().toLowerCase();
    if (!payload.full_name.trim() || !email || !payload.role) throw demoError("VALIDATION_ERROR", 422);
    if (users.some(x => x.email.toLowerCase() === email)) throw demoError("DUPLICATE_EMAIL", 409);
    const user: User = { id: makeDemoId("user"), full_name: payload.full_name.trim(), email, phone: payload.phone?.trim() || null, role: payload.role, is_active: true, created_at: new Date().toISOString() };
    users.unshift(user);
    saveDemoUsers(users);
    return user;
  },
  async update(id: string, payload: UserUpdate): Promise<User> {
    if (!isDemoMode()) return unwrap(api.patch<{ data: User }>(`/users/${id}`, payload));

    const users = getStoredDemoUsers();
    const user = findUser(users, id);
    if (payload.role === "CUSTOMER" && id === DEMO_ADMIN_ID) {
      throw demoError("CANNOT_MODIFY_SELF", 403);
    }
    if (user.role === "ADMIN" && payload.role === "CUSTOMER" && activeAdminCount(users) <= 1) {
      throw demoError("LAST_ADMIN", 409);
    }
    if (payload.full_name !== undefined && payload.full_name.trim() === "") {
      throw demoError("VALIDATION_ERROR", 422);
    }

    const updated: User = {
      ...user,
      full_name: payload.full_name?.trim() ?? user.full_name,
      phone: payload.phone !== undefined ? payload.phone?.trim() || null : user.phone,
      role: payload.role ?? user.role,
    };
    const index = users.findIndex((item) => item.id === id);
    users[index] = updated;
    saveDemoUsers(users);
    return updated;
  },

  async setStatus(id: string, payload: UserStatusIn): Promise<User> {
    if (!isDemoMode()) return unwrap(api.patch<{ data: User }>(`/users/${id}/status`, payload));

    const users = getStoredDemoUsers();
    const user = findUser(users, id);
    if (!payload.is_active && id === DEMO_ADMIN_ID) {
      throw demoError("CANNOT_MODIFY_SELF", 403);
    }
    if (!payload.is_active && user.role === "ADMIN" && activeAdminCount(users) <= 1) {
      throw demoError("LAST_ADMIN", 409);
    }
    const updated: User = { ...user, is_active: payload.is_active };
    const index = users.findIndex((item) => item.id === id);
    users[index] = updated;
    saveDemoUsers(users);
    return updated;
  },
};
