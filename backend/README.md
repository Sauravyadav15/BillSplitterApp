# BillSplitterApp — backend

Express 5 REST API + PostgreSQL (via `pg`), CommonJS.

For how the pieces fit together (routing/middleware/controller layering, data model, OCR pipeline, debt simplification), see [`../docs/architecture.md`](../docs/architecture.md). For every endpoint's request/response shape, see [`../docs/api.md`](../docs/api.md).

## Setup

```
npm install
```

Create a `.env` in `backend/` (gitignored) - see [`.env.example`](.env.example) for the full list including the OCR/Cloudinary blocks below:

```
PORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/billsplitter
TEST_DATABASE_URL=postgres://user:password@localhost:5432/billsplitter_test
JWT_SECRET=some-long-random-string
```

Apply the schema in [`config/schema.sql`](config/schema.sql) to *both* databases (it creates the `uuid-ossp` extension and all tables). `TEST_DATABASE_URL` must point at a separate database from `DATABASE_URL` - the test suite `TRUNCATE`s every table between runs (see `config/db.js`, which switches to `TEST_DATABASE_URL` whenever `NODE_ENV=test`, which Jest sets automatically). Pointing both at the same database means every `npm test` run wipes all real accounts/groups/bills.

Receipt scanning uses one of three interchangeable OCR backends, picked by `OCR_PROVIDER` (see `utils/ocrProvider.js`, [ADR 0005](../docs/decisions/0005-google-vision-ocr-option.md), [ADR 0006](../docs/decisions/0006-document-ai-ocr-option.md)):

- `OCR_PROVIDER` unset or `paddle` (default): self-hosted PaddleOCR. Needs a Python environment at `backend/paddle_ocr/.venv_paddleocr` (or point `PADDLE_OCR_PYTHON` at an existing one) — see [`../docs/architecture.md#receipt-ocr-pipeline`](../docs/architecture.md#receipt-ocr-pipeline).
- `OCR_PROVIDER=google`: Google Cloud Vision API. Needs a GCP service account with the Vision API enabled — set `GOOGLE_APPLICATION_CREDENTIALS` to its key file path (or `GOOGLE_VISION_KEY_FILE`, read directly by `receiptOcrGoogle.js`). No local Python env needed.
- `OCR_PROVIDER=documentai`: Google Cloud Document AI, using a **Document OCR** processor (plain text extraction — not the "Expense Parser" processor type, whose automatic price/line-item linking was inconsistent in testing). Needs `DOCAI_PROJECT_ID`, `DOCAI_PROCESSOR_ID`, and optionally `DOCAI_LOCATION` (default `us`) from the processor's page in the Document AI console, plus a GCP service account with Document AI access — set `GOOGLE_APPLICATION_CREDENTIALS` (or `GOOGLE_DOCAI_KEY_FILE`, read directly by `receiptOcrDocumentAI.js`). No local Python env needed. Uses its own dedicated text parser (`utils/receiptParserDocumentAI.js`, switched in by `utils/parserProvider.js`) rather than the shared `utils/receiptParser.js` the other two providers use — see [ADR 0006](../docs/decisions/0006-document-ai-ocr-option.md) for why.

The rest of the API works without any of them; only `POST /groups/:groupId/bills/parse-receipt` depends on the OCR backend.

Receipt photos that get saved to a bill (as opposed to `parseReceipt`'s scratch upload, deleted right after OCR) are uploaded to Cloudinary rather than kept on local disk - `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET`, from a free Cloudinary account. This matters even for local dev: `createBill` will fail without them, since the app's own disk is never treated as the final destination for a bill's images (see [ADR 0008](../docs/decisions/0008-hybrid-deployment.md)).

## Deployment

This app deploys as two independent pieces - see [ADR 0008](../docs/decisions/0008-hybrid-deployment.md) for the reasoning:

- **Backend** → Render (or any host that runs a persistent Node process - not a serverless/edge platform, since `index.js` is a long-running `app.listen()` process). [`render.yaml`](../render.yaml) at the repo root is a ready-to-use Blueprint; set `rootDir: backend` if configuring manually instead. Needs a reachable Postgres (`config/db.js` auto-enables SSL for any non-`localhost` `DATABASE_URL`, which covers Neon/Supabase/etc. without extra config) and `CORS_ORIGIN` set to the deployed frontend's origin(s).
- **Frontend** → Vercel, with the project's root directory set to `frontend/` (zero-config otherwise - `npm run build` / `dist/`, both Vercel's defaults for a Vite project). `frontend/vercel.json` adds the SPA rewrite React Router needs so a direct link to e.g. `/groups/:id` doesn't 404. Set `VITE_API_BASE_URL` to the backend's deployed URL as a Vercel project env var, and add your custom domain under the project's Domains settings.

## Commands

- `npm run dev` — start with nodemon (auto-restart), listens on `PORT` (default 5000).
- `npm start` — start once with plain node.
- `npm test` — run the Jest test suite (`tests/*.test.js`, via `supertest` against `app.js`).

## Layout

- `routes/` → `middleware/` → `controllers/` → `config/db.js` (shared `pg` Pool). `app.js` wires it all together; `index.js` is the actual process entry point (calls `app.listen()` and warms up the OCR worker).
- `config/schema.sql` — full data model.
- `utils/` — pure/isolated logic: `splitCalculator.js`, `debtSimplifier.js`, `receiptOcr.js`, `ocrLineBuilder.js`, `receiptParser.js`, `avatar.js`.
- `paddle_ocr/` — the Python OCR worker script and its venv.
- `tests/` — Jest + supertest integration tests, plus fixture images.
