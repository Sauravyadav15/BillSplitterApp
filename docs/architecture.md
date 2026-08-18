# Architecture

This is the deeper, human-readable architecture reference for the project — request flow, data model, and the trickier subsystems (OCR, debt simplification) beyond what the top-level [`README`](../README.md) covers.

## Two independent apps, one repo

`backend/` (Express 5 + PostgreSQL via `pg`, CommonJS) and `frontend/` (React 19 + Vite) are not a shared workspace — no root `package.json`, no shared config. They're connected only by the frontend calling the backend's REST API (`frontend/src/api/client.js`'s `API_BASE_URL`, `http://localhost:5000` by default, overridable via `VITE_API_BASE_URL` — set in production, since the two apps deploy independently, see [ADR 0008](decisions/0008-hybrid-deployment.md)).

## Backend request flow

```
routes/*.js → middleware → controllers/*.js → config/db.js (shared pg Pool)
```

- **`app.js`** builds the Express app (CORS, JSON body parsing, static `/uploads`, route mounting, a catch-all error handler for multer/upload errors) but does not call `.listen()` — this lets `backend/tests/*.test.js` import it directly via `supertest` without a real running server.
- **`index.js`** is the actual entry point: calls `app.listen()` and, separately, `warmUp()`s the PaddleOCR worker (see below) so the first real receipt scan isn't the one that pays the ~20-30s model-load cost.
- **Auth**: `middleware/authMiddleware.js` reads `Authorization: Bearer <token>`, verifies the JWT, and attaches `{ userId, email }` to `req.user`. Applied per-route (not globally) — see any file under `routes/`.
- **Group-scoped authorization**: `middleware/requireGroupMembership.js` checks `req.params.groupId` against `group_members` for the current `req.user.userId`, used on every bill/settlement/balance route. `groupController.js` does the equivalent check inline (it predates the shared middleware, see [`getGroupById`](../backend/controllers/groupController.js)). Any new group-scoped endpoint should use the `requireGroupMembership` middleware rather than re-inlining the check.
- **Validation**: `express-validator` (`param()`, `body()`) runs as route-level middleware arrays, with `middleware/handleValidationErrors.js` turning collected errors into a `400` response. `middleware/validateGroup.js` exists but is empty/unused.
- **Multi-table writes** (`createGroup`, `createBill`) use a checked-out `pool.connect()` client with explicit `BEGIN`/`COMMIT`/`ROLLBACK`, not the shared pool directly — follow this pattern for any new multi-table write.
- **File uploads**: `middleware/upload.js` wraps `multer` (disk storage under `backend/uploads/` as a scratch landing spot, 5MB limit, image-mimetype filter only). `uploadReceiptImage` (single file, used by `parseReceipt`) vs. `uploadReceiptImages` (up to 10, used by `createBill` — a long receipt is often scanned as several photos, see `AddBillPage`'s "Scan another part"). `parseReceipt`'s upload is genuinely scratch - read once for OCR, deleted before the response goes out - but `createBill`'s images need to persist with the bill, so those are immediately re-uploaded to Cloudinary (`utils/cloudinary.js`) and the local copy discarded; `bills.image_url`/`bill_images.image_url` store Cloudinary's URL, not a local path. See [ADR 0008](decisions/0008-hybrid-deployment.md) for why local disk isn't good enough on its own.

## Data model

Defined in `backend/config/schema.sql`, all tables keyed by `uuid_generate_v4()`, all foreign keys `ON DELETE CASCADE`:

- **`users`** — `avatar` is a `"hero-N"` string, an index into the frontend's `HeroAvatar` set (see the cross-file coupling note below).
- **`groups`** — `icon` (a single emoji), `color_theme` (must be one of `groupController.js`'s `VALID_THEMES`, mirrored in the frontend's `frontend/src/utils/groupThemes.js`).
- **`group_members`** — join table, `UNIQUE(group_id, user_id)`.
- **`bills`** — one per receipt scan session. `image_url` duplicates the first (position 0) `bill_images` row, purely so list/gallery views don't need a join for a thumbnail. `added_by` is who fronted `total_amount`, which equals `sum(bill_items.price) + sum(bill_extra_charges.amount) + (tip_amount, only if tip_paid_by is null)` — `item_contributors` + `bill_charges` shares always sum back to exactly this, by construction (see below). `tip_amount` defaults to `0`; `tip_paid_by` is non-null only when one specific member covered the tip themselves rather than splitting it, in which case it's excluded from `total_amount`/`bill_charges` entirely since nobody owes it back - tip is the one charge type with this personal-payer option, which is why it stays a dedicated column instead of living in `bill_extra_charges` with everything else. `purchase_date` (a plain `DATE`, collected via a required prompt on `AddBillPage` before the rest of the form is usable) is when the purchase happened, distinct from `created_at` (when it was scanned/added) - the two commonly differ since a receipt isn't always added the same day. `config/db.js` overrides `pg`'s default `DATE` parser to keep it a `'YYYY-MM-DD'` string end to end rather than a JS `Date`, which otherwise shifts to the wrong calendar day once rendered in a non-UTC local timezone.
- **`bill_images`** — every photo scanned into a bill; a long receipt can span several.
- **`bill_items`** — line items on a bill; `unit_note` holds scanned weight/quantity text (e.g. `"0.075 kg @ $6.57/kg"`). `receiptParser.js`'s `CHARGE_LABEL_PATTERN` (tax/fee/surcharge keywords) keeps bill-level charge lines out of this table in the first place when scanned - they go to `bill_extra_charges` instead so they don't inflate the item subtotal.
- **`item_contributors`** — per-user `share_amount` of a bill item. This is the ground truth for "who owes what" on items; `balanceController.js` sums it (alongside `bill_charges`) against `bills.total_amount` and `settlements` to compute net balances.
- **`bill_extra_charges`** — named bill-level charges that aren't purchasable items (`"Tax"`, `"B.C.H.Fee"`, a service charge, ...), auto-detected from the scanned receipt text or added by hand on `AddBillPage`. Purely a record of what the charge was called and how much it was - the actual per-contributor split lives in `bill_charges`.
- **`bill_charges`** — each contributor's equal share of `sum(bill_extra_charges.amount)` + shared `tip_amount`, pooled into one amount and split via the same `splitCalculator.splitItemPrice` helper items use (just with the bill's distinct contributor set instead of one item's contributors). Kept separate from `item_contributors` since these charges aren't tied to any one item.
- **`settlements`** — direct repayments between two members of a group (`paid_by` → `paid_to`, `amount`).

### Known cross-file coupling (not enforced by any shared config)

`backend/utils/avatar.js`'s `HERO_AVATAR_COUNT` must be kept numerically in sync with `frontend/src/components/HeroAvatar.jsx`'s own `HERO_AVATAR_COUNT` (currently both `98`) — the two apps don't share code, so this is a manual mirror. If you add/remove avatar variants on the frontend, update the backend constant in the same change, or signup/avatar-update validation will silently reject valid values (or accept invalid ones).

## Balances and debt simplification

`balanceController.getGroupBalances` computes each member's net balance in one query: `+total_amount` for whoever added a bill, `-share_amount` for every item they're a contributor on, `-amount` for their `bill_charges` (additional-charges/shared-tip) row on each bill, `+amount`/`-amount` for settlements they made/received. The result feeds `utils/debtSimplifier.js`, which greedily matches the largest creditor against the largest debtor to produce a small set of suggested settle-up payments. See [ADR 0002](decisions/0002-greedy-debt-simplification.md) for why greedy (not an exact minimal-transaction solver).

`meController`'s sibling, `balanceController.getMyBalanceSummary`, does the same per-group computation but summed across every group the logged-in user is in, *not* netted across groups (a receivable in one group and a payable in another both show up separately — there's no cross-group settlement).

## Receipt OCR pipeline

```
photo upload → OCR provider (PaddleOCR worker, Vision API, or Document AI) → text parser → candidate items → (user reviews/edits) → createBill
```

- `backend/utils/ocrProvider.js` is the single switch point between three interchangeable OCR backends, all exporting the same `{ extractTextFromImage, warmUp }` shape — `billController.js` and `index.js` require this file, not any backend directly, so switching providers is an `OCR_PROVIDER` env change, not a code change:
  - `utils/receiptOcr.js` (default, `OCR_PROVIDER` unset or `paddle`): spawns and keeps alive a long-lived PaddleOCR worker process (`backend/paddle_ocr/ocr_server.py`) rather than paying the ~20-30s model-load cost per request. Reconstructs reading-order lines from raw OCR text boxes itself, via `utils/ocrLineBuilder.js`, using pixel position (grouping by y-center with a per-line adaptive gap threshold) rather than the OCR engine's own output order — this is what keeps an item name and its price on the same line.
  - `utils/receiptOcrGoogle.js` (`OCR_PROVIDER=google`): calls the Google Cloud Vision API (`DOCUMENT_TEXT_DETECTION`) per request instead. No local model/process — Google's response already comes back in reading order, so this path skips `ocrLineBuilder.js`. See [ADR 0005](decisions/0005-google-vision-ocr-option.md) for the cost/architecture tradeoff against self-hosting.
  - `utils/receiptOcrDocumentAI.js` (`OCR_PROVIDER=documentai`): calls a Google Cloud Document AI **Document OCR** processor per request. Same reading-order-text contract as the Vision path (skips `ocrLineBuilder.js` too). Deliberately uses the plain OCR processor type, not Document AI's "Expense Parser" — Expense Parser's automatic price/line-item entity linking was tried first and inconsistently dropped item prices on real receipts; see [ADR 0006](decisions/0006-document-ai-ocr-option.md).
  - `index.js` calls `warmUp()` on whichever provider is active at server startup; it's a real ~20-30s model load for PaddleOCR and a no-op for the two hosted APIs (stateless HTTP, nothing to preload).
- `backend/utils/parserProvider.js` is a second, parallel switch point picking which text parser turns the OCR provider's reading-order text into candidate `{name, price}` items, kept in sync with `OCR_PROVIDER`:
  - `utils/receiptParser.js` (paddle/google): layout heuristics (price-at-end regex, quantity/weight-line detection, noise-keyword filtering, embedded-savings-phrase stripping, category-header-prefix stripping), built assuming an item's name and price are almost always on the same reading-order line — true for both PaddleOCR and Vision.
  - `utils/receiptParserDocumentAI.js` (documentai): a separate, independently-tuned parser — Document AI splits name and price onto separate lines far more often, which broke several of `receiptParser.js`'s assumptions on real receipts (a per-item code line clobbering the real name, a promo line read as a duplicate item, a per-unit rate line mistaken for the final price). See [ADR 0006](decisions/0006-document-ai-ocr-option.md) for what specifically goes wrong and how this parser handles it.
- `POST /groups/:groupId/bills/parse-receipt` is **preview-only** — it never writes to the database. The frontend (`AddBillPage`) is expected to let the user review/edit the suggested items, then call `POST /groups/:groupId/bills` (`createBill`) with the final, user-confirmed item list.

See [ADR 0003](decisions/0003-paddleocr-receipt-pipeline.md) for why PaddleOCR was chosen self-hosted originally, [ADR 0005](decisions/0005-google-vision-ocr-option.md) for why Vision API was added as a selectable alternative, and [ADR 0006](decisions/0006-document-ai-ocr-option.md) for why Document AI was added as a third.

## Frontend structure

- `pages/` — one component per route (`LandingPage`, `LoginPage`, `SignupPage`, `DashboardPage`, `GroupPage`, `AddBillPage`, `BillDetailPage`, `ProfilePage`).
- `components/` — shared UI, including a `landing/` subfolder for marketing sections used only by `LandingPage`.
- `api/` — one module per backend resource (`auth.js`, `groups.js`, `bills.js`, `settlements.js`, `balances.js`, `me.js`), all built on the shared `api/client.js` axios instance (attaches the JWT from `localStorage`, redirects to `/login` on a `401`).
- `context/AuthContext.jsx` — holds the logged-in user/token, backing `ProtectedRoute`.
- `hooks/`, `utils/` — small shared logic (e.g. `useCountUp`, `contributorColors.js`, `avatars.js`, `groupThemes.js`).

## Auth flow

Signup/login (`authController.js`) bcrypt-hashes/compares passwords and signs a JWT (`{ userId, email }`, 7-day expiry) with `JWT_SECRET`. See [ADR 0001](decisions/0001-jwt-based-auth.md) for why JWT over server-side sessions. The frontend stores the token in `localStorage` and attaches it via `api/client.js`'s request interceptor.
