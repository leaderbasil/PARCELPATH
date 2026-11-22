import { api, unwrap } from "./api";
import type { Page, User, UserCreate, UserStatusIn, UserUpdate } from "@/types/domain";

export interface UserQuery {
  page?: number;
  page_size?: number;
  search?: string;
  role?: "ADMIN" | "CUSTOMER";
  is_active?: boolean;
}

export const usersService = {
  list: (params: UserQuery = {}): Promise<Page<User>> =>
    unwrap(api.get<{ data: Page<User> }>("/users", { params })),

  create: (payload: UserCreate): Promise<User> =>
    unwrap(api.post<{ data: User }>("/users", payload)),

  update: (id: string, payload: UserUpdate): Promise<User> =>
    unwrap(api.patch<{ data: User }>(`/users/${id}`, payload)),

  setStatus: (id: string, payload: UserStatusIn): Promise<User> =>
    unwrap(api.patch<{ data: User }>(`/users/${id}/status`, payload)),
};
