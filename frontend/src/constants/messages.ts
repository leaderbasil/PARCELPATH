import type { OrderStatus } from "@/types/domain";

type StatusStyle = { label: string; badge: string };

export const STATUS_MESSAGES: Record<OrderStatus, StatusStyle> = {
  PENDING: { label: "قيد الانتظار", badge: "bg-warning-soft text-warning-strong" },
  CONFIRMED: { label: "مؤكّد", badge: "bg-primary-soft text-primary-strong" },
  PACKED: { label: "مجهّز", badge: "bg-primary-soft text-primary-strong" },
  SHIPPED: { label: "تم الشحن", badge: "bg-primary-soft text-primary-strong" },
  OUT_FOR_DELIVERY: { label: "خارج للتوصيل", badge: "bg-primary-soft text-primary-strong" },
  DELIVERED: { label: "تم التسليم", badge: "bg-success-soft text-success-strong" },
  CANCELLED: { label: "ملغي", badge: "bg-danger-soft text-danger" },
} satisfies Record<OrderStatus, StatusStyle>;

const ERROR_MESSAGES: Record<string, string> = {
  BAD_REQUEST: "يرجى التحقق من البيانات المدخلة.",
  NOT_FOUND: "البيانات المطلوبة غير موجودة.",
  METHOD_NOT_ALLOWED: "هذا الإجراء غير مدعوم حاليًا.",
  VALIDATION_ERROR: "يرجى التحقق من البيانات المدخلة.",
  TOKEN_INVALID: "انتهت جلستك. سجّل الدخول من جديد.",
  INVALID_CREDENTIALS: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  USER_INACTIVE: "تم تعطيل هذا الحساب.",
  FORBIDDEN: "لا تملك صلاحية للقيام بهذا الإجراء.",
  DUPLICATE_EMAIL: "البريد الإلكتروني مستخدم بالفعل.",
  USER_NOT_FOUND: "المستخدم غير موجود.",
  DUPLICATE_SKU: "رمز المنتج مستخدم بالفعل.",
  DUPLICATE_TRACKING_NUMBER: "رقم التتبّع مستخدم بالفعل.",
  IDEMPOTENCY_KEY_CONFLICT: "مفتاح الطلب يعود لمستخدم آخر.",
  PRODUCT_NOT_FOUND: "المنتج غير موجود.",
  PRODUCT_INACTIVE: "أحد المنتجات لم يعد متاحًا.",
  INSUFFICIENT_STOCK: "الكمية المطلوبة غير متوفرة من المخزون.",
  EMPTY_CART: "سلة المشتريات فارغة.",
  ORDER_NOT_FOUND: "الطلب غير موجود.",
  CANNOT_MODIFY_SELF: "لا يمكنك تعديل حسابك بهذه الطريقة.",
  LAST_ADMIN: "لا يمكن تعطيل آخر مدير في النظام.",
  INVALID_STATUS_TRANSITION: "لا يمكن تغيير حالة الطلب إلى هذه الحالة.",
  ORDER_NOT_CANCELLABLE: "لا يمكن إلغاء الطلب في حالته الحالية.",
  ORDER_ALREADY_CANCELLED: "تم إلغاء هذا الطلب مسبقًا.",
  SHIPPING_INFO_REQUIRED: "بيانات الشحن مطلوبة.",
  SHIPPING_NOT_EDITABLE: "لا يمكن تعديل بيانات الشحن في هذه الحالة.",
  INVALID_DATE_RANGE: "الفترة الزمنية غير صالحة.",
  DATABASE_UNAVAILABLE: "الخدمة غير متاحة حاليًا، حاول لاحقًا.",
  NETWORK_ERROR: "تعذّر الاتصال بالخادم. تحقق من اتصالك وأعد المحاولة.",
  INTERNAL_ERROR: "حدث خطأ غير متوقع، حاول لاحقًا.",
};

export function getErrorMessage(code: string, fallback = ERROR_MESSAGES["INTERNAL_ERROR"] ?? "حدث خطأ"): string {
  return ERROR_MESSAGES[code] ?? fallback;
}

export function statusLabel(status: OrderStatus): string {
  return STATUS_MESSAGES[status].label;
}

export function statusBadgeClass(status: OrderStatus): string {
  return STATUS_MESSAGES[status].badge;
}
