import { getCurrentLocale, getUI, type Locale } from "@/i18n";

export interface PageMeta {
  title: string;
  description: string;
}

export function pageMetaForPath(pathname: string, locale: Locale = getCurrentLocale()): PageMeta {
  const ui = getUI(locale);
  const pages: ReadonlyArray<{ match: RegExp; meta: PageMeta }> = [
    {
      match: /^\/admin\/orders\/[^/]+$/,
      meta: { title: ui.orders.details, description: ui.admin.ordersDescription },
    },
    { match: /^\/admin\/orders$/, meta: { title: ui.nav.orders, description: ui.admin.ordersDescription } },
    { match: /^\/admin\/products$/, meta: { title: ui.nav.products, description: ui.admin.productsDescription } },
    { match: /^\/admin\/users$/, meta: { title: ui.nav.users, description: ui.admin.usersDescription } },
    { match: /^\/admin$/, meta: { title: ui.admin.dashboard, description: ui.admin.dashboardDescription } },
    { match: /^\/orders\/[^/]+$/, meta: { title: ui.orders.details, description: ui.orders.track } },
    { match: /^\/orders$/, meta: { title: ui.orders.title, description: ui.orders.track } },
    { match: /^\/products\/[^/]+$/, meta: { title: ui.catalog.viewDetails, description: ui.catalog.subtitle } },
    { match: /^\/cart$/, meta: { title: ui.cart.title, description: ui.cart.continueShopping } },
    { match: /^\/checkout$/, meta: { title: ui.checkout.title, description: ui.checkout.shippingInfo } },
    { match: /^\/login$/, meta: { title: ui.auth.loginTitle, description: ui.appName } },
    { match: /^\/register$/, meta: { title: ui.auth.registerTitle, description: ui.appName } },
    { match: /^\/$/, meta: { title: ui.catalog.title, description: ui.catalog.subtitle } },
  ];
  return pages.find((page) => page.match.test(pathname))?.meta ?? { title: ui.appName, description: "" };
}
