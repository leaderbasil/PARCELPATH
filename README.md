# Mini E-Commerce Order & Shipment Tracking

<p align="center">
  <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 120'><rect width='420' height='120' rx='20' fill='%23EEF2FF'/><text x='28' y='78' font-family='Segoe UI,sans-serif' font-size='42' font-weight='700' fill='%234F46E5'>PARCELPATH</text></svg>" alt="PARCELPATH" width="220" />
</p>

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2.x, PostgreSQL 15, Alembic, JWT + bcrypt
- **Frontend:** React 18, Vite, strict TypeScript, Tailwind (design tokens only), TanStack Query v5, React Hook Form + Zod, Recharts, MSW tests
- **API:** `/api/v1`; success bodies are `{ data, message }`, errors are `{ detail, code, meta?, errors? }`

## Structure

```
backend/   app/ (core, db, models, schemas, services, routers, utils), alembic/, scripts/, tests/
frontend/  src/ (components, pages, context, hooks, services, routes, types, utils, constants, tests/)
docs/      requirements, ERD, API contract
docker-compose.yml   PostgreSQL + backend + frontend
```

## Quick start (Docker Compose)

```bash
docker compose up --build
```

PostgreSQL is exposed on `localhost:5432`, the API on `http://localhost:8000` (`/docs`), and the UI on `http://localhost:5173`. The backend image applies migrations and creates the first admin on startup; use `python -m seed_demo` for demo customers/products/orders.

## Manual development

```bash
# Backend (from backend/, after pip install -r requirements.txt)
alembic upgrade head
python -m app.db.init_db
python -m seed_demo          # equivalently: python scripts/seed_demo.py
uvicorn app.main:app --reload

# Frontend (from frontend/)
npm install
npm run dev
```

The schema is **Alembic-only** — `create_all()` is never used. Copy each `.env.example` to `.env` before manual runs.

## Verification

```bash
cd backend && pytest               # requires PostgreSQL + TEST_DATABASE_URL
cd frontend && npm run typecheck
cd frontend && npm test             # jsdom + MSW, no database required
cd frontend && npm run build
```

These checks require Node, PostgreSQL and/or Docker installed in the environment where they are run.

## Key design decisions

- **Money** is fixed 2-decimal strings end-to-end; the frontend sums integer subunits and formats with `ar-EG` Latin digits.
- **Inventory** changes use row locks, and cancellation restores stock exactly once.
- **Idempotency replay:** `POST /orders` honors `Idempotency-Key`; retries return the original order, and the frontend keeps the key on failures.
- **Status machine** restricts admin transitions; only allowed actions are rendered.
- **Reports** exclude `CANCELLED` orders from sales totals and top-product rankings.
- **Frontend UI** is fully Arabic and RTL, uses semantic Tailwind tokens only, centralizes copy and error maps, and keeps server state in TanStack Query with schema-validated forms. Tests use MSW handlers that mirror the real API envelopes.
