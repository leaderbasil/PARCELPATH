import { UI } from "@/constants/ui";

export interface PageMeta {
  title: string;
  description: string;
}

const PAGES: ReadonlyArray<{ match: RegExp; meta: PageMeta }> = [
  { match: /^\/admin\/orders\/[^/]+$/, meta: { title: "تفاصيل الطلب", description: UI.admin.ordersDescription } },
  { match: /^\/admin\/orders$/, meta: { title: UI.nav.orders, description: UI.admin.ordersDescription } },
  { match: /^\/admin\/products$/, meta: { title: UI.nav.products, description: UI.admin.productsDescription } },
  { match: /^\/admin\/users$/, meta: { title: UI.nav.users, description: UI.admin.usersDescription } },
  { match: /^\/admin$/, meta: { title: UI.admin.dashboard, description: UI.admin.dashboardDescription } },
  { match: /^\/orders\/[^/]+$/, meta: { title: UI.orders.details, description: UI.orders.track } },
  { match: /^\/orders$/, meta: { title: UI.orders.title, description: UI.orders.track } },
  { match: /^\/products\/[^/]+$/, meta: { title: UI.catalog.viewDetails, description: UI.catalog.subtitle } },
  { match: /^\/cart$/, meta: { title: UI.cart.title, description: UI.cart.continueShopping } },
  { match: /^\/checkout$/, meta: { title: UI.checkout.title, description: UI.checkout.shippingInfo } },
  { match: /^\/login$/, meta: { title: UI.auth.loginTitle, description: UI.appName } },
  { match: /^\/register$/, meta: { title: UI.auth.registerTitle, description: UI.appName } },
  { match: /^\/$/, meta: { title: UI.catalog.title, description: UI.catalog.subtitle } },
];

export function pageMetaForPath(pathname: string): PageMeta {
  return PAGES.find((page) => page.match.test(pathname))?.meta ?? { title: UI.appName, description: "" };
}
