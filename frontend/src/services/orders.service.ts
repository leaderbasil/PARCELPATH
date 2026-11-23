import {
  ALLOWED_TRANSITIONS,
  ORDER_STEPS,
  type Order,
  type OrderCreate,
  type OrderItem,
  type OrderListItem,
  type OrderShipIn,
  type OrderStatus,
  type OrderStatusIn,
  type Page,
  type ShippingUpdateIn,
  type TrackingEvent,
  type TrackingOut,
} from "@/types/domain";
import { fromSubunits, toSubunits } from "@/utils/money";

import { api, unwrap } from "./api";
import { demoError, isDemoMode, localDateKey, paginateDemoItems } from "./demoMode";
import {
  DemoOrder,
  getDemoAdminUser,
  getStoredDemoOrders,
  getStoredDemoProducts,
  makeDemoId,
  nextOrderNumber,
  saveDemoOrders,
  saveDemoProducts,
  toCustomerBrief,
  toOrderListItem,
} from "./mockDemoData";

export interface OrderQuery {
  page?: number;
  page_size?: number;
  status?: OrderStatus;
  from?: string;
  to?: string;
  order_number?: string;
  customer_id?: string;
}

const TRACK_NOTES: Partial<Record<OrderStatus, string>> = {
  PENDING: "تم إنشاء الطلب وانتظار التأكيد.",
  CONFIRMED: "تم تأكيد الطلب.",
  PACKED: "تم تجهيز الطلب.",
  SHIPPED: "تم تسليم الطلب للناقل.",
  OUT_FOR_DELIVERY: "الطلب خارج للتوصيل.",
  DELIVERED: "تم تسليم الطلب بنجاح.",
};

function findOrder(orders: DemoOrder[], id: string): DemoOrder {
  const order = orders.find((item) => item.id === id);
  if (!order) throw demoError("ORDER_NOT_FOUND", 404);
  return order;
}

