import type { OrderQuery } from "@/services/orders.service";
import type { ProductQuery } from "@/services/products.service";
import type { ReportQuery } from "@/services/reports.service";
import type { UserQuery } from "@/services/users.service";

export const queryKeys = {
  products: (params: ProductQuery = {}) => ["products", params] as const,
  product: (id: string) => ["product", id] as const,
  categories: () => ["categories"] as const,
  lowStock: (threshold: number) => ["low-stock", threshold] as const,
  orders: (params: OrderQuery = {}) => ["orders", params] as const,
  order: (id: string) => ["order", id] as const,
  tracking: (id: string) => ["tracking", id] as const,
  reports: (name: string, params: ReportQuery = {}) => ["reports", name, params] as const,
  users: (params: UserQuery = {}) => ["users", params] as const,
} as const;
