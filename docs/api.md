# API reference

Base URL in dev: `http://localhost:5000`. All request/response bodies are JSON except where noted (receipt/bill image uploads are `multipart/form-data`).

**Auth**: routes marked 🔒 require `Authorization: Bearer <token>` (obtained from `/auth/login` or `/auth/signup`). Routes marked 🔒👥 additionally require the caller to be a member of the `:groupId` in the URL (enforced by `requireGroupMembership` middleware) — a non-member gets `403`.

All error responses share the shape `{ "error": "..." }`.

## Auth — `/auth` (`authRoutes.js` → `authController.js`)

### `POST /auth/signup`
Body: `{ name, email, password, avatar? }` (`avatar` is a `"hero-N"` string; invalid/omitted falls back to `null`).
`201` → `{ message, token, user: { id, name, email, avatar, created_at } }`.
`400` if a required field is missing or the email is already registered.

### `POST /auth/login`
Body: `{ email, password }`.
`200` → `{ message, token, user: { id, name, email, avatar, created_at } }`.
`400` on missing fields or invalid credentials (deliberately the same message for "no such user" and "wrong password").

## Groups — `/groups` (`groupRoutes.js` → `groupController.js`) 🔒

### `POST /groups`
Body: `{ name, icon?, color_theme? }` (`name` ≥ 3 chars after trim; `icon` any string ≤ 8 chars or `null`; `color_theme` one of `teal|gold|blue|purple|pink|red|orange|green`, defaults to `teal`). Creates the group and adds the caller as its first member (transactional).
`201` → `{ message, group }`.

### `GET /groups`
Lists every group the caller is a member of.
`200` → `{ groups: [...], count }`.

### `GET /groups/:id`
`200` → `{ group, members: [{ id, name, email, avatar, joined_at }, ...] }`.
`403` if caller isn't a member, `404` if the group doesn't exist.

### `POST /groups/:id/members`
Body: `{ email }`. Adds an existing user (looked up by email) to the group.
`201` → `{ message, member }`.
`400` missing email / already a member, `403` caller isn't a member, `404` no user with that email.

### `DELETE /groups/:id/members/:userId`
Only the group's `created_by` can remove members; the creator can't remove themself; a member with a non-zero net balance (≥ 1 cent, computed from bills/items/settlements) can't be removed until they settle up.
`200` → `{ message }`. `400`/`403`/`404` per the rules above.

## Bills — `/groups/:groupId/bills` (`billRoutes.js` → `billController.js`) 🔒👥

### `POST /groups/:groupId/bills`
`multipart/form-data`: field `images` (1-10 image files) + field `items` (a JSON-encoded string: `[{ name, price, unit_note?, contributor_ids: [userId, ...] }, ...]`) + field `purchase_date` (`YYYY-MM-DD`, required — when the purchase actually happened, prompted for up front on `AddBillPage` since it's often not the same day the receipt gets scanned/added) + optional `extra_charges` (a JSON-encoded string: `[{ name, amount }, ...]` — named bill-level charges like tax or a venue fee, default `[]`) + optional `tip_amount` (default `0`) + optional `tip_paid_by` (a group member's user id). Every `contributor_id` must be a current member of the group. Each item's price is split evenly across its contributors in integer cents (`splitCalculator.splitItemPrice` — any leftover cent goes to the lexicographically-first contributor id, so results are deterministic). `extra_charges` and any *shared* tip (`tip_paid_by` unset) are pooled and split the same way, but equally across every distinct contributor on the bill rather than per-item, and land in a separate `bill_charges` table (not `item_contributors`) since they aren't tied to one item — the named `bill_extra_charges` rows are what preserve the individual breakdown for display. If `tip_paid_by` is set, that member covered the tip themselves — it's excluded entirely from `total_amount` and `bill_charges`, since nobody owes it back. `total_amount = sum(item prices) + sum(extra_charges) + (tip_amount if shared, else 0)`. Inserts `bills` + `bill_images` + `bill_items` + `item_contributors` (+ `bill_extra_charges` for each named charge, + `bill_charges` if extra_charges/shared-tip sum to nonzero) in one transaction.
`201` → `{ message, bill, items: [{ id, name, price, unit_note, contributors: [{ user_id, share_amount }] }], extra_charges: [{ id, bill_id, name, amount }], charges: [{ user_id, share_amount }] }`.
`400` on missing/invalid images, malformed `items`/`extra_charges` JSON, a missing/invalid `purchase_date`, a charge or tip with a zero/non-numeric amount, a `tip_paid_by` who isn't a group member, an item missing a name/valid price/contributor, or a contributor who isn't a group member.

