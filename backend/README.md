# BillSplitterApp — backend

Express 5 REST API + PostgreSQL (via `pg`), CommonJS.

For how the pieces fit together (routing/middleware/controller layering, data model, OCR pipeline, debt simplification), see [`../docs/architecture.md`](../docs/architecture.md). For every endpoint's request/response shape, see [`../docs/api.md`](../docs/api.md).

## Setup

```
npm install
```

Create a `.env` in `backend/` (gitignored) with:

```
PORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/billsplitter
TEST_DATABASE_URL=postgres://user:password@localhost:5432/billsplitter_test
JWT_SECRET=some-long-random-string
```

Apply the schema in [`config/schema.sql`](config/schema.sql) to *both* databases (it creates the `uuid-ossp` extension and all tables). `TEST_DATABASE_URL` must point at a separate database from `DATABASE_URL` - the test suite `TRUNCATE`s every table between runs (see `config/db.js`, which switches to `TEST_DATABASE_URL` whenever `NODE_ENV=test`, which Jest sets automatically). Pointing both at the same database means every `npm test` run wipes all real accounts/groups/bills.

Receipt scanning additionally needs a PaddleOCR Python environment at `backend/paddle_ocr/.venv_paddleocr` (or point `PADDLE_OCR_PYTHON` at an existing one) — see [`../docs/architecture.md#receipt-ocr-pipeline`](../docs/architecture.md#receipt-ocr-pipeline). The rest of the API works without it; only `POST /groups/:groupId/bills/parse-receipt` depends on it.

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
