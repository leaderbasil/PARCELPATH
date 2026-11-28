# Backend — PARCELPATH

FastAPI + SQLAlchemy 2.x (sync) + PostgreSQL 15, authenticated with JWT (PyJWT) and bcrypt password hashes. All endpoints live under `/api/v1`; interactive docs are at `/docs`.

## Prerequisites

- Python 3.11+
- PostgreSQL 15+ reachable via `DATABASE_URL`, **or** Docker Compose (see `../docker-compose.yml`)
- `pytest` needs a separate database via `TEST_DATABASE_URL`

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

The database schema is managed **only by Alembic** — there is no `create_all()` call. Apply migrations before starting the app:

```bash
alembic upgrade head
python -m app.db.init_db     # creates the first ADMIN when none exists
python -m scripts.seed_demo  # idempotent demo data (also: python scripts/seed_demo.py)
uvicorn app.main:app --reload
```

`python -m scripts.seed_demo` loads two demo customers, 15 products and eight representative orders (including a cancelled one). Re-running it is safe.

With Docker Compose from the repository root, migrations and first-admin initialization run in the backend container on startup:

```bash
docker compose up --build
```

Demo login credentials are printed by the seed script (`Customer123!` for demo customers; the admin password comes from `FIRST_ADMIN_PASSWORD` / `.env`).

## Tests

```bash
pytest
```

Backend tests require PostgreSQL and a configured `TEST_DATABASE_URL`; they are not unit tests that run without a database.

## Layout

```
app/
  core/       config, JWT security, error codes, role permissions
  db/         engine/session, declarative base, first-admin initializer
  models/     User, Product, Order, OrderItem
  schemas/    Pydantic v2 request/response models and Envelope/PageEnvelope
  services/   authentication, products, users, orders, reports (business rules)
  routers/    auth, products, orders, users, reports, uploads (HTTP layer only)
  utils/      money, order numbers, pagination, status machine
alembic/      migration environment and versioned schema
scripts/      seed_demo.py
tests/        pytest suites (auth, products, inventory, orders, tracking, reports, edge cases)
```

## Domain rules

- **Money** is stored as `NUMERIC(12,2)` and serialized as fixed 2-decimal **strings**; no floats are used in calculations. A configurable shipping fee is added at order creation.
- **Stock** is decremented with row-level locks (`SELECT … FOR UPDATE`) during order creation and restored exactly once on cancellation.
- **Order lifecycle** is enforced by a status machine (`PENDING → CONFIRMED → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED`, plus `CANCELLED` from early states). Only an ADMIN may advance status or set carrier/tracking.
- **Idempotency** is keyed by the `Idempotency-Key` header on `POST /orders`; replaying a key returns the stored order with HTTP 200 rather than creating a second one. Conflicting reuse by another user is rejected.
- **Reports** aggregate all non-cancelled orders regardless of payment status and explicitly **exclude CANCELLED orders** from sales totals and top-product rankings; status distribution still reports their count.
- **Errors** use `{ detail, code, meta?, errors? }`, while every success response uses `{ data, message }`. The frontend maps `code` to localized messages.
