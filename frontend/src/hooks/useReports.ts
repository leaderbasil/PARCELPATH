import { useQuery } from "@tanstack/react-query";
import { reportsService, type ReportQuery } from "@/services/reports.service";
import { queryKeys } from "./queryKeys";

export function useDashboard(params: ReportQuery = {}) {
  return useQuery({
    queryKey: queryKeys.reports("dashboard", params),
    queryFn: () => reportsService.dashboard(params),
  });
}

export function useSales(params: ReportQuery = {}) {
  return useQuery({
    queryKey: queryKeys.reports("sales", params),
    queryFn: () => reportsService.sales(params),
  });
}

export function useTopProducts(params: ReportQuery = {}) {
  return useQuery({
    queryKey: queryKeys.reports("top-products", params),
    queryFn: () => reportsService.topProducts(params),
  });
}

export function useOrdersByStatus(params: ReportQuery = {}) {
  return useQuery({
    queryKey: queryKeys.reports("orders-by-status", params),
    queryFn: () => reportsService.ordersByStatus(params),
  });
}
