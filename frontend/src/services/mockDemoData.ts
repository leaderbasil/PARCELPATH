// Client-side mock dataset for the browser-only PARCELPATH demo.
// Shapes intentionally match the FastAPI response contracts so every existing
// page, hook and table keeps working without a backend or database.

import type {
  CustomerBrief,
  Order,
  OrderListItem,
  PaymentMethod,
  ProductAdmin,
  User,
} from "@/types/domain";
import { googleMapsSearchUrl } from "@/utils/googleMaps";
import { fromSubunits, toSubunits } from "@/utils/money";

const STORAGE_NAMESPACE = "parcelpath.demo.v4";
const STORAGE_KEYS = {
  products: `${STORAGE_NAMESPACE}.products`,
  orders: `${STORAGE_NAMESPACE}.orders`,
  users: `${STORAGE_NAMESPACE}.users`,
  categories: `${STORAGE_NAMESPACE}.categories`,
} as const;

export const DEMO_ADMIN_ID = "demo-admin-id";
export const DEMO_CUSTOMER_ID = "demo-customer-id";
export const DEMO_COURIER_PHONE = "0501234567";

const DEMO_ADMIN_NAME = "مدير التجريبة";
const DEMO_ADMIN_EMAIL = "demo@parcelpath.local";

export interface DemoOrder extends Order {
  idempotency_key?: string;
}

function isoDaysAgo(days: number, hour = 9, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readCollection<T>(key: string, seed: T[]): T[] {
  const fallback = (): T[] => clone(seed);
  if (typeof localStorage === "undefined") return fallback();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const seeded = fallback();
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback();
  } catch {
    const seeded = fallback();
    try {
      localStorage.setItem(key, JSON.stringify(seeded));
    } catch {
      // Storage may be unavailable; the demo still works for this page session.
    }
    return seeded;
  }
}

function writeCollection<T>(key: string, value: T[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/private-browsing errors.
  }
}

const INITIAL_DEMO_PRODUCTS: ProductAdmin[] = [
  {
    id: "prod-1",
    name: "حليب طازج كامل الدسم 1 لتر",
    sku: "PP-MILK-1L",
    description: "حليب طازج معبأ، مناسب للاستخدام اليومي.",
    category: "ألبان وأجبان",
    price: "1.75",
    image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80",
    in_stock: true,
    stock_quantity: 45,
    is_active: true,
    created_at: isoDaysAgo(90, 8),
    updated_at: isoDaysAgo(3, 8),
  },
  {
    id: "prod-2",
    name: "خبز عربي أبيض - كيس",
    sku: "PP-BREAD-01",
    description: "خبز طازج يوميًا.",
    category: "مخبوزات",
    price: "1.00",
    image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
    in_stock: true,
    stock_quantity: 80,
    is_active: true,
    created_at: isoDaysAgo(88, 8),
    updated_at: isoDaysAgo(2, 8),
  },
  {
    id: "prod-3",
    name: "بيض طازج - طبق 12 بيضة",
    sku: "PP-EGGS-12",
    description: "بيض دجاج طازج.",
    category: "ألبان وأجبان",
    price: "3.50",
    image_url: "https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?auto=format&fit=crop&w=600&q=80",
    in_stock: true,
    stock_quantity: 30,
    is_active: true,
    created_at: isoDaysAgo(85, 8),
    updated_at: isoDaysAgo(4, 8),
  },
  {
    id: "prod-4",
    name: "أرز بسمتي فاخر 5 كجم",
    sku: "PP-RICE-5KG",
    description: "أرز بسمتي بحبة طويلة.",
    category: "حبوب ومواد جافة",
    price: "9.50",
    image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
    in_stock: true,
    stock_quantity: 25,
    is_active: true,
    created_at: isoDaysAgo(80, 8),
    updated_at: isoDaysAgo(5, 8),
  },
  {
    id: "prod-5",
    name: "زيت نباتي للقلي 1.5 لتر",
    sku: "PP-OIL-15L",
    description: "زيت نباتي نقي.",
    category: "زيوت وسمن",
    price: "4.50",
    image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
    in_stock: true,
    stock_quantity: 4,
    is_active: true,
    created_at: isoDaysAgo(75, 8),
    updated_at: isoDaysAgo(1, 8),
  },
  {
    id: "prod-6",
    name: "مياه صحية - كرتونة 24 زجاجة",
    sku: "PP-WATER-24",
    description: "مياه شرب معبأة.",
    category: "مشروبات ومياه",
    price: "6.00",
    image_url: "https://images.unsplash.com/photo-1560023907-5f339617ea30?auto=format&fit=crop&w=600&q=80",
    in_stock: true,
    stock_quantity: 60,
    is_active: true,
    created_at: isoDaysAgo(70, 8),
    updated_at: isoDaysAgo(6, 8),
  },
  {
    id: "prod-7",
    name: "شاي أسود - علبة 250 جرام",
    sku: "PP-TEA-250",
    description: "شاي أسود غني بالنكهة.",
    category: "مشروبات ومياه",
    price: "2.75",
    image_url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
    in_stock: false,
    stock_quantity: 0,
    is_active: true,
    created_at: isoDaysAgo(65, 8),
    updated_at: isoDaysAgo(1, 8),
  },
  {
    id: "prod-8",
    name: "عسل نحل طبيعي 500 جرام",
    sku: "PP-HONEY-500",
    description: "عسل نحل خام.",
    category: "محليات ومعلبات",
    price: "9.00",
    image_url: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=600&q=80",
    in_stock: true,
    stock_quantity: 15,
    is_active: true,
    created_at: isoDaysAgo(60, 8),
    updated_at: isoDaysAgo(7, 8),
  },
];

