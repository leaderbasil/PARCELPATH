# PARCELPATH — Order & Shipment Tracking

Orders that never oversell and never duplicate.

[Launch the live demo →](https://parcelpath-demo.netlify.app/login) · [View on GitHub](https://github.com/leaderbasil/PARCELPATH)

PARCELPATH is a full-stack order and shipment tracking system built for a single online store. It covers the complete daily loop: manage the product catalog, build a browser-side cart, check out with server-calculated totals, reserve stock atomically, move the order through a strict status machine, hand it to a courier with tracking data, and monitor sales and inventory through role-aware reports.

The project is deliberately small in domain surface but strict about correctness. Money never uses floating point, the client never supplies prices or totals, concurrent checkouts are protected with row locks, repeated submissions are handled with an idempotency key, cancellations restore stock exactly once, and reports exclude cancelled orders. A browser-only demo mode lets the entire UI run on a static host without FastAPI or PostgreSQL.

## What PARCELPATH does

### Storefront and cart

- Public catalog with search, category and price filters, sorting, and pagination; active products only for non-admin users.
- Product detail pages with availability, image, SKU, and catalog-safe data; admin views include stock and inactive products.
- Browser cart persisted in `localStorage`; every quantity change is clamped to `1..99`, and out-of-stock lines are revalidated against the server before checkout.
- Cart context refreshes the idempotency key on user-driven add/update/remove/clear actions; server-driven reconciliation deliberately does not.

### Checkout and order creation

- `POST /orders` requires an `Idempotency-Key` header; a retry with the same key returns the original order with `200`, while a new key creates an order with `201`.
- The client may send only `items`, `payment_method`, and shipping details. Sending `unit_price`, `status`, `customer_id`, or `shipping_fee` is rejected with Pydantic `extra="forbid"`.
- Product rows are locked with `SELECT ... ORDER BY id FOR UPDATE`, server prices are re-read, totals are computed, and stock is deducted in one commit.
- Insufficient stock returns `409 INSUFFICIENT_STOCK` with `meta.items` listing every failed line; inactive products return `409 PRODUCT_INACTIVE`.
- Empty carts, duplicate product ids, and keys owned by another user have explicit error codes; a commit-time unique violation is resolved by re-reading the race winner.

### Fulfillment and tracking

- Seven states: `PENDING`, `CONFIRMED`, `PACKED`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, and `CANCELLED`.
- Allowed transitions are defined in one table and enforced by the backend; `SHIPPED` is set only through `/ship`, `CANCELLED` through `/cancel`, and all other transitions through `/status`.
- `SHIPPED` requires a carrier and a globally unique tracking number; carrier/tracking corrections are allowed only in `SHIPPED` and `OUT_FOR_DELIVERY`.
- Every transition appends a tracking event with timestamp and actor. The tracking response returns the same timeline without exposing the actor id.
- `DELIVERED` sets `delivered_at` and marks `COD` orders as `PAID`.
- Cancellation is allowed for customers only in `PENDING`, and for admins in `PENDING`, `CONFIRMED`, or `PACKED`. It locks rows, restores stock once, and rejects a second cancellation with `ORDER_ALREADY_CANCELLED`.

### Catalog and inventory

- Admin-managed products with unique SKU, category, price, stock quantity, image, and soft disable via `DELETE /products/{id}`.
- Search, filters, sorting, pagination, categories, and `GET /products/low-stock?threshold=5`.
- Product images are uploaded through `POST /uploads`; PNG, JPEG, WebP, and GIF are checked against magic bytes, with a 5 MiB default cap and UUID filenames.
- Foreign keys use `ON DELETE RESTRICT`; disabling a product never destroys invoice history.

### Reports and dashboard

- `GET /reports/dashboard` returns today's figures, period totals, counts for all seven statuses, pending and low-stock counts, top products, and daily sales.
- `GET /reports/sales` groups by day or month and fills empty buckets with zero; `GET /reports/top-products` ranks by quantity sold and revenue.
- Sales totals, averages, series, and rankings exclude `CANCELLED` orders. Status counts intentionally include all seven states.
- Date ranges use `REPORT_TIMEZONE`, are inclusive at both ends, default to the last 30 days, and reject spans longer than 366 days.

### Roles and access

- JWT access tokens signed with HS256, 30-minute lifetime, bcrypt password hashes.
- `ADMIN` and `CUSTOMER` roles are enforced by backend dependencies; UI hiding is deliberately cosmetic.
- Customers can see only their own orders; requesting another customer's order returns `404` so existence is not leaked.
- Admin protections prevent disabling or demoting yourself and demoting the last active admin.

### Interface

- Arabic RTL by default, with a complete English LTR translation.
- Two JSON locale files with identical keys; labels, filters, validation messages, statuses, notices, dates, money, document title, and meta description follow the selected language.
- Language choice persists in `localStorage` as `parcelpath-locale`; an inline pre-paint script applies saved language and theme before first render.
- Light and dark themes, responsive tables and cards, and explicit loading, empty, and error states.

### Live demo

The hosted build is a frontend-only showcase: products, users, orders, and the session live in the browser. No backend, database, or network API is required, and the full workflow is usable.

- URL: https://parcelpath-demo.netlify.app/login
- One-click demo button is available on the login card.
- Demo admin: `demo@parcelpath.local` / `Demo12345`
- Static-host SPA fallback is included via `frontend/public/_redirects`.

The demo credentials are public, browser-only values compiled into the frontend bundle. Never reuse them for a backend or production account. Set `VITE_DEMO_LOGIN_ENABLED=false` when connecting the frontend to a real API.

Demo state is versioned under `parcelpath.demo.v4.*`. Clear the site's local storage to reset products, orders, and the signed-in user to their seeded state.

## Architecture

```text
Browser
  React page
    → TanStack Query hook
      → Axios client (base URL, JWT, 401 handling)
        → FastAPI router (thin HTTP layer)
          → Pydantic schema + dependency guards
            → Service (business rules, commit / rollback)
              → SQLAlchemy 2 model
                → PostgreSQL
```

There is no repository layer. Routers contain no business logic or queries; services own transactions. Backend endpoints are synchronous `def` functions using SQLAlchemy 2 `select()` style with psycopg 3. `POST /uploads` writes product images to a local object directory and serves them from a dedicated non-API path.

## Data model

Four tables cover the whole domain: `users`, `products`, `orders`, and `order_items`, plus the `user_role` enum and the `order_number_seq` sequence. See the [database ERD](docs/database-erd.md) for columns, constraints, and indexes.

- Order numbers are generated from the sequence as `ORD-{YYYY}-{000000}`.
- `order_items` snapshots product name, SKU, and unit price, so history survives later catalog changes.
- Shipping address, carrier, tracking number, and `tracking_events` JSONB are stored on the order itself.
- Soft disable is used throughout; no `ON DELETE CASCADE`.
- Stock changes and cancellations lock product rows in id order to avoid deadlocks.

## Money and consistency rules

- Python uses `Decimal` with `ROUND_HALF_UP`; PostgreSQL uses `NUMERIC(12,2)`. Floats are rejected.
- JSON money values are strings such as `"12.50"` to avoid precision loss; the frontend sums integer subunits and formats with `Intl.NumberFormat`.
- Database CHECK constraints enforce non-negative money, `total_amount = subtotal + shipping_fee`, `line_total = quantity * unit_price`, positive quantity, valid statuses, valid payment values, and tracking-number presence from `SHIPPED` onward.
- Idempotency keys are stored uniquely and checked against the owning user; replay returns the original order instead of creating a second one or deducting stock twice.
- Cancellation restores stock once inside the same transaction that records the cancelled state and tracking event.
- Reports exclude cancelled orders from every sales figure, while status counts include them.
- Error envelopes are stable: `{ data, message }` on success, `{ detail, code, meta?, errors? }` on failure, with generic `500` messages and no stack traces.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 5, React Router v6, strict TypeScript 5, TanStack Query v5, Axios, React Hook Form + Zod, Tailwind CSS, Recharts, Vitest + RTL + MSW |
| Backend | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2 sync, psycopg 3, Alembic, PyJWT, bcrypt, pytest + HTTPX |
| Database | PostgreSQL 15+ |
| Tooling | Docker Compose, ESLint, Netlify static deployment |

## Repository layout

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py              # app setup, CORS, error envelope, /health, /uploads mount
│   │   ├── dependencies.py      # DB session, auth, role guards, optional user
│   │   ├── core/                # settings, security, permissions, exceptions
│   │   ├── db/                  # session, base, first-admin seed
│   │   ├── models/              # users, products, orders, order_items
│   │   ├── schemas/             # Pydantic request/response contracts
│   │   ├── services/            # business logic and transactions
│   │   ├── routers/             # auth, users, products, orders, reports, uploads
│   │   └── utils/               # money, order numbers, pagination, status machine
│   ├── alembic/versions/        # 0001_initial_schema
│   ├── scripts/seed_demo.py     # repeatable demo customers/products/orders
│   ├── tests/                   # pytest integration tests
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── public/                  # brand assets, favicons, Netlify SPA rewrite
│   ├── src/
│   │   ├── components/          # brand, cart, catalog, checkout, common, layout, orders, tracking
│   │   ├── pages/               # auth, catalog, cart, checkout, my-orders, admin
│   │   ├── context/             # Auth, Cart, Theme providers
│   │   ├── i18n/                # I18nProvider and locale hooks
│   │   ├── hooks/               # query hooks and shared helpers
│   │   ├── locales/             # ar.json, en.json — the only two UI translation files
│   │   ├── routes/              # route table and ProtectedRoute
│   │   ├── services/            # Axios client, API services, demo mode
│   │   ├── tests/               # Vitest + MSW tests
│   │   ├── types/               # domain and generated API types
│   │   ├── utils/               # money, dates, idempotency, navigation
│   │   └── config.ts            # runtime configuration
│   ├── .env.example
│   └── Dockerfile
├── docs/
│   ├── requirements.md
│   ├── database-erd.md
│   └── api-contract.md
├── docker-compose.yml
└── README.md
```

## API overview

Base path: `/api/v1`. Interactive docs are at `/docs`, the OpenAPI schema at `/openapi.json`, and the health probe at `/health`.

| Area | Endpoints (summary) | Access |
| --- | --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | public / authenticated |
| Users | `GET /users`, `POST /users`, `PATCH /users/{id}`, `PATCH /users/{id}/status` | Admin only |
| Products | `GET /products`, `GET /products/categories`, `GET /products/low-stock`, `GET /products/{id}`, `POST /products`, `PATCH /products/{id}`, `DELETE /products/{id}` | read: any, write: Admin |
| Orders | `POST /orders`, `GET /orders`, `GET /orders/{id}`, `GET /orders/{id}/tracking`, `POST /orders/{id}/cancel`, `PATCH /orders/{id}/status`, `POST /orders/{id}/ship`, `PATCH /orders/{id}/shipping` | Customer / Admin per rules |
| Reports | `GET /reports/dashboard`, `GET /reports/sales`, `GET /reports/top-products`, `GET /reports/orders-by-status` | Admin only |
| Uploads | `POST /uploads` | Admin only |

Paginated lists include `items`, `total`, `page`, and `page_size`. Error codes are stable so the frontend can translate them. The complete contract, including every filter and error code, is in [docs/api-contract.md](docs/api-contract.md).

## Getting started

### 1. Try the hosted demo

Open https://parcelpath-demo.netlify.app/login and use the one-click demo button or the credentials above. No installation is required.

### 2. Run the frontend demo locally

```bash
cd frontend
npm install
cp .env.example .env        # optional: override demo values
npm run dev                 # http://localhost:5173
```

The demo is enabled by default and runs entirely in the browser. Open the app, choose the one-click demo button, and explore the catalog, cart, checkout, tracking, admin dashboard, products, users, and reports.

### 3. Run the full stack with Docker Compose

```bash
docker compose up --build
```

- Web: http://localhost:5173
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

First backend admin: `admin@example.com` / `change-me-now` — change immediately.

Compose waits for PostgreSQL health, runs `alembic upgrade head`, creates the first admin, and then starts Uvicorn. It does **not** seed demo data automatically.

### 4. Manual backend setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # set DATABASE_URL and a long JWT_SECRET_KEY
alembic upgrade head
python -m app.db.init_db
python -m scripts.seed_demo      # optional demo customers/products/orders
uvicorn app.main:app --reload
```

Then point the frontend at the API in `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_DEMO_LOGIN_ENABLED=false
```

## Configuration highlights

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` / `TEST_DATABASE_URL` | PostgreSQL DSNs using the `postgresql+psycopg://` driver |
| `JWT_SECRET_KEY` | Signing secret; at least 32 characters, must be changed in production |
| `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` | Initial backend admin; replace in deployment |
| `SHIPPING_FEE` / `CURRENCY_CODE` | Checkout shipping fee and declared currency (the frontend currently formats USD) |
| `REPORT_TIMEZONE` | Timezone used for inclusive report date ranges |
| `FRONTEND_ORIGIN` | Allowed CORS origin |
| `OBJECT_STORAGE_DIR` / `OBJECT_STORAGE_URL_PREFIX` | Uploaded image storage and public path |
| `MAX_UPLOAD_BYTES` | Upload size cap, default 5 MiB |
| `VITE_API_BASE_URL` | Frontend API base URL |
| `VITE_DEMO_LOGIN_ENABLED` / `VITE_DEMO_AUTO_LOGIN_ENABLED` | Show/hide and auto-enter browser-only demo mode |
| `VITE_DEMO_ADMIN_EMAIL` / `VITE_DEMO_ADMIN_PASSWORD` | Public demo-only identity |

All secrets come from environment variables. `.env` files are ignored; only `.env.example` files are committed.

## Tests and verification

```bash
cd backend && pytest
cd frontend && npm test
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run build
```

Backend: **57 tests** using real PostgreSQL because `FOR UPDATE` row locks and CHECK constraints cannot be faithfully simulated on SQLite. Includes two-connection races for last-unit checkout, same-key idempotency, reversed product order, cancel-vs-confirm, stock-patch-vs-order, duplicate tracking, and double cancellation.

Frontend: **49 tests** with Vitest and React Testing Library, covering auth, validation, route guards, integer-subunit cart math, product search, checkout payload and idempotency handling, demo mode, WhatsApp/map links, status actions, locale switching, and locale key parity.

## Design system and localization

Tailwind semantic tokens are defined in `frontend/tailwind.config.ts`: `background`, `surface`, `border`, `text`, `primary`, `success`, `warning`, `danger`, and `overlay`, with matching soft/strong variants. Components never hard-code palette colors or chart hex values; charts read CSS variables derived from the same tokens. Logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`) keep layouts correct in both RTL and LTR.

All user-facing copy lives in exactly two files:

```text
frontend/src/locales/ar.json   Arabic (default)
frontend/src/locales/en.json   English
```

A test fails if the two key sets diverge or if English copy contains Arabic script. Adding a string means adding it to both files with the same nested key.

## Project status

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Foundation: settings, DB session, four models, initial migration, error envelope, CORS, health, RTL shell, design tokens | Complete |
| 2 | Auth/JWT, permissions, users, products, search, low stock, catalog and admin UI | Complete |
| 3 | Orders: row locks, Decimal totals, idempotency, status machine, shipping, tracking, cancellation, checkout flow | Complete |
| 4 | Reports, dashboard, browser-only demo mode, bilingual UI, object storage, full docs and tests | Complete |

The current scope is a single-store MVP. Real payment gateways, carrier integrations, returns, coupons, reviews, email/SMS notifications, refresh tokens, and public tracking without an account are intentionally out of scope.

## Documentation

- [Requirements and phase brief](docs/requirements.md)
- [Database ERD and constraints](docs/database-erd.md)
- [API contract and error codes](docs/api-contract.md)
- [Backend guide](backend/README.md)
- [Frontend guide](frontend/README.md)
