import { api, unwrap } from "./api";
import type { DashboardReport, SalesReport, TopProduct } from "@/types/domain";

export interface ReportQuery {
  from?: string;
  to?: string;
  group_by?: "day" | "month";
  limit?: number;
}

export const reportsService = {
  dashboard: (params: ReportQuery = {}): Promise<DashboardReport> =>
    unwrap(api.get<{ data: DashboardReport }>("/reports/dashboard", { params })),

  sales: (params: ReportQuery = {}): Promise<SalesReport> =>
    unwrap(api.get<{ data: SalesReport }>("/reports/sales", { params })),

  topProducts: (params: ReportQuery = {}): Promise<TopProduct[]> =>
    unwrap(api.get<{ data: TopProduct[] }>("/reports/top-products", { params })),

  ordersByStatus: (params: ReportQuery = {}): Promise<Record<string, number>> =>
    unwrap(api.get<{ data: Record<string, number> }>("/reports/orders-by-status", { params })),
};
