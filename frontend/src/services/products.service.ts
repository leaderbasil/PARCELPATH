import { api, unwrap } from "./api";
import type { Page, Product, ProductAdmin, ProductCreate, ProductUpdate } from "@/types/domain";

export interface ProductQuery {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  min_price?: string;
  max_price?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "name";
  is_active?: boolean;
}

export const productsService = {
  list: (params: ProductQuery = {}): Promise<Page<Product | ProductAdmin>> =>
    unwrap(api.get<{ data: Page<Product | ProductAdmin> }>("/products", { params })),

  get: (id: string): Promise<Product | ProductAdmin> =>
    unwrap(api.get<{ data: Product | ProductAdmin }>(`/products/${id}`)),

  categories: (): Promise<string[]> => unwrap(api.get<{ data: string[] }>("/products/categories")),

  lowStock: (threshold = 5): Promise<ProductAdmin[]> =>
    unwrap(api.get<{ data: ProductAdmin[] }>("/products/low-stock", { params: { threshold } })),

  create: (payload: ProductCreate): Promise<ProductAdmin> =>
    unwrap(api.post<{ data: ProductAdmin }>("/products", payload)),

  update: (id: string, payload: ProductUpdate): Promise<ProductAdmin> =>
    unwrap(api.patch<{ data: ProductAdmin }>(`/products/${id}`, payload)),

  remove: async (id: string): Promise<void> => {
    await unwrap(api.delete<{ data: null }>(`/products/${id}`));
  },
};
