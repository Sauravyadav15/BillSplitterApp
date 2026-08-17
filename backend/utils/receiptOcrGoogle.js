// backend/utils/receiptOcrGoogle.js
// Runs OCR on a receipt image via the Google Cloud Vision API instead of a
// local model - selected via OCR_PROVIDER, see utils/ocrProvider.js. Exists
// alongside receiptOcr.js (self-hosted PaddleOCR) so the app can run without
// provisioning a PaddleOCR venv or the RAM/CPU a local model needs; the
// tradeoff is per-image API cost and the receipt photo leaving the server.
// See ADR 0005.
//
// Google's DOCUMENT_TEXT_DETECTION returns text already reconstructed into
// reading order (result.fullTextAnnotation.text), so unlike receiptOcr.js
// this needs no ocrLineBuilder.js-style pixel-position line reconstruction.

const vision = require('@google-cloud/vision');

let client = null;

function getClient() {
  if (!client) {
    // Mirrors receiptOcr.js's PADDLE_OCR_PYTHON override: explicit key file
    // if given, otherwise fall back to Application Default Credentials
    // (GOOGLE_APPLICATION_CREDENTIALS or the environment's default service account).
    const keyFilename = process.env.GOOGLE_VISION_KEY_FILE;
    client = new vision.ImageAnnotatorClient(keyFilename ? { keyFilename } : undefined);
  }
  return client;
}

// No persistent process/model to preload - the API is stateless HTTP. Kept
// as a no-op for interface parity with receiptOcr.js's warmUp (called once
// at server startup regardless of which provider is active).
async function warmUp() {}

async function extractTextFromImage(imagePath) {
  const [result] = await getClient().documentTextDetection(imagePath);
  return result.fullTextAnnotation ? result.fullTextAnnotation.text : '';
}

module.exports = { extractTextFromImage, warmUp };
