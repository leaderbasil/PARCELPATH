/**
 * MSW v2 handlers for the tracking app.
 *
 * Every success response uses the backend's `{ data, message }` envelope and
 * every failure uses `{ detail, code, meta?, errors? }`. Money is always a
 * fixed two-decimal string, exactly like the FastAPI responses.
 */
import { http, HttpResponse } from "msw";

import { ALLOWED_TRANSITIONS } from "@/types/domain";
import type {
  CartItem,
  Order,
  OrderListItem,
  OrderStatus,
  Page,
  Product,
  ProductAdmin,
  Shipping,
  TokenOut,
  TrackingOut,
  User,
} from "@/types/domain";
import { fromSubunits, sumMoney, toSubunits } from "@/utils/money";
import { getErrorMessage } from "@/constants/messages";

export const API_BASE = "http://localhost:8000/api/v1";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

const ORDER_STATUSES: readonly string[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && ORDER_STATUSES.includes(value);
}

function readNumber(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readParam(
  params: { readonly [key: string]: string | readonly string[] | undefined },
  key: string
): string {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function ok<T>(data: T, message: string) {
  return HttpResponse.json({ data, message });
}

function fail(status: number, code: string, detail: string, extra?: Record<string, unknown>) {
  return HttpResponse.json({ detail, code, ...extra }, { status });
}

/* ------------------------------------------------------------------ */
/* Fixtures                                                             */
/* ------------------------------------------------------------------ */

export const adminUser: User = {
  id: "00000000-0000-4000-8000-000000000001",
  full_name: "مدير النظام",
  email: "admin@example.com",
  phone: null,
  role: "ADMIN",
  is_active: true,
  created_at: "2026-01-01T08:00:00Z",
};

export const customerUser: User = {
  id: "00000000-0000-4000-8000-000000000002",
  full_name: "عميل تجريبي",
  email: "customer@example.com",
  phone: "0100000000",
  role: "CUSTOMER",
  is_active: true,
  created_at: "2026-01-01T08:00:00Z",
};

export const fallbackProduct: Product = {
  id: "p-2",
  name: "Wireless Mouse",
  sku: "ELEC-002",
  description: "ماوس لاسلكي",
  category: "Electronics",
  price: "25.50",
  image_url: null,
  in_stock: true,
};

export const productFixtures: Product[] = [
  {
    id: "p-1",
    name: "Laptop Pro 15",
    sku: "ELEC-001",
    description: "لابتوب احترافي",
    category: "Electronics",
    price: "999.00",
    image_url: null,
    in_stock: true,
  },
  fallbackProduct,
  {
    id: "p-3",
    name: "Ceramic Mug",
    sku: "HOME-001",
    description: null,
    category: "Home",
    price: "12.50",
    image_url: null,
    in_stock: true,
  },
];

const stockById: Record<string, number> = { "p-1": 12, "p-2": 40, "p-3": 50 };

export const cartProduct: CartItem = {
  product_id: fallbackProduct.id,
  name: fallbackProduct.name,
  sku: fallbackProduct.sku,
  price: fallbackProduct.price,
  image_url: fallbackProduct.image_url,
  quantity: 1,
  stock_quantity: 40,
};

export const orderShipping: Shipping = {
  name: "عميل تجريبي",
  phone: "0100000000",
  city: "Cairo",
  address: "123 Main St",
};

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    order_number: "ORD-2026-0001",
    status: "PENDING",
    payment_method: "COD",
    payment_status: "UNPAID",
    subtotal: "51.00",
    shipping_fee: "0.00",
    total_amount: "51.00",
    shipping: orderShipping,
    carrier: null,
    tracking_number: null,
    created_at: "2026-01-01T08:00:00Z",
    items: [
      {
        product_id: "p-2",
        product_name: "Wireless Mouse",
        sku: "ELEC-002",
        quantity: 2,
        unit_price: "25.50",
        line_total: "51.00",
      },
    ],
    customer: customerUser,
    ...overrides,
  };
}

export function makeListItem(overrides: Partial<OrderListItem> = {}): OrderListItem {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    order_number: "ORD-2026-0001",
    status: "PENDING",
    payment_method: "COD",
    payment_status: "UNPAID",
    total_amount: "51.00",
    items_count: 2,
    created_at: "2026-01-01T08:00:00Z",
    customer: customerUser,
    ...overrides,
  };
}

export function makeTracking(overrides: Partial<TrackingOut> = {}): TrackingOut {
  return {
    order_number: "ORD-2026-0001",
    status: "PENDING",
    carrier: null,
    tracking_number: null,
    events: [
      { status: "PENDING", note: "تم إنشاء الطلب", at: "2026-01-01T08:00:00Z" },
      { status: "CONFIRMED", note: "تم تأكيد الطلب", at: "2026-01-02T10:30:00Z" },
      { status: "SHIPPED", note: "تم تسليم الطلب للناقل", at: "2026-01-03T12:00:00Z" },
    ],
    ...overrides,
  };
}

