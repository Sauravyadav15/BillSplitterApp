# BillSplitterApp

A bill/receipt-splitting app: scan a group receipt, split its items across members, track who owes what, and settle up. Photos are turned into line items automatically via a self-hosted OCR pipeline, which you then review and adjust before splitting.

## Repo layout

Two independent apps in one repo — no shared package/workspace config, run each from its own directory:

- [`backend/`](backend/README.md) — Express 5 REST API + PostgreSQL.
- [`frontend/`](frontend/README.md) — React 19 + Vite single-page app.

## Quick start

```
cd backend && npm install && npm run dev    # API on :5000
cd frontend && npm install && npm run dev   # SPA on :5173
```

See each app's own README for environment variables and full command list.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — request flow, data model, the OCR and debt-simplification pipelines, known cross-file coupling.
- [`docs/api.md`](docs/api.md) — every REST endpoint: method, auth requirements, request/response shape.
- [`docs/decisions/`](docs/decisions/) — Architecture Decision Records (ADRs) for non-obvious technical choices, e.g. why JWT auth, why greedy debt simplification, why a self-hosted OCR pipeline.
- [`CHANGELOG.md`](CHANGELOG.md) — notable changes over time.
- [`CLAUDE.md`](CLAUDE.md) — condensed reference for AI coding assistants working in this repo (also a decent terse orientation for a human).

Documentation is kept live as the project evolves — see the "Documentation practice" section in [`CLAUDE.md`](CLAUDE.md) for the convention.
