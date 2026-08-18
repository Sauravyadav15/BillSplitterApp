# BillSplitterApp

A bill/receipt-splitting app: scan a group receipt, split its items across members, track who owes what, and settle up. Photos are turned into line items automatically via OCR, which you then review and adjust before splitting.

## Prerequisites

- Node.js 18+ and npm
- A PostgreSQL database (local install, or a free hosted instance such as [Neon](https://neon.tech))

## Repo layout

Two independent apps in one repo — no shared package/workspace config, run each from its own directory:

- [`backend/`](backend/README.md) — Express 5 REST API + PostgreSQL.
- [`frontend/`](frontend/README.md) — React 19 + Vite single-page app.

## Quick start

1. Create a Postgres database and apply [`backend/config/schema.sql`](backend/config/schema.sql) to it.
2. Backend, in one terminal:
   ```
   cd backend
   npm install
   cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, etc. - see backend/README.md
   npm run dev             # API on :5000
   ```
3. Frontend, in a second terminal:
   ```
   cd frontend
   npm install
   npm run dev              # SPA on :5173
   ```
4. Open `http://localhost:5173` and sign up.

See each app's own README for the full environment variable list and command reference.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — request flow, data model, the OCR and debt-simplification pipelines, known cross-file coupling.
- [`docs/api.md`](docs/api.md) — every REST endpoint: method, auth requirements, request/response shape.
- [`docs/decisions/`](docs/decisions/) — Architecture Decision Records (ADRs) for non-obvious technical choices, e.g. why JWT auth, why greedy debt simplification, why a self-hosted OCR pipeline.
- [`CHANGELOG.md`](CHANGELOG.md) — notable changes over time.
