/** Domain types matching the backend schemas exactly (money is always a string). */

export type Role = "ADMIN" | "CUSTOMER";
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";
export type PaymentMethod = "COD" | "CARD";
export type PaymentStatus = "UNPAID" | "PAID";
export type Money = string;

export interface ApiEnvelope<T> {
  data: T;
  message: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApiErrorBody {
  detail: string;
  code: string;
  meta?: Record<string, unknown>;
  errors?: unknown[];
}

export interface ApiError extends Error {
  status: number;
  code: string;
  meta?: Record<string, unknown>;
  errors?: unknown[];
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category: string | null;
  price: Money;
  image_url: string | null;
  in_stock: boolean;
}

export interface ProductAdmin extends Product {
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product_id: string;
  name: string;
  sku: string;
  price: Money;
  image_url: string | null;
  quantity: number;
  stock_quantity: number;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: Money;
  line_total: Money;
}

export interface Shipping {
  name: string;
  phone: string;
  city: string;
  address: string;
}

export interface CustomerBrief {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: Money;
  shipping_fee: Money;
  total_amount: Money;
  shipping: Shipping;
  carrier: string | null;
  tracking_number: string | null;
  created_at: string;
  items: OrderItem[];
  customer?: CustomerBrief | null;
}

export interface OrderListItem {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_amount: Money;
  items_count: number;
  created_at: string;
  customer?: CustomerBrief | null;
}

export interface TrackingEvent {
  status: OrderStatus;
  note: string | null;
  at: string;
}

export interface TrackingOut {
  order_number: string;
  status: OrderStatus;
  carrier: string | null;
  tracking_number: string | null;
  events: TrackingEvent[];
}

export interface LoginIn {
  email: string;
  password: string;
}

export interface RegisterIn {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface TokenOut {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface OrderItemIn {
  product_id: string;
  quantity: number;
}

export interface OrderCreate {
  items: OrderItemIn[];
  payment_method: PaymentMethod;
  shipping: Shipping;
}

export interface OrderStatusIn {
  status: Extract<OrderStatus, "CONFIRMED" | "PACKED" | "OUT_FOR_DELIVERY" | "DELIVERED">;
  note?: string;
}

export interface OrderShipIn {
  carrier: string;
  tracking_number: string;
  note?: string;
}

export interface ShippingUpdateIn {
  carrier?: string;
  tracking_number?: string;
  note?: string;
}

export interface ProductCreate {
  name: string;
  sku: string;
  description?: string;
  category?: string;
  price: string;
  stock_quantity: number;
  image_url?: string;
  is_active?: boolean;
}

export type ProductUpdate = Partial<ProductCreate>;

export interface UserCreate extends RegisterIn {
  role: Role;
}

export type UserUpdate = Partial<Pick<User, "full_name" | "phone" | "role">>;

export interface UserStatusIn {
  is_active: boolean;
}

export interface SalesSummary {
  order_count: number;
  sales_total: Money;
}

export interface PeriodSummary extends SalesSummary {
  average_order: Money;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  sku: string;
  quantity_sold: number;
  revenue: Money;
}

export interface DailySales {
  date: string;
  total: Money;
  count: number;
}

export interface DashboardReport {
  today: SalesSummary;
  period: PeriodSummary & { from: string; to: string };
  orders_by_status: Record<OrderStatus, number>;
  pending_count: number;
  low_stock_count: number;
  top_products: TopProduct[];
  daily_sales: DailySales[];
}

export interface SalesReport {
  summary: PeriodSummary;
  series: { period: string; total: Money; count: number }[];
}

export const ORDER_STEPS: readonly OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
