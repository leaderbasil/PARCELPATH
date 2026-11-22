import { api, unwrap } from "./api";
import type {
  Order,
  OrderCreate,
  OrderListItem,
  OrderShipIn,
  OrderStatusIn,
  OrderStatus,
  Page,
  ShippingUpdateIn,
  TrackingOut,
} from "@/types/domain";

export interface OrderQuery {
  page?: number;
  page_size?: number;
  status?: OrderStatus;
  from?: string;
  to?: string;
  order_number?: string;
  customer_id?: string;
}

export const ordersService = {
  create: (payload: OrderCreate, idempotencyKey: string): Promise<Order> =>
    unwrap(
      api.post<{ data: Order }>("/orders", payload, {
        headers: { "Idempotency-Key": idempotencyKey },
      })
    ),

  list: (params: OrderQuery = {}): Promise<Page<OrderListItem>> =>
    unwrap(api.get<{ data: Page<OrderListItem> }>("/orders", { params })),

  get: (id: string): Promise<Order> => unwrap(api.get<{ data: Order }>(`/orders/${id}`)),

  tracking: (id: string): Promise<TrackingOut> =>
    unwrap(api.get<{ data: TrackingOut }>(`/orders/${id}/tracking`)),

  cancel: (id: string): Promise<Order> =>
    unwrap(api.post<{ data: Order }>(`/orders/${id}/cancel`)),

  changeStatus: (id: string, payload: OrderStatusIn): Promise<Order> =>
    unwrap(api.patch<{ data: Order }>(`/orders/${id}/status`, payload)),

  ship: (id: string, payload: OrderShipIn): Promise<Order> =>
    unwrap(api.post<{ data: Order }>(`/orders/${id}/ship`, payload)),

  updateShipping: (id: string, payload: ShippingUpdateIn): Promise<Order> =>
    unwrap(api.patch<{ data: Order }>(`/orders/${id}/shipping`, payload)),
};