const INITIAL_DEMO_CATEGORIES = [
  ...new Set(
    INITIAL_DEMO_PRODUCTS.filter((product) => product.is_active && product.category).map(
      (product) => product.category as string
    )
  ),
];

const INITIAL_DEMO_USERS: User[] = [
  {
    id: DEMO_ADMIN_ID,
    full_name: DEMO_ADMIN_NAME,
    email: DEMO_ADMIN_EMAIL,
    phone: "0500000001",
    role: "ADMIN",
    is_active: true,
    created_at: isoDaysAgo(120, 8),
  },
  {
    id: DEMO_CUSTOMER_ID,
    full_name: "عميل التجريبة",
    email: "customer@parcelpath.local",
    phone: "0500000002",
    role: "CUSTOMER",
    is_active: true,
    created_at: isoDaysAgo(45, 8),
  },
];

function findInitialProduct(productId: string): ProductAdmin {
  const product = INITIAL_DEMO_PRODUCTS.find((item) => item.id === productId);
  if (!product) throw new Error(`Unknown demo product: ${productId}`);
  return product;
}

function demoCustomer(user: User): CustomerBrief {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
  };
}

interface SeedOrderInput {
  id: string;
  sequence: number;
  daysAgo: number;
  hour: number;
  status: Order["status"];
  paymentMethod: PaymentMethod;
  items: Array<{ productId: string; quantity: number }>;
}

