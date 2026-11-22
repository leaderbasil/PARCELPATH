# عقد الـ API — `/api/v1`

## الاتفاقيات

- النجاح: `{"data": ..., "message": "..."}` (200/201/204). القوائم: `{"data": {"items": [], "total": 0, "page": 1, "page_size": 20}}`.
- الخطأ: `{"detail": "...", "code": "..."}` مع `errors`/`meta` عند الحاجة.
- المبالغ نصوص (`"12.50"`) · التواريخ ISO 8601 · المعرّفات UUID.
- المسارات المحمية تتطلب `Authorization: Bearer <token>`.
- `/health` خارج البادئة، ويستخدم للـ healthcheck في Docker.

## رموز الأخطاء

| Code | HTTP | المعنى |
|---|---|---|
| `VALIDATION_ERROR` | 422 | فشل التحقق |
| `INVALID_CREDENTIALS` / `TOKEN_INVALID` | 401 | دخول خاطئ / Token غير صالح |
| `FORBIDDEN` / `USER_INACTIVE` | 403 | لا صلاحية / حساب معطّل |
| `USER_NOT_FOUND` / `PRODUCT_NOT_FOUND` / `ORDER_NOT_FOUND` | 404 | غير موجود |
| `DUPLICATE_EMAIL` / `DUPLICATE_SKU` / `DUPLICATE_TRACKING_NUMBER` | 409 | تكرار |
| `PRODUCT_INACTIVE` | 409 | منتج معطّل في طلب |
| `INSUFFICIENT_STOCK` | 409 | مخزون غير كافٍ (`meta.items` بكل البنود الفاشلة) |
| `INVALID_STATUS_TRANSITION` / `ORDER_NOT_CANCELLABLE` / `ORDER_ALREADY_CANCELLED` | 409 | حالة الطلب |
| `SHIPPING_INFO_REQUIRED` / `EMPTY_CART` | 422 | بيانات ناقصة |
| `IDEMPOTENCY_KEY_CONFLICT` | 409 | المفتاح يخص مستخدمًا آخر |
| `INVALID_DATE_RANGE` | 400 | نطاق تاريخ خاطئ |
| `CANNOT_MODIFY_SELF` / `LAST_ADMIN` / `SHIPPING_NOT_EDITABLE` | 409 | حماية القواعد |
| `INTERNAL_ERROR` | 500 | خطأ غير متوقع (رسالة عامة) |

## المصادقة والمستخدمون

| Method | Endpoint | الصلاحية | الوصف |
|---|---|---|---|
| POST | `/auth/register` | عام | تسجيل عميل (دور CUSTOMER دائمًا) ← 201 |
| POST | `/auth/login` | عام | `{access_token, token_type, expires_in, user}` |
| GET | `/auth/me` | الكل | المستخدم الحالي |
| GET | `/health` | عام | فحص اتصال قاعدة البيانات (503 عند الفشل) |
| GET | `/users` | Admin | قائمة مع بحث وفلاتر |
| POST | `/users` | Admin | إنشاء مستخدم ← 201 |
| PATCH | `/users/{id}` | Admin | تعديل الاسم والدور |
| PATCH | `/users/{id}/status` | Admin | `{is_active: bool}` |

## المنتجات

| Method | Endpoint | الصلاحية | الوصف |
|---|---|---|---|
| GET | `/products` | عام* | بحث/تصفية/ترتيب/Pagination |
| GET | `/products/categories` | عام* | تصنيفات المنتجات النشطة |
| GET | `/products/low-stock?threshold=5` | Admin | منتجات نشطة بمخزون ≤ threshold |
| GET | `/products/{id}` | عام* | تفاصيل المنتج |
| POST | `/products` | Admin | إنشاء ← 201 |
| PATCH | `/products/{id}` | Admin | تعديل جزئي |
| DELETE | `/products/{id}` | Admin | تعطيل منطقي ← 204 |

\* مسارات عامة تتصرف بحسب المستخدم (`get_optional_user`): المدير يرى `ProductAdminOut` والباقون `ProductPublicOut` للمنتجات النشطة فقط.

## الطلبات والتتبع

| Method | Endpoint | الصلاحية | الوصف |
|---|---|---|---|
| POST | `/orders` | Customer | إنشاء طلب — يتطلب رأس `Idempotency-Key` (8–100) ← 201 / 200 عند إعادة المفتاح |
| GET | `/orders` | Customer/Admin | قائمة بفلاتر `status`, `from`, `to`, `order_number`, `customer_id` |
| GET | `/orders/{id}` | Customer*/Admin | تفاصيل مع البنود |
| GET | `/orders/{id}/tracking` | Customer*/Admin | `{order_number, status, carrier, tracking_number, events}` |
| POST | `/orders/{id}/cancel` | Customer*/Admin | إلغاء وفق القواعد |
| PATCH | `/orders/{id}/status` | Admin | انتقال عدا `SHIPPED` و`CANCELLED` |
| POST | `/orders/{id}/ship` | Admin | `PACKED → SHIPPED` مع الناقل ورقم التتبع |
| PATCH | `/orders/{id}/shipping` | Admin | تصحيح الشحن في `SHIPPED`/`OUT_FOR_DELIVERY` فقط |

\* العميل: طلباته فقط، وغير ذلك 404.

### إنشاء طلب

```json
{
  "items": [
    {"product_id": "UUID", "quantity": 2},
    {"product_id": "UUID", "quantity": 1}
  ],
  "payment_method": "COD",
  "shipping": {
    "name": "Customer Name",
    "phone": "+962700000000",
    "city": "Amman",
    "address": "Street, building, apartment"
  }
}
```

يُحظر إرسال `unit_price` أو `status` أو `customer_id` أو `shipping_fee` (`extra='forbid'`). الأسعار والإجماليات من الخادم دائمًا.

## التقارير (Admin)

| Endpoint | الاستجابة |
|---|---|
| `GET /reports/dashboard` | `today`, `period`, `orders_by_status` (الحالات السبع), `pending_count`, `low_stock_count`, `top_products`, `daily_sales` |
| `GET /reports/sales?group_by=day\|month` | `{summary: {sales_total, order_count, average_order}, series: [{period, total, count}]}` |
| `GET /reports/top-products?limit=10` | `[{product_id, product_name, sku, quantity_sold, revenue}]` |
| `GET /reports/orders-by-status` | عدد الطلبات لكل حالة |

المبيعات = مجموع `total_amount` للطلبات غير الملغاة. الفترة الافتراضية آخر 30 يومًا. `from > to` أو مدى > 366 يومًا ← 400.
