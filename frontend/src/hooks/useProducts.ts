import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsService, type ProductQuery } from "@/services/products.service";
import type { ProductAdmin, ProductCreate, ProductUpdate } from "@/types/domain";
import { queryKeys } from "./queryKeys";

export function useProducts(params: ProductQuery = {}) {
  return useQuery({
    queryKey: queryKeys.products(params),
    queryFn: () => productsService.list(params),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.product(id ?? ""),
    queryFn: () => productsService.get(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useCategories() {
  return useQuery({ queryKey: queryKeys.categories(), queryFn: () => productsService.categories() });
}

export function useLowStock(threshold = 5) {
  return useQuery({
    queryKey: queryKeys.lowStock(threshold),
    queryFn: () => productsService.lowStock(threshold),
  });
}

export function useCreateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductCreate) => productsService.create(payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductUpdate }) =>
      productsService.update(id, payload),
    onSuccess: (_result, variables) => {
      void client.invalidateQueries({ queryKey: ["products"] });
      void client.invalidateQueries({ queryKey: queryKeys.product(variables.id) });
    },
  });
}

export function useDisableProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsService.remove(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["products"] }),
  });
}

export type { ProductAdmin };