function buildDemoOrder(input: SeedOrderInput): DemoOrder {
  const customer = demoCustomer(INITIAL_DEMO_USERS[1] as User);
  const items = input.items.map((item, index) => {
    const product = findInitialProduct(item.productId);
    return {
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      quantity: item.quantity,
      unit_price: product.price,
      line_total: fromSubunits(toSubunits(product.price) * item.quantity),
      id: `${input.id}-item-${index + 1}`,
    };
  });
  const subtotalCents = items.reduce((total, item) => total + toSubunits(item.line_total), 0);
  const shippingCents = subtotalCents < 10000 ? 500 : 0;
  const tracked = ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(input.status);
  const mapQuery = "الرياض، شارع التجريبة، مبنى 12";
  const year = new Date().getFullYear();

  return {
    id: input.id,
    order_number: `PP-${year}-${String(input.sequence).padStart(4, "0")}`,
    status: input.status,
    payment_method: input.paymentMethod,
    payment_status:
      input.paymentMethod === "CARD" || input.status === "DELIVERED" ? "PAID" : "UNPAID",
    subtotal: fromSubunits(subtotalCents),
    shipping_fee: fromSubunits(shippingCents),
    total_amount: fromSubunits(subtotalCents + shippingCents),
    shipping: {
      name: customer.full_name,
      phone: customer.phone ?? "0500000002",
      city: "الرياض",
      address: "شارع التجريبة، مبنى 12",
      map_query: mapQuery,
      map_url: googleMapsSearchUrl(mapQuery),
      latitude: 24.7136,
      longitude: 46.6753,
    },
    carrier: tracked ? "PARCELPATH Express" : null,
    courier_phone: tracked ? DEMO_COURIER_PHONE : null,
    tracking_number: tracked ? `PP${String(input.sequence).padStart(9, "0")}` : null,
    created_at: isoDaysAgo(input.daysAgo, input.hour, 15),
    items: items.map(({ id: _id, ...rest }) => rest),
    customer,
  };
}

const INITIAL_DEMO_ORDERS: DemoOrder[] = [
  buildDemoOrder({ id: "order-101", sequence: 1, daysAgo: 12, hour: 9, status: "DELIVERED", paymentMethod: "CARD", items: [{ productId: "prod-1", quantity: 2 }, { productId: "prod-2", quantity: 1 }] }),
  buildDemoOrder({ id: "order-102", sequence: 2, daysAgo: 10, hour: 11, status: "OUT_FOR_DELIVERY", paymentMethod: "COD", items: [{ productId: "prod-4", quantity: 1 }, { productId: "prod-6", quantity: 1 }] }),
  buildDemoOrder({ id: "order-103", sequence: 3, daysAgo: 8, hour: 13, status: "SHIPPED", paymentMethod: "CARD", items: [{ productId: "prod-8", quantity: 2 }] }),
  buildDemoOrder({ id: "order-104", sequence: 4, daysAgo: 6, hour: 15, status: "PACKED", paymentMethod: "COD", items: [{ productId: "prod-3", quantity: 1 }, { productId: "prod-5", quantity: 2 }] }),
  buildDemoOrder({ id: "order-105", sequence: 5, daysAgo: 4, hour: 10, status: "CONFIRMED", paymentMethod: "CARD", items: [{ productId: "prod-6", quantity: 2 }] }),
  buildDemoOrder({ id: "order-106", sequence: 6, daysAgo: 2, hour: 12, status: "PENDING", paymentMethod: "COD", items: [{ productId: "prod-1", quantity: 3 }, { productId: "prod-2", quantity: 2 }] }),
  buildDemoOrder({ id: "order-107", sequence: 7, daysAgo: 1, hour: 9, status: "DELIVERED", paymentMethod: "CARD", items: [{ productId: "prod-4", quantity: 1 }, { productId: "prod-8", quantity: 1 }] }),
  buildDemoOrder({ id: "order-108", sequence: 8, daysAgo: 1, hour: 17, status: "CANCELLED", paymentMethod: "COD", items: [{ productId: "prod-7", quantity: 1 }] }),
  buildDemoOrder({ id: "order-109", sequence: 9, daysAgo: 0, hour: 8, status: "PENDING", paymentMethod: "CARD", items: [{ productId: "prod-3", quantity: 2 }, { productId: "prod-5", quantity: 1 }] }),
  buildDemoOrder({ id: "order-110", sequence: 10, daysAgo: 0, hour: 10, status: "CONFIRMED", paymentMethod: "COD", items: [{ productId: "prod-2", quantity: 4 }] }),
];

