import type { DailySales, DashboardReport, Order, OrderStatus, PeriodSummary, ProductAdmin, SalesReport, SalesSummary, TopProduct } from "@/types/domain";
import { ORDER_STEPS } from "@/types/domain";
import { fromSubunits, toSubunits } from "@/utils/money";
import { api, unwrap } from "./api";
import { enumerateDateKeys, enumerateMonthKeys, isDemoMode, localDateKey, resolveDemoRange } from "./demoMode";
import { getStoredDemoOrders, getStoredDemoProducts } from "./mockDemoData";

export interface ReportQuery {
  from?: string;
  to?: string;
  group_by?: "day" | "month";
  limit?: number;
}

const ALL_STATUSES: readonly OrderStatus[] = [...ORDER_STEPS, "CANCELLED"];
function isCompleted(o: Order): boolean { return o.status !== "CANCELLED"; }
function inRange(o: Order, from: string, to: string): boolean { const k = localDateKey(o.created_at); return k >= from && k <= to; }
function summarize(orders: Order[]): SalesSummary {
  const cents = orders.reduce((t, o) => t + toSubunits(o.total_amount), 0);
  return { order_count: orders.length, sales_total: fromSubunits(cents) };
}
function periodSummary(orders: Order[]): PeriodSummary {
  const s = summarize(orders);
  const avg = s.order_count ? fromSubunits(Math.round(toSubunits(s.sales_total) / s.order_count)) : "0.00";
  return { ...s, average_order: avg };
}
function statusCounts(orders: Order[]): Record<OrderStatus, number> {
  const counts = Object.fromEntries(ALL_STATUSES.map(s => [s, 0])) as Record<OrderStatus, number>;
  orders.forEach(o => { counts[o.status] += 1; });
  return counts;
}
function topProductsFrom(orders: Order[], products: ProductAdmin[], limit: number): TopProduct[] {
  const totals = new Map<string, { name: string; sku: string; qty: number; cents: number }>();
  orders.filter(isCompleted).forEach(o => o.items.forEach(item => {
    const cur = totals.get(item.product_id) ?? { name: item.product_name, sku: item.sku, qty: 0, cents: 0 };
    cur.qty += item.quantity;
    cur.cents += toSubunits(item.line_total);
    const known = products.find(p => p.id === item.product_id); if (known) { cur.name = known.name; cur.sku = known.sku; }
    totals.set(item.product_id, cur);
  }));
  return [...totals.entries()].map(([id, v]) => ({ product_id: id, product_name: v.name, sku: v.sku, quantity_sold: v.qty, revenue: fromSubunits(v.cents) }))
    .sort((a, b) => b.quantity_sold - a.quantity_sold).slice(0, limit);
}
export const reportsService = {
  async dashboard(params: ReportQuery = {}): Promise<DashboardReport> {
    if (!isDemoMode()) return unwrap(api.get<{ data: DashboardReport }>("/reports/dashboard", { params }));
    const { from, to } = resolveDemoRange(params.from, params.to);
    const allOrders = getStoredDemoOrders();
    const periodOrders = allOrders.filter(o => inRange(o, from, to));
    const completed = periodOrders.filter(isCompleted);
    const today = localDateKey();
    const todayOrders = allOrders.filter(o => isCompleted(o) && localDateKey(o.created_at) === today);
    const dailySales: DailySales[] = enumerateDateKeys(from, to).map(date => {
      const day = summarize(completed.filter(o => localDateKey(o.created_at) === date));
      return { date, total: day.sales_total, count: day.order_count };
    });
    return {
      today: summarize(todayOrders),
      period: { ...periodSummary(completed), from, to },
      orders_by_status: statusCounts(periodOrders),
      pending_count: periodOrders.filter(o => o.status === "PENDING").length,
      low_stock_count: getStoredDemoProducts().filter(p => p.is_active && p.stock_quantity <= 5).length,
      top_products: topProductsFrom(completed, getStoredDemoProducts(), 5),
      daily_sales: dailySales,
    };
  },
  async sales(params: ReportQuery = {}): Promise<SalesReport> {
    if (!isDemoMode()) return unwrap(api.get<{ data: SalesReport }>("/reports/sales", { params }));
    const { from, to } = resolveDemoRange(params.from, params.to);
    const completed = getStoredDemoOrders().filter(o => isCompleted(o) && inRange(o, from, to));
    const keys = params.group_by === "month" ? enumerateMonthKeys(from, to) : enumerateDateKeys(from, to);
    const series = keys.map(key => {
      const s = summarize(completed.filter(o => localDateKey(o.created_at).startsWith(key)));
      return { period: key, total: s.sales_total, count: s.order_count };
    });
    return { summary: periodSummary(completed), series };
  },
  async topProducts(params: ReportQuery = {}): Promise<TopProduct[]> {
    if (!isDemoMode()) return unwrap(api.get<{ data: TopProduct[] }>("/reports/top-products", { params }));
    const { from, to } = resolveDemoRange(params.from, params.to);
    const completed = getStoredDemoOrders().filter(o => isCompleted(o) && inRange(o, from, to));
    return topProductsFrom(completed, getStoredDemoProducts(), Math.max(1, params.limit ?? 5));
  },
  async ordersByStatus(params: ReportQuery = {}): Promise<Record<string, number>> {
    if (!isDemoMode()) return unwrap(api.get<{ data: Record<string, number> }>("/reports/orders-by-status", { params }));
    const { from, to } = resolveDemoRange(params.from, params.to);
    return statusCounts(getStoredDemoOrders().filter(o => inRange(o, from, to)));
  },
};
