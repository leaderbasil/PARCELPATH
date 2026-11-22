# Frontend — Mini E-Commerce Order & Shipment Tracking

React 18 + Vite + TypeScript (strict) single-page app with an Arabic RTL interface. The API base URL defaults to `http://localhost:8000/api/v1` and can be overridden with `VITE_API_BASE_URL`.

## Prerequisites

- Node.js 18+ and npm
- A running backend (see `../backend/README.md`); the frontend expects the `/api/v1` prefix and `{ data, message }` response envelopes

## Setup

```bash
npm install
npm run dev          # http://localhost:5173
```

Other commands:

```bash
npm run typecheck    # tsc --noEmit, strict mode
npm test             # vitest run (jsdom + MSW; no backend needed)
npm run build        # tsc -b && vite build
npm run lint         # eslint
```

The test suite uses jsdom and MSW v2, so it needs Node but **does not** need PostgreSQL, Docker, or a live backend.

## Architecture

| Area | Location | Notes |
| --- | --- | --- |
| Runtime config | `src/config.ts` | API URL, currency/date formatters, polling interval |
| Domain types | `src/types/domain.ts` | Mirrors backend Pydantic schemas; money is always a fixed 2-decimal **string** |
| HTTP layer | `src/services/api.ts` | Axios instance, bearer token interceptor, envelope unwrapping, `ApiRequestError` |
| Data access | `src/services/*.service.ts` | One module per backend resource |
| Server state | `src/hooks/` | TanStack Query v5 queries/mutations with central `queryKeys` and invalidation |
| Client state | `src/context/` | `AuthContext` (sessionStorage tokens) and `CartContext` (localStorage cart) |
| Routing | `src/App.tsx`, `src/routes/` | Lazy routes plus `ProtectedRoute` role guard (CUSTOMER / ADMIN) |
| Forms | React Hook Form + Zod | All submit validation is schema-based with Arabic messages |
| UI | `src/components/`, `src/pages/` | Common, layout, catalog, cart, orders, tracking, admin groups |
| Copy | `src/constants/` | `ui.ts` holds all Arabic UI text; `messages.ts` maps error codes and status labels |

Tailwind is used with **semantic design tokens only** (`bg-surface`, `text-text`, `bg-danger-soft`, `rounded-card`, `shadow-card`, …) defined in `tailwind.config.ts`; components do not hard-code raw color scales. `index.html` sets `lang="ar" dir="rtl"`, and all product-facing copy is Arabic.

## Money, stock and idempotency

- `src/utils/money.ts` converts fixed 2-decimal strings to integer subunits before summing or multiplying, then formats with `Intl.NumberFormat("ar-EG", { numberingSystem: "latn" })`. No floating point arithmetic is used for totals.
- Checkout reuses a single `Idempotency-Key` from sessionStorage for retries; the key is only consumed after a successful order creation. The same key replayed against the backend returns the original order instead of a duplicate.
- Cart mutations refresh the key, so editing the cart starts a new checkout attempt.
- Order creation checks stock with row locks on the server; an `INSUFFICIENT_STOCK` response leaves both the cart and the retry key intact.

## Tests

`src/tests/` contains MSW v2 handlers (`handlers.ts`), a shared `setupServer` (`server.ts`), jsdom setup (`setup.ts`), provider-aware render helpers (`utils.tsx`), and suites for login, cart, checkout, orders, timeline and the ship modal. Handlers mirror the real envelope/error shapes, and tests capture request headers/bodies through `server.use()` overrides to assert idempotency and mutation payloads.

Tests are executed with `npm test` in an environment with Node installed. They are not intended to be run against a live database.