function buildTrackingEvents(order: Order): TrackingEvent[] {
  const created = new Date(order.created_at).getTime();
  if (order.status === "CANCELLED") {
    return [
      { status: "PENDING", note: TRACK_NOTES["PENDING"] ?? null, at: order.created_at },
      {
        status: "CANCELLED",
        note: "تم إلغاء الطلب.",
        at: new Date(created + 2 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }
  const currentIndex = Math.max(0, ORDER_STEPS.indexOf(order.status));
  return ORDER_STEPS.slice(0, currentIndex + 1).map((status, index) => ({
    status,
    note: TRACK_NOTES[status] ?? null,
    at: new Date(created + index * 6 * 60 * 60 * 1000).toISOString(),
  }));
}

export const ordersService = {
  async create(payload: OrderCreate, idempotencyKey: string): Promise<Order> {
    if (!isDemoMode()) {
      return unwrap(
        api.post<{ data: Order }>("/orders", payload, {
          headers: { "Idempotency-Key": idempotencyKey },
        })
      );
    }

    const orders = getStoredDemoOrders();
    const replay = orders.find((order) => order.idempotency_key === idempotencyKey);
    if (replay) return replay;

    const requestItems = Array.isArray(payload.items) ? payload.items : [];
    if (requestItems.length === 0) throw demoError("EMPTY_CART", 422);

    const quantities = new Map<string, number>();
    for (const item of requestItems) {
      const quantity = Number(item?.quantity);
      if (typeof item?.product_id !== "string" || !Number.isInteger(quantity) || quantity < 1) {
        throw demoError("VALIDATION_ERROR", 422);
      }
      quantities.set(item.product_id, (quantities.get(item.product_id) ?? 0) + quantity);
    }

    const products = getStoredDemoProducts();
    const lines: OrderItem[] = [];
    let subtotalCents = 0;
    // Validate the whole cart before changing any stock.
    for (const [productId, quantity] of quantities) {
      const product = products.find((item) => item.id === productId);
      if (!product) throw demoError("PRODUCT_NOT_FOUND", 404);
      if (!product.is_active) throw demoError("PRODUCT_INACTIVE", 409);
      if (product.stock_quantity < quantity) {
        throw demoError("INSUFFICIENT_STOCK", 409, {
          items: [{ product_id: productId, available: product.stock_quantity }],
        });
      }
      const unitCents = toSubunits(product.price);
      const lineCents = unitCents * quantity;
      subtotalCents += lineCents;
      lines.push({
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        quantity,
        unit_price: product.price,
        line_total: fromSubunits(lineCents),
      });
    }

    const shippingCents = subtotalCents < 10000 ? 500 : 0;
    const now = new Date().toISOString();
    for (const line of lines) {
      const product = products.find((item) => item.id === line.product_id);
      if (!product) continue;
      product.stock_quantity -= line.quantity;
      product.in_stock = product.stock_quantity > 0;
      product.updated_at = now;
    }
    saveDemoProducts(products);

    const order: DemoOrder = {
      id: makeDemoId("order"),
      order_number: nextOrderNumber(orders),
      status: "PENDING",
      payment_method: payload.payment_method,
      payment_status: payload.payment_method === "CARD" ? "PAID" : "UNPAID",
      subtotal: fromSubunits(subtotalCents),
      shipping_fee: fromSubunits(shippingCents),
      total_amount: fromSubunits(subtotalCents + shippingCents),
      shipping: payload.shipping,
      carrier: null,
      tracking_number: null,
      created_at: now,
      items: lines,
      customer: toCustomerBrief(getDemoAdminUser()),
      idempotency_key: idempotencyKey,
    };
    orders.unshift(order);
    saveDemoOrders(orders);
    return order;
  },

  async list(params: OrderQuery = {}): Promise<Page<OrderListItem>> {
    if (!isDemoMode()) return unwrap(api.get<{ data: Page<OrderListItem> }>("/orders", { params }));

    let orders = getStoredDemoOrders();
    if (params.status) orders = orders.filter((order) => order.status === params.status);
    if (params.order_number) {
      const needle = params.order_number.trim().toLowerCase();
      orders = orders.filter((order) => order.order_number.toLowerCase().includes(needle));
    }
    if (params.customer_id) {
      orders = orders.filter((order) => order.customer?.id === params.customer_id);
    }
    if (params.from) {
      orders = orders.filter((order) => localDateKey(order.created_at) >= params.from!);
    }
    if (params.to) {
      orders = orders.filter((order) => localDateKey(order.created_at) <= params.to!);
    }
    orders.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || a.id.localeCompare(b.id)
    );
    return paginateDemoItems(orders.map(toOrderListItem), params);
  },

  async get(id: string): Promise<Order> {
    if (!isDemoMode()) return unwrap(api.get<{ data: Order }>(`/orders/${id}`));
    return findOrder(getStoredDemoOrders(), id);
  },

  async tracking(id: string): Promise<TrackingOut> {
    if (!isDemoMode()) return unwrap(api.get<{ data: TrackingOut }>(`/orders/${id}/tracking`));
    const order = findOrder(getStoredDemoOrders(), id);
    return {
      order_number: order.order_number,
      status: order.status,
      carrier: order.carrier,
      tracking_number: order.tracking_number,
      events: buildTrackingEvents(order),
    };
  },

  async cancel(id: string): Promise<Order> {
    if (!isDemoMode()) return unwrap(api.post<{ data: Order }>(`/orders/${id}/cancel`));
    const orders = getStoredDemoOrders();
    const order = findOrder(orders, id);
    if (!ALLOWED_TRANSITIONS[order.status].includes("CANCELLED")) {
      throw demoError("ORDER_NOT_CANCELLABLE", 409);
    }

    const products = getStoredDemoProducts();
    const now = new Date().toISOString();
    for (const item of order.items) {
      const product = products.find((entry) => entry.id === item.product_id);
      if (!product) continue;
      product.stock_quantity += item.quantity;
      product.in_stock = true;
      product.updated_at = now;
    }
    saveDemoProducts(products);

    order.status = "CANCELLED";
    saveDemoOrders(orders);
    return order;
  },

  async changeStatus(id: string, payload: OrderStatusIn): Promise<Order> {
    if (!isDemoMode()) return unwrap(api.patch<{ data: Order }>(`/orders/${id}/status`, payload));
    const orders = getStoredDemoOrders();
    const order = findOrder(orders, id);
    if (!ALLOWED_TRANSITIONS[order.status].includes(payload.status)) {
      throw demoError("INVALID_STATUS_TRANSITION", 409);
    }
    order.status = payload.status;
    if (payload.status === "DELIVERED") order.payment_status = "PAID";
    saveDemoOrders(orders);
    return order;
  },

  async ship(id: string, payload: OrderShipIn): Promise<Order> {
    if (!isDemoMode()) return unwrap(api.post<{ data: Order }>(`/orders/${id}/ship`, payload));
    const orders = getStoredDemoOrders();
    const order = findOrder(orders, id);
    if (order.status !== "PACKED") throw demoError("INVALID_STATUS_TRANSITION", 409);
    const carrier = payload.carrier.trim();
    const trackingNumber = payload.tracking_number.trim();
    if (!carrier || !trackingNumber) throw demoError("VALIDATION_ERROR", 422);
    if (
      orders.some(
        (item) =>
          item.id !== id &&
          item.tracking_number?.toLowerCase() === trackingNumber.toLowerCase()
      )
    ) {
      throw demoError("DUPLICATE_TRACKING_NUMBER", 409);
    }
    order.status = "SHIPPED";
    order.carrier = carrier;
    order.tracking_number = trackingNumber;
    saveDemoOrders(orders);
    return order;
  },

  async updateShipping(id: string, payload: ShippingUpdateIn): Promise<Order> {
    if (!isDemoMode()) return unwrap(api.patch<{ data: Order }>(`/orders/${id}/shipping`, payload));
    const orders = getStoredDemoOrders();
    const order = findOrder(orders, id);
    if (!["PENDING", "CONFIRMED"].includes(order.status)) {
      throw demoError("SHIPPING_NOT_EDITABLE", 409);
    }
    if (payload.carrier !== undefined) order.carrier = payload.carrier.trim() || null;
    if (payload.tracking_number !== undefined) {
      const next = payload.tracking_number.trim() || null;
      if (
        next &&
        orders.some(
          (item) => item.id !== id && item.tracking_number?.toLowerCase() === next.toLowerCase()
        )
      ) {
        throw demoError("DUPLICATE_TRACKING_NUMBER", 409);
      }
      order.tracking_number = next;
    }
    saveDemoOrders(orders);
    return order;
  },
};
