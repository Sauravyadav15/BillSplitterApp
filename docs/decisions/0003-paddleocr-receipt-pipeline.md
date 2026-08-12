# 0003. Self-hosted PaddleOCR pipeline for receipt scanning

Status: Accepted
Date: 2026-07-24

## Context

`AddBillPage` needs to turn a photo of a receipt into candidate line items (name + price) that a user reviews/edits before a bill is created. Options considered: a hosted OCR API (Google Vision, AWS Textract, etc.) vs. a self-hosted open-source OCR engine.

## Decision

Run PaddleOCR locally via a persistent Python worker process (`backend/paddle_ocr/ocr_server.py`, spawned and kept alive by `backend/utils/receiptOcr.js`), rather than calling a hosted OCR API per request. `index.js` calls `warmUp()` at server startup so the ~20-30s model load happens once, not on a user's first scan.

Raw OCR text boxes are reconstructed into reading-order lines by pixel position (`utils/ocrLineBuilder.js` groups boxes by y-center with a per-line adaptive gap threshold — a fixed global threshold either merges dense body rows or splits sparse headers), then parsed into `{name, price}` candidates by `utils/receiptParser.js` using a set of heuristics (price-at-end regex, quantity/weight-line detection, noise-keyword filtering, embedded-savings-phrase stripping).

## Consequences

- No per-request cost or external API dependency/quota for OCR, and no receipt image leaves the server.
- Ops cost instead: a Python venv (`.venv_paddleocr`) must be provisioned alongside the Node backend, and the worker can crash under memory pressure — `receiptOcr.js` respawns it, and `billController.parseReceipt` retries once before giving up with a "temporarily unavailable" response rather than a bare 500.
- The parser is explicitly heuristic, not authoritative — `parseReceipt` is a preview-only endpoint; the frontend is expected to let the user review/edit results before `createBill` is called with the final item list. Any receipt layout the heuristics don't handle degrades to "user fixes it by hand," not a hard failure.
