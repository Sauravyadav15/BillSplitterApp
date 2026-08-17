# 0005. Google Cloud Vision as a selectable OCR provider alongside PaddleOCR

Status: Accepted
Date: 2026-08-12

## Context

[ADR 0003](0003-paddleocr-receipt-pipeline.md) chose a self-hosted PaddleOCR worker to avoid per-request API cost and keep receipt images off a third party's servers. That worker keeps ML models loaded in memory and does CPU inference, which in practice means: a Python venv to provision on every deploy target, a non-trivial RAM/CPU footprint (the worker "can crash under memory pressure" per that ADR), and inference that serializes on a single core.

For a small-scale deployment (a personal/small-group instance, well under 50 users) on a budget VPS, that RAM/CPU footprint is the deciding factor in how large (and expensive) a server is needed — not disk or bandwidth. A hosted OCR API removes that footprint entirely at the cost of a small per-image fee and sending the receipt photo off-server.

At this project's expected volume, Google Cloud Vision's pricing (`TEXT_DETECTION`/`DOCUMENT_TEXT_DETECTION`, first 1,000 units/month free, then $1.50/1,000) works out to $0-single-digit-dollars a year — cheap enough that the real tradeoff is architectural (self-hosted footprint vs. external API + image leaving the server), not cost.

## Decision

Add `backend/utils/receiptOcrGoogle.js` as a second OCR backend implementing the same `{ extractTextFromImage(imagePath), warmUp() }` shape as `utils/receiptOcr.js`, and `backend/utils/ocrProvider.js` as the single switch point between them, selected by the `OCR_PROVIDER` env var (`google` or unset/`paddle`, defaulting to the existing PaddleOCR path so this is a non-breaking addition). `billController.js` and `index.js` require `ocrProvider.js`, never either backend directly, so switching providers is a config change, not a code change.

`receiptOcrGoogle.js` calls Vision's `documentTextDetection`, which returns text already reconstructed into reading order (`result.fullTextAnnotation.text`) — unlike the PaddleOCR path, it does not need `utils/ocrLineBuilder.js`'s pixel-position line reconstruction. Its `warmUp()` is a no-op: the API is stateless HTTP, so there's no model to preload.

## Consequences

- A deploy can now run without provisioning the PaddleOCR venv at all (skip it, set `OCR_PROVIDER=google` + a GCP service account credential), which is what makes a small/free-tier host viable for this app.
- Google Vision usage requires a GCP billing account on file (even to stay within the free tier) and sends each receipt photo to Google — a deliberate reversal of ADR 0003's "no receipt image leaves the server" property for whichever provider is active. Acceptable for a personal-scale deployment; worth reconsidering if the "no image leaves the server" property becomes a hard requirement again.
- Two OCR backends now need to be kept behaviorally equivalent from `receiptParser.js`'s point of view (same reading-order-text-in, candidate-items-out contract) — verified by both returning the same newline-joined text shape, not by shared line-reconstruction code, since Google's API does that step internally.
- PaddleOCR remains the default (`OCR_PROVIDER` unset), so nothing changes for the existing self-hosted deployment unless the env var is set.