### `POST /groups/:groupId/bills/parse-receipt`
`multipart/form-data`: field `image` (single file). **Preview only — does not create a bill.** Runs the receipt through the PaddleOCR pipeline (see [architecture.md](architecture.md#receipt-ocr-pipeline)) and returns candidate items for the user to review/edit before calling `createBill`.
`200` → `{ items: [{ name, price, unit_note? }, ...], extra_charges: [{ name, price }, ...], raw_text, receipt_subtotal, receipt_total, receipt_tip }`. `extra_charges` is whatever `receiptParser.js`'s `CHARGE_LABEL_PATTERN` matched (tax, a venue fee, a surcharge, ...) — pulled out of `items` so it doesn't inflate the item subtotal or need a contributor split of its own. `receipt_subtotal`/`receipt_total`/`receipt_tip` are each `null` when that labeled line wasn't found in the scan — `receipt_subtotal` anchors the item-sum sanity check, `receipt_total` anchors the subtotal+charges+tip sanity check, and a non-null `receipt_tip` is what triggers `AddBillPage`'s "how should the tip be split" prompt (grocery receipts have none, so nothing gets asked).
`400` no image provided. `503` if the OCR worker fails even after one retry (message tells the user to retry later or add items manually — not a bare "Server error").

### `GET /groups/:groupId/bills`
List bill summaries for the group (adder's name, item count, distinct contributor count), newest first.
`200` → `{ bills: [...], count }`.

### `GET /groups/:groupId/bills/:billId`
Full bill detail.
`200` → `{ bill, images: [{ id, image_url, position }, ...], items: [{ id, name, price, unit_note, contributors: [{ user_id, name, email, avatar, share_amount }] }], extra_charges: [{ id, name, amount }], charges: [{ user_id, name, email, avatar, amount }] }`. `bill` includes `tip_amount`, `tip_paid_by`, a joined `tip_paid_by_name` (`null` unless one member covered the tip themselves), and a joined `added_by_name`/`added_by_avatar` for whoever fronted the bill — used by the frontend's per-bill "who owes what" breakdown (each contributor's summed item shares + charges owed back to `added_by`, the same fronted-total-owed-back semantics as `GET /groups/:groupId/balances` but scoped to just this one bill). `extra_charges` is the named list (e.g. `"Tax"`, `"B.C.H.Fee"`) as entered/scanned; `charges` is each contributor's equal share of `sum(extra_charges)` + any shared tip pooled together — empty when the bill had neither.
`404` if the bill doesn't exist (or doesn't belong to this group).

## Settlements — `/groups/:groupId/settlements` (`settlementRoutes.js` → `settlementController.js`) 🔒👥

### `POST /groups/:groupId/settlements`
Body: `{ paid_to, amount }` (`paid_to` a group-member UUID other than the caller; `amount` a positive number). Records a direct repayment from the caller to `paid_to`.
`201` → `{ message, settlement }`.
`400` if `paid_to` is the caller or not a group member, or `amount` isn't a positive number.

### `GET /groups/:groupId/settlements`
`200` → `{ settlements: [{ id, group_id, paid_by, paid_to, amount, created_at }, ...], count }`, newest first.

## Balances — `/groups/:groupId/balances` (`balanceRoutes.js` → `balanceController.js`) 🔒👥

### `GET /groups/:groupId/balances`
Net balance per current group member (bills paid − items consumed ± settlements), plus a suggested minimal-ish set of settle-up payments (see [ADR 0002](decisions/0002-greedy-debt-simplification.md)).
`200` → `{ balances: [{ user_id, name, email, net_balance }, ...], suggested_settlements: [{ from_user_id, from_name, to_user_id, to_name, amount }, ...] }`.

## Me — `/me` (`meRoutes.js` → `meController.js` / `balanceController.js`) 🔒

### `GET /me`
`200` → `{ user: { id, name, email, avatar, created_at } }`. `404` if the user record is gone (e.g. deleted between token issue and use).

### `PATCH /me/avatar`
Body: `{ avatar }` (must pass `isValidAvatar`, i.e. `"hero-N"` with `N` in range).
`200` → `{ user: { id, name, email, avatar, created_at } }`. `400` invalid avatar.

### `GET /me/balance-summary`
Sums the caller's net balance across every group they're in — **not netted across groups** (a receivable in one group and a payable in another both count separately).
`200` → `{ will_receive, will_pay }` (both non-negative decimal strings).

## Misc (defined inline in `app.js`, no controller)

- `GET /` → `{ message: "BillSplit API is running" }` — liveness check.
- `GET /test-db` → `{ message, time }` — confirms the Postgres connection works.
- `GET /protected` 🔒 → `{ message, user }` — smoke-tests JWT middleware.
