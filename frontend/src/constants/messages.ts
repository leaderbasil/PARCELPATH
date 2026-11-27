import { getCurrentLocale, getTranslation, translate, type Locale } from "@/i18n";
import type { OrderStatus } from "@/types/domain";

type StatusStyle = { label: string; badge: string };

const STATUS_BADGES: Record<OrderStatus, string> = {
  PENDING: "bg-warning-soft text-warning-strong",
  CONFIRMED: "bg-primary-soft text-primary-strong",
  PACKED: "bg-primary-soft text-primary-strong",
  SHIPPED: "bg-primary-soft text-primary-strong",
  OUT_FOR_DELIVERY: "bg-primary-soft text-primary-strong",
  DELIVERED: "bg-success-soft text-success-strong",
  CANCELLED: "bg-danger-soft text-danger",
};

/** Kept for callers that need keys + styling; labels are locale-aware via statusLabel(). */
export const STATUS_MESSAGES: Record<OrderStatus, StatusStyle> = {
  PENDING: { label: getTranslation("ar").statuses.PENDING, badge: STATUS_BADGES.PENDING },
  CONFIRMED: { label: getTranslation("ar").statuses.CONFIRMED, badge: STATUS_BADGES.CONFIRMED },
  PACKED: { label: getTranslation("ar").statuses.PACKED, badge: STATUS_BADGES.PACKED },
  SHIPPED: { label: getTranslation("ar").statuses.SHIPPED, badge: STATUS_BADGES.SHIPPED },
  OUT_FOR_DELIVERY: {
    label: getTranslation("ar").statuses.OUT_FOR_DELIVERY,
    badge: STATUS_BADGES.OUT_FOR_DELIVERY,
  },
  DELIVERED: { label: getTranslation("ar").statuses.DELIVERED, badge: STATUS_BADGES.DELIVERED },
  CANCELLED: { label: getTranslation("ar").statuses.CANCELLED, badge: STATUS_BADGES.CANCELLED },
};

export function getErrorMessage(
  code: string,
  fallback?: string,
  locale: Locale = getCurrentLocale()
): string {
  const messages = getTranslation(locale).errors as Record<string, string>;
  return messages[code] ?? fallback ?? translate("ui.common.error", locale);
}

export function statusLabel(status: OrderStatus, locale: Locale = getCurrentLocale()): string {
  return getTranslation(locale).statuses[status];
}

export function statusBadgeClass(status: OrderStatus): string {
  return STATUS_BADGES[status];
}
