// backend/utils/ocrProvider.js
// Single switch point between OCR backends. All three modules export the
// same { extractTextFromImage, warmUp } shape - callers (billController.js,
// index.js) require this file instead of any backend directly, so switching
// providers is a one-line env change, not a code change. See ADR 0005/0006.
//   OCR_PROVIDER unset or "paddle" (default): receiptOcr.js - self-hosted PaddleOCR
//   OCR_PROVIDER=google:                      receiptOcrGoogle.js - Vision API
//   OCR_PROVIDER=documentai:                  receiptOcrDocumentAI.js - Document AI "Document OCR"
//
// receiptOcrDocumentAI.js additionally exports extractDocumentFromImage,
// returning the full Document AI response (token coordinates included, not
// just text) - no equivalent on the other two providers, since Vision/
// PaddleOCR don't expose the same kind of per-word geometry. billController.js
// feature-detects this rather than the other providers stubbing it out.

function loadProvider() {
  switch (process.env.OCR_PROVIDER) {
    case 'google':
      return require('./receiptOcrGoogle');
    case 'documentai':
      return require('./receiptOcrDocumentAI');
    default:
      return require('./receiptOcr');
  }
}

module.exports = loadProvider();
