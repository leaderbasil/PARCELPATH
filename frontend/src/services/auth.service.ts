import { api, unwrap } from "./api";
import type { LoginIn, RegisterIn, TokenOut, User } from "@/types/domain";

export const authService = {
  login: (payload: LoginIn): Promise<TokenOut> =>
    unwrap(api.post<{ data: TokenOut }>("/auth/login", payload)),

  register: (payload: RegisterIn): Promise<User> =>
    unwrap(api.post<{ data: User }>("/auth/register", payload)),

  me: (): Promise<User> => unwrap(api.get<{ data: User }>("/auth/me")),
};
