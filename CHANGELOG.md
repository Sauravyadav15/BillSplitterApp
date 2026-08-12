# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- `bills.purchase_date`: `AddBillPage` now prompts for the date of purchase (defaulting to today) before the rest of the Add Bill form is usable, since a receipt is often scanned days after the purchase itself. Required on `POST /groups/:groupId/bills`, shown on bill cards and the bill detail page in place of `created_at`.
- Additional charges (tax, fees, tip): `receiptParser.js` now recognizes bill-level charge lines (tax, a venue fee like "B.C.H.Fee", a surcharge - see `CHARGE_LABEL_PATTERN`) and pulls them out of the scanned item list into a new `extra_charges` list, instead of letting them get misparsed as purchasable items and inflating the item subtotal. `AddBillPage` shows these in a grey "Additional charges" box after the item list (auto-filled from the scan, editable, with a "+ Add Charge" button for anything OCR missed) alongside `Subtotal` / `Total`, and flags a mismatch against the receipt's own scanned `SUBTOTAL`/`TOTAL` lines (`extractTotal`/`extractTip`). All additional charges split equally across the bill's contributors; a tip is only ever asked about when OCR actually finds one, and can either split equally or be marked as fully covered by one member (excluded from what others owe). See [ADR 0004](docs/decisions/0004-tax-tip-splitting.md) for the split-math design and the new `bills.tip_amount`/`tip_paid_by` columns + `bill_extra_charges`/`bill_charges` tables this required.

### Fixed
- Tests and the dev server shared one database (`DATABASE_URL`) - the test suite's `beforeAll` `TRUNCATE`s every table, so running `npm test` while the app was running wiped every real account, group, and bill. Added `TEST_DATABASE_URL`, a separate database `config/db.js` now switches to whenever `NODE_ENV=test` (which Jest sets automatically), so tests can no longer touch dev data. Requires a new `billsplit_test` (or equivalent) database with `config/schema.sql` applied - see `backend/README.md`.
- `AddBillPage`'s receipt cropper defaulted to a box trimmed 5-10% in from every edge; on a real photo with even a slight tilt, that default was tight enough to clip the first character of left-aligned lines and the last digit of prices, which silently broke `PRICE_AT_END` matching and could drop most or all scanned items. Default crop now starts at the full image instead, so users only trim inward if they choose to.
- `receiptParser.js`'s `PRICE_AT_END` didn't allow a leading `-`, so a receipt line printing a negative price (e.g. a manual return/adjustment line like "FONTAINE SANTE HUMMUS OR DIPS 2  -0.98") was parsed as positive - silently overcharging by 2x the adjustment and leaving a stray `-` on the item name. The sign is now captured as part of the price.

## 2026-07-28

### Added
- Landing page (hero, features, FAQ, demo sections) and PWA icons.
- `/me` route: profile page, avatar picker, own-balance summary (`meController.js`, `meRoutes.js`).
- Group icon/color-theme picker, group avatar badges, merged-bills tile, contributor split bar, and other dashboard/group-page UI refinements.

## 2026-07-24 (a)

### Changed
- Adding at least one group member is now required before a bill can be split (previously a bill could be created with no contributors).
- Frontend retheme from the default look to a dark/blue color scheme.

## 2026-07-24 (b)

### Added
- Auth pages (login/signup) and their API wiring.
- Group, bill, and settlement UI: create/view groups, add bills, record settlements, view balances.
- PaddleOCR receipt-scanning pipeline end to end — see [ADR 0003](docs/decisions/0003-paddleocr-receipt-pipeline.md).

## 2026-07-21

### Added
- Backend support for bills, settlements, and balances: `billController`, `settlementController`, `balanceController`, `bill_items`/`item_contributors`/`settlements` tables wired up.
- Debt simplification (`utils/debtSimplifier.js`) — see [ADR 0002](docs/decisions/0002-greedy-debt-simplification.md).
- Receipt OCR extraction utilities (`utils/receiptOcr.js`, `ocrLineBuilder.js`, `receiptParser.js`).

## 2026-05-12

### Added
- Initial commit: project scaffolding for `backend/` (Express + PostgreSQL) and `frontend/` (React + Vite), auth (signup/login) and groups (create/list/get/add-member) — see [ADR 0001](docs/decisions/0001-jwt-based-auth.md).
