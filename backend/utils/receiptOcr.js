// backend/utils/receiptOcr.js
// Runs OCR (Tesseract.js) on an image and returns the raw text it finds.
// No interpretation of item vs. header here - that's receiptParser.js's job.

const { createWorker } = require('tesseract.js');

async function extractTextFromImage(imagePath) {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(imagePath);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

module.exports = { extractTextFromImage };