export function getStoredDemoProducts(): ProductAdmin[] {
  return readCollection(STORAGE_KEYS.products, INITIAL_DEMO_PRODUCTS);
}

export function saveDemoProducts(products: ProductAdmin[]): void {
  writeCollection(STORAGE_KEYS.products, products);
}

export function getStoredDemoCategories(): string[] {
  return readCollection(STORAGE_KEYS.categories, INITIAL_DEMO_CATEGORIES);
}

export function saveDemoCategory(category: string): void {
  const value = category.trim();
  if (!value) return;
  const categories = getStoredDemoCategories();
  if (categories.some((item) => item.toLowerCase() === value.toLowerCase())) return;
  categories.push(value);
  categories.sort((a, b) => a.localeCompare(b, "ar"));
  writeCollection(STORAGE_KEYS.categories, categories);
}

export function getStoredDemoOrders(): DemoOrder[] {
  return readCollection(STORAGE_KEYS.orders, INITIAL_DEMO_ORDERS);
}

export function saveDemoOrders(orders: DemoOrder[]): void {
  writeCollection(STORAGE_KEYS.orders, orders);
}

export function getStoredDemoUsers(): User[] {
  return readCollection(STORAGE_KEYS.users, INITIAL_DEMO_USERS);
}

export function saveDemoUsers(users: User[]): void {
  writeCollection(STORAGE_KEYS.users, users);
}

export function ensureDemoAdmin(email = DEMO_ADMIN_EMAIL): User {
  const normalized = email.trim().toLowerCase();
  const users = getStoredDemoUsers();
  const index = users.findIndex((user) => user.id === DEMO_ADMIN_ID);
  const now = new Date().toISOString();

  if (index === -1) {
    const admin: User = {
      id: DEMO_ADMIN_ID,
      full_name: DEMO_ADMIN_NAME,
      email: normalized,
      phone: "0500000001",
      role: "ADMIN",
      is_active: true,
      created_at: now,
    };
    users.unshift(admin);
    saveDemoUsers(users);
    return clone(admin);
  }

  const admin = users[index] as User;
  let changed = false;
  if (admin.email !== normalized) {
    admin.email = normalized;
    changed = true;
  }
  if (!admin.is_active) {
    admin.is_active = true;
    changed = true;
  }
  if (changed) saveDemoUsers(users);
  return clone(admin);
}

export function getDemoAdminUser(): User {
  const users = getStoredDemoUsers();
  const admin = users.find((user) => user.id === DEMO_ADMIN_ID);
  return admin ? clone(admin) : ensureDemoAdmin();
}

export function getDemoCustomerUser(): User {
  const users = getStoredDemoUsers();
  const customer =
    users.find((user) => user.id === DEMO_CUSTOMER_ID) ??
    users.find((user) => user.role === "CUSTOMER" && user.is_active);
  if (customer) return clone(customer);
  const fallback = INITIAL_DEMO_USERS[1] as User;
  users.unshift(clone(fallback));
  saveDemoUsers(users);
  return clone(fallback);
}

export function toCustomerBrief(user: User): CustomerBrief {
  return demoCustomer(user);
}

export function toOrderListItem(order: Order): OrderListItem {
  return {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    total_amount: order.total_amount,
    items_count: order.items.length,
    created_at: order.created_at,
    courier_phone: order.courier_phone ?? null,
    customer: order.customer ?? null,
  };
}

export function nextOrderNumber(orders: DemoOrder[]): string {
  const year = new Date().getFullYear();
  const max = orders.reduce((highest, order) => {
    const match = /^PP-\d{4}-(\d+)$/.exec(order.order_number);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `PP-${year}-${String(max + 1).padStart(4, "0")}`;
}

export function makeDemoId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function resetDemoData(): void {
  if (typeof localStorage === "undefined") return;
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}