export const cancelledTracking: TrackingOut = makeTracking({
  status: "CANCELLED",
  carrier: null,
  tracking_number: null,
  events: [
    { status: "PENDING", note: "تم إنشاء الطلب", at: "2026-01-01T08:00:00Z" },
    { status: "CANCELLED", note: "أُلغي الطلب", at: "2026-01-02T09:00:00Z" },
  ],
});

const cancelledOrderId = "33333333-3333-4333-8333-333333333333";

const demoOrders: Order[] = [
  makeOrder(),
  makeOrder({
    id: "22222222-2222-4222-8222-222222222222",
    order_number: "ORD-2026-0002",
    status: "DELIVERED",
    payment_status: "PAID",
    carrier: "Aramex",
    tracking_number: "TRACK-2026-0002",
  }),
  makeOrder({
    id: cancelledOrderId,
    order_number: "ORD-2026-0003",
    status: "CANCELLED",
  }),
];

/** Replays an idempotency key exactly like the backend's order table. */
const idempotencyStore = new Map<string, Order>();

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

export const handlers = [
  /* Auth */
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return fail(400, "VALIDATION_ERROR", getErrorMessage("VALIDATION_ERROR"));
    }
    const email = readString(body, "email").trim().toLowerCase();
    const password = readString(body, "password");

    if (email === adminUser.email && password === "Admin123!") {
      const tokenOut: TokenOut = {
        access_token: "test-token-admin",
        token_type: "bearer",
        expires_in: 1800,
        user: adminUser,
      };
      return ok(tokenOut, "Login successful");
    }
    if (email === customerUser.email && password === "Customer123!") {
      const tokenOut: TokenOut = {
        access_token: "test-token-customer",
        token_type: "bearer",
        expires_in: 1800,
        user: customerUser,
      };
      return ok(tokenOut, "Login successful");
    }
    return fail(401, "INVALID_CREDENTIALS", getErrorMessage("INVALID_CREDENTIALS"));
  }),

  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return fail(400, "VALIDATION_ERROR", getErrorMessage("VALIDATION_ERROR"));
    }
    const registered: User = {
      ...customerUser,
      full_name: readString(body, "full_name") || customerUser.full_name,
      email: readString(body, "email") || customerUser.email,
      phone: readString(body, "phone") || null,
    };
    return ok(registered, "User registered successfully");
  }),

  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    const authorization = request.headers.get("authorization") ?? "";
    if (authorization.includes("admin")) return ok(adminUser, "Current user");
    if (authorization.includes("customer")) return ok(customerUser, "Current user");
    return fail(401, "TOKEN_INVALID", getErrorMessage("TOKEN_INVALID"));
  }),

  /* Products — static paths first so `:id` never shadows them. */
  http.get(`${API_BASE}/products/categories`, () =>
    ok(["Electronics", "Fashion", "Home", "Sports"], "Categories")
  ),

  http.get(`${API_BASE}/products/low-stock`, () =>
    ok<ProductAdmin[]>(
      [
        {
          ...fallbackProduct,
          stock_quantity: 3,
          is_active: true,
          created_at: "2026-01-01T08:00:00Z",
          updated_at: "2026-01-01T08:00:00Z",
        },
      ],
      "Low stock products"
    )
  ),

  http.get(`${API_BASE}/products`, () => {
    const page: Page<Product> = {
      items: productFixtures,
      total: productFixtures.length,
      page: 1,
      page_size: 12,
    };
    return ok(page, "Products list");
  }),

  http.get(`${API_BASE}/products/:id`, ({ params }) => {
    const id = readParam(params, "id");
    const product = productFixtures.find((entry) => entry.id === id);
    if (!product) return fail(404, "PRODUCT_NOT_FOUND", getErrorMessage("PRODUCT_NOT_FOUND"));
    return ok(product, "Product details");
  }),

  http.post(`${API_BASE}/products`, async ({ request }) => {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return fail(400, "VALIDATION_ERROR", getErrorMessage("VALIDATION_ERROR"));
    }
    const created: Product = {
      ...fallbackProduct,
      id: crypto.randomUUID(),
      name: readString(body, "name") || fallbackProduct.name,
      sku: readString(body, "sku") || fallbackProduct.sku,
      price: readString(body, "price") || "0.00",
    };
    return ok(created, "Product created");
  }),

  http.patch(`${API_BASE}/products/:id`, async ({ request, params }) => {
    const id = readParam(params, "id");
    const body: unknown = await request.json();
    const product = productFixtures.find((entry) => entry.id === id);
    if (!product) return fail(404, "PRODUCT_NOT_FOUND", getErrorMessage("PRODUCT_NOT_FOUND"));
    const patch: Partial<Product> = isRecord(body)
      ? {
          name: readString(body, "name") || product.name,
          price: readString(body, "price") || product.price,
        }
      : {};
    return ok({ ...product, ...patch }, "Product updated");
  }),

  http.delete(`${API_BASE}/products/:id`, ({ params }) => {
    const product = productFixtures.find((entry) => entry.id === readParam(params, "id"));
    if (!product) return fail(404, "PRODUCT_NOT_FOUND", getErrorMessage("PRODUCT_NOT_FOUND"));
    return ok({ id: product.id, is_active: false }, "Product disabled");
  }),

  /* Orders */
  http.post(`${API_BASE}/orders`, async ({ request }) => {
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey || idempotencyKey.length < 8) {
      return fail(400, "VALIDATION_ERROR", getErrorMessage("VALIDATION_ERROR"), {
        errors: ["Idempotency-Key is required"],
      });
    }
    const replayed = idempotencyStore.get(idempotencyKey);
    if (replayed) return ok(replayed, "Order created");

    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return fail(400, "VALIDATION_ERROR", getErrorMessage("VALIDATION_ERROR"));
    }
    const rawItems: unknown = body["items"];
    let insufficientStock = false;
    const items: Order["items"] = Array.isArray(rawItems)
      ? rawItems.flatMap((entry): Order["items"] => {
          if (!isRecord(entry)) return [];
          const productId = readString(entry, "product_id");
          const quantity = readNumber(entry, "quantity");
          const product = productFixtures.find((candidate) => candidate.id === productId);
          if (!product) return [];
          if (quantity > (stockById[product.id] ?? 0)) {
            insufficientStock = true;
            return [];
          }
          return [
            {
              product_id: product.id,
              product_name: product.name,
              sku: product.sku,
              quantity,
              unit_price: product.price,
              line_total: fromSubunits(toSubunits(product.price) * quantity),
            },
          ];
        })
      : [];
    if (insufficientStock) {
      return fail(409, "INSUFFICIENT_STOCK", getErrorMessage("INSUFFICIENT_STOCK"));
    }

    const rawShipping: unknown = body["shipping"];
    const shipping: Shipping = isRecord(rawShipping)
      ? {
          name: readString(rawShipping, "name"),
          phone: readString(rawShipping, "phone"),
          city: readString(rawShipping, "city"),
          address: readString(rawShipping, "address"),
        }
      : { name: "", phone: "", city: "", address: "" };

    const paymentMethod = readString(body, "payment_method") === "CARD" ? "CARD" : "COD";
    const subtotal = sumMoney(items.map((item) => item.line_total));
    const created = makeOrder({
      id: crypto.randomUUID(),
      order_number: "ORD-2026-0004",
      status: "PENDING",
      payment_method: paymentMethod,
      payment_status: "UNPAID",
      subtotal,
      shipping_fee: "0.00",
      total_amount: subtotal,
      shipping,
      items,
      customer: customerUser,
    });
    idempotencyStore.set(idempotencyKey, created);
    return ok(created, "Order created");
  }),

  http.get(`${API_BASE}/orders`, () => {
    const page: Page<OrderListItem> = {
      items: demoOrders.map((order) => makeListItem({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
      })),
      total: demoOrders.length,
      page: 1,
      page_size: 12,
    };
    return ok(page, "Orders list");
  }),

  http.get(`${API_BASE}/orders/:id/tracking`, ({ params }) => {
    const id = readParam(params, "id");
    if (id === cancelledOrderId) return ok(cancelledTracking, "Tracking details");
    const order = demoOrders.find((entry) => entry.id === id);
    if (!order) return fail(404, "ORDER_NOT_FOUND", getErrorMessage("ORDER_NOT_FOUND"));
    return ok(
      makeTracking({
        order_number: order.order_number,
        status: order.status,
        carrier: order.carrier,
        tracking_number: order.tracking_number,
      }),
      "Tracking details"
    );
  }),

  http.get(`${API_BASE}/orders/:id`, ({ params }) => {
    const order = demoOrders.find((entry) => entry.id === readParam(params, "id"));
    if (!order) return fail(404, "ORDER_NOT_FOUND", getErrorMessage("ORDER_NOT_FOUND"));
    return ok(order, "Order details");
  }),

  http.post(`${API_BASE}/orders/:id/cancel`, ({ params }) => {
    const order = demoOrders.find((entry) => entry.id === readParam(params, "id"));
    if (!order) return fail(404, "ORDER_NOT_FOUND", getErrorMessage("ORDER_NOT_FOUND"));
    if (order.status === "CANCELLED" || order.status === "DELIVERED") {
      return fail(409, "ORDER_NOT_CANCELLABLE", getErrorMessage("ORDER_NOT_CANCELLABLE"));
    }
    return ok(makeOrder({ ...order, status: "CANCELLED" }), "Order cancelled");
  }),

  http.patch(`${API_BASE}/orders/:id/status`, async ({ request, params }) => {
    const order = demoOrders.find((entry) => entry.id === readParam(params, "id"));
    if (!order) return fail(404, "ORDER_NOT_FOUND", getErrorMessage("ORDER_NOT_FOUND"));
    const body: unknown = await request.json();
    const rawNext: unknown = isRecord(body) ? body["status"] : undefined;
    if (!isOrderStatus(rawNext)) {
      return fail(400, "VALIDATION_ERROR", getErrorMessage("VALIDATION_ERROR"));
    }
    if (!ALLOWED_TRANSITIONS[order.status].includes(rawNext)) {
      return fail(409, "INVALID_STATUS_TRANSITION", getErrorMessage("INVALID_STATUS_TRANSITION"));
    }
    return ok(makeOrder({ ...order, status: rawNext }), "Order status updated");
  }),

  http.post(`${API_BASE}/orders/:id/ship`, async ({ request, params }) => {
    const order = demoOrders.find((entry) => entry.id === readParam(params, "id"));
    if (!order) return fail(404, "ORDER_NOT_FOUND", getErrorMessage("ORDER_NOT_FOUND"));
    const body: unknown = await request.json();
    const carrier = isRecord(body) ? readString(body, "carrier").trim() : "";
    const trackingNumber = isRecord(body) ? readString(body, "tracking_number").trim() : "";
    if (!carrier || !trackingNumber) {
      return fail(400, "VALIDATION_ERROR", getErrorMessage("VALIDATION_ERROR"));
    }
    if (trackingNumber === "DUP-123") {
      return fail(
        409,
        "DUPLICATE_TRACKING_NUMBER",
        getErrorMessage("DUPLICATE_TRACKING_NUMBER")
      );
    }
    return ok(
      makeOrder({
        ...order,
        status: "SHIPPED",
        carrier,
        tracking_number: trackingNumber,
      }),
      "Order shipped"
    );
  }),

  http.patch(`${API_BASE}/orders/:id/shipping`, async ({ request, params }) => {
    const order = demoOrders.find((entry) => entry.id === readParam(params, "id"));
    if (!order) return fail(404, "ORDER_NOT_FOUND", getErrorMessage("ORDER_NOT_FOUND"));
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return fail(400, "VALIDATION_ERROR", getErrorMessage("VALIDATION_ERROR"));
    }
    return ok(
      makeOrder({
        ...order,
        carrier: readString(body, "carrier") || order.carrier,
        tracking_number: readString(body, "tracking_number") || order.tracking_number,
      }),
      "Shipping information updated"
    );
  }),

  /* Reports and users (used by admin pages on mount). */
  http.get(`${API_BASE}/reports/*`, () =>
    ok(
      {
        today: { order_count: 2, sales_total: "102.00" },
        period: {
          order_count: 3,
          sales_total: "153.00",
          average_order: "51.00",
          from: "2026-01-01",
          to: "2026-01-31",
        },
        orders_by_status: {
          PENDING: 1,
          CONFIRMED: 0,
          PACKED: 0,
          SHIPPED: 0,
          OUT_FOR_DELIVERY: 0,
          DELIVERED: 1,
          CANCELLED: 1,
        },
        pending_count: 1,
        low_stock_count: 1,
        top_products: [],
        daily_sales: [],
      },
      "Dashboard report"
    )
  ),

  http.get(`${API_BASE}/users`, () => {
    const page: Page<User> = {
      items: [adminUser, customerUser],
      total: 2,
      page: 1,
      page_size: 12,
    };
    return ok(page, "Users list");
  }),

  http.post(`${API_BASE}/users`, async ({ request }) => {
    const body: unknown = await request.json();
    const role = isRecord(body) && readString(body, "role") === "ADMIN" ? "ADMIN" : "CUSTOMER";
    const created: User = {
      ...customerUser,
      id: crypto.randomUUID(),
      full_name: isRecord(body) ? readString(body, "full_name") : customerUser.full_name,
      email: isRecord(body) ? readString(body, "email") : customerUser.email,
      role,
    };
    return ok(created, "User created");
  }),

  http.patch(`${API_BASE}/users/:id`, async ({ request, params }) => {
    const body: unknown = await request.json();
    const patch: Partial<User> = isRecord(body)
      ? { full_name: readString(body, "full_name") || undefined }
      : {};
    return ok(
      { ...customerUser, id: readParam(params, "id"), ...patch },
      "User updated"
    );
  }),
];
