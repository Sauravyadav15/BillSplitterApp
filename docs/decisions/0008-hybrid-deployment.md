# 0008. Hybrid deployment: Vercel (frontend) + Render (backend) + Neon (DB) + Cloudinary (images)

Status: Accepted
Date: 2026-08-17

## Context

The goal was free-tier deployment with a custom domain. Vercel was the first choice (generous free tier, first-class custom domain support, zero-config for a Vite SPA), which raised the question of whether the whole app - backend included - could live there too.

It can't, not without a rewrite. Three things about this backend are fundamentally at odds with a serverless/edge platform like Vercel:

- **`index.js` is a persistent process** - `app.listen()` plus a one-time OCR-worker `warmUp()` at boot. Serverless functions are stateless, short-lived invocations with no equivalent of "boot once, stay warm."
- **Receipt photos are written to local disk** (`middleware/upload.js`, `multer.diskStorage` under `backend/uploads/`). A serverless function's filesystem doesn't persist between invocations, so anything meant to survive past one request needs to live somewhere else entirely.
- **`DATABASE_URL` pointed at `localhost:5432`** - fine for local dev, unreachable from any hosted platform.

Of these, the file-storage problem turned out to be broader than "serverless vs. not": Render's own web-service filesystem is ephemeral too (wiped on every redeploy/restart, no persistent disk on the free plan), so `createBill`'s uploaded images needed to move off local disk regardless of which backend host was chosen.

One thing worked in this deploy's favor going in: `OCR_PROVIDER=documentai` was already the active provider (see [ADR 0006](0006-document-ai-ocr-option.md)), not the self-hosted PaddleOCR path. PaddleOCR's local Python worker would have been a second, harder blocker on top of the three above - Document AI is a stateless HTTP call to Google's API, no local process required either way.

## Decision

Split the app across four services, each doing the one thing it's actually built for, instead of forcing everything onto Vercel:

- **Vercel** — the frontend (`frontend/`, Vite React SPA). Project root set to `frontend/`; `frontend/vercel.json` adds the SPA rewrite React Router needs. Custom domain attached here.
- **Render** — the backend (`backend/`), as a standard persistent web service (free tier). `render.yaml` at the repo root is a ready-to-use Blueprint. Chosen over Railway specifically because its free tier is an indefinite free web service (with a cold-start tradeoff after ~15 min idle), not a usage-based trial credit that eventually requires a card.
- **Neon** — Postgres, replacing the local `DATABASE_URL`. Chosen for built-in connection pooling, which matters even outside a serverless context: a small free-tier Postgres instance can still be connection-starved by a cheap web service's own `pg.Pool`. `config/db.js` auto-enables SSL for any non-localhost `DATABASE_URL`, so no separate flag was needed to support this.
- **Cloudinary** — receipt photo storage, replacing `backend/uploads/` as the *permanent* destination. `parseReceipt`'s OCR-preview upload stays on local disk exactly as before (it's genuinely scratch - written, read once, deleted, all within one request) - only `createBill`'s images move, via a new `utils/cloudinary.js` and an upload step added to `createBill` right after validation, before the images ever reach the DB transaction. Chosen over S3 for the free tier and image-specific niceties (CDN, transformations) with less setup (no IAM policy to write).

Frontend/backend origin is no longer implicit: `frontend/src/api/client.js`'s `API_BASE_URL` now reads `VITE_API_BASE_URL` (falling back to `localhost:5000` for `npm run dev`), and `app.js`'s CORS now honors a `CORS_ORIGIN` allow-list in production instead of the wide-open default (kept wide-open when unset, so local dev needs no change).

## Consequences

- Four accounts/dashboards to manage instead of one, and secrets now live in two places (Vercel's env vars, Render's env vars + one Secret File for the Document AI service account key) instead of a single local `.env`.
- Local dev now has a hard dependency on Cloudinary credentials too - `createBill` will fail without `CLOUDINARY_*` set, even against a local Postgres, since there's no local-disk fallback path left to fall back to.
- Render's free tier cold-starts (~30-50s) after ~15 min idle - acceptable for a personal-scale app, but a real UX cost the all-Vercel plan wouldn't have had if it had been possible.
- Nothing here required touching `receiptOcr.js` (PaddleOCR) or `receiptOcrGoogle.js` (Vision) - only the `documentai` provider is in play for this deployment, and neither of the other two needed any change to keep working locally.
- Old bills created before this change (local Postgres + local-disk `/uploads/...` paths) still resolve correctly - `resolveImageUrl` treats an absolute URL (Cloudinary) and a relative path (legacy local) as two valid shapes rather than assuming one.
