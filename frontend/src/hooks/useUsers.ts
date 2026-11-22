import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersService, type UserQuery } from "@/services/users.service";
import type { UserCreate, UserStatusIn, UserUpdate } from "@/types/domain";
import { queryKeys } from "./queryKeys";

export function useUsers(params: UserQuery = {}) {
  return useQuery({ queryKey: queryKeys.users(params), queryFn: () => usersService.list(params) });
}

export function useCreateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserCreate) => usersService.create(payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserUpdate }) =>
      usersService.update(id, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useSetUserStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserStatusIn }) =>
      usersService.setStatus(id, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ["users"] }),
  });
}
