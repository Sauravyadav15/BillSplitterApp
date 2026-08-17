// backend/utils/receiptOcrDocumentAI.js
// Runs OCR on a receipt image via Google Cloud Document AI's "Document OCR"
// processor - selected via OCR_PROVIDER=documentai, see utils/ocrProvider.js.
// A third OCR backend alongside receiptOcr.js (self-hosted PaddleOCR) and
// receiptOcrGoogle.js (Vision API) - see ADR 0006 for why this one exists:
// Document AI's "Expense Parser" processor (which auto-links prices to line
// items) was tried first and inconsistently dropped item prices on real
// receipts. "Document OCR" instead returns plain reading-order text, same
// contract as the other two providers, fed through the existing
// receiptParser.js heuristics rather than trusting a black-box entity linker.

const fs = require('fs');
const path = require('path');
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;

let client = null;

function getClient() {
  if (!client) {
    // Mirrors receiptOcr.js's PADDLE_OCR_PYTHON / receiptOcrGoogle.js's
    // GOOGLE_VISION_KEY_FILE override: explicit key file if given, otherwise
    // fall back to Application Default Credentials.
    const keyFilename = process.env.GOOGLE_DOCAI_KEY_FILE;
    client = new DocumentProcessorServiceClient(keyFilename ? { keyFilename } : undefined);
  }
  return client;
}

function processorName() {
  const projectId = process.env.DOCAI_PROJECT_ID;
  const location = process.env.DOCAI_LOCATION || 'us';
  const processorId = process.env.DOCAI_PROCESSOR_ID;
  if (!projectId || !processorId) {
    throw new Error('DOCAI_PROJECT_ID and DOCAI_PROCESSOR_ID must be set to use OCR_PROVIDER=documentai');
  }
  return `projects/${projectId}/locations/${location}/processors/${processorId}`;
}

// multer (see middleware/upload.js) preserves the original file extension
// but Document AI needs an explicit MIME type, not a guess from magic bytes.
const MIME_TYPES_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
};

// No persistent process/model to preload - the API is stateless HTTP. Kept
// as a no-op for interface parity with the other two providers' warmUp
// (called once at server startup regardless of which provider is active).
async function warmUp() {}

// The full Document AI `Document` object - `document.text` (reading-order
// plain text, same contract the other two providers return) plus
// `document.pages[].tokens[]`, each token's pixel/normalized bounding box
// and its slice into `document.text` (see receiptParserDocumentAI.js's
// `parseReceiptFromDocument` - ADR 0007 - for what the coordinate data is
// used for). `extractTextFromImage` below is a thin wrapper over this for
// callers that only need the text, so both entry points cost exactly one
// API call, never two.
async function extractDocumentFromImage(imagePath) {
  const mimeType = MIME_TYPES_BY_EXT[path.extname(imagePath).toLowerCase()] || 'image/jpeg';

  const [result] = await getClient().processDocument({
    name: processorName(),
    rawDocument: {
      content: fs.readFileSync(imagePath),
      mimeType,
    },
  });

  return result.document || null;
}

async function extractTextFromImage(imagePath) {
  const document = await extractDocumentFromImage(imagePath);
  return document ? document.text : '';
}

module.exports = { extractTextFromImage, extractDocumentFromImage, warmUp };
