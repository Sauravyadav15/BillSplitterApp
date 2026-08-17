// backend/scripts/reconcile-fixtures.js
// Runs every image in tests/fixtures/ through the live Document AI OCR
// provider (utils/receiptOcrDocumentAI.js) and the ADR 0007 coordinate
// parser (utils/receiptParserDocumentAI.js's parseReceiptFromDocument),
// then reports each fixture's arithmetic reconciliation - not a
// pass/fail assertion, just the numbers, since a receipt with real
// unrecoverable promo discounts (see receiptParserDocumentAI.js's
// reconciliationError comment) never reconciles to exactly zero even on a
// fully correct parse.
//
// Usage (from backend/): node scripts/reconcile-fixtures.js
//
// Makes one real Document AI API call per fixture - requires the same
// DOCAI_PROJECT_ID/DOCAI_PROCESSOR_ID/GOOGLE_APPLICATION_CREDENTIALS env
// vars app.js uses (see backend/README.md).

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { extractDocumentFromImage } = require('../utils/receiptOcrDocumentAI');
const { parseReceiptFromDocument } = require('../utils/receiptParserDocumentAI');

const FIXTURES_DIR = path.join(__dirname, '..', 'tests', 'fixtures');

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Mirrors reconciliationError's two checks individually instead of summed,
// so itemGap and totalGap can be reported separately as the task asks -
// 'N/A' when the anchor value(s) needed for that particular check weren't
// found at all, never a fabricated 0.
function computeGaps(result) {
  const itemSum = result.items.reduce((sum, item) => sum + item.price, 0);
  const chargeSum = result.charges.reduce((sum, charge) => sum + charge.price, 0);

  const itemGap = result.subtotal != null ? round2(Math.abs(itemSum - result.subtotal)) : 'N/A';
  const totalGap =
    result.subtotal != null && result.total != null
      ? round2(Math.abs(result.subtotal + chargeSum - result.total))
      : 'N/A';

  return { itemGap, totalGap };
}

async function main() {
  const fixtureFiles = fs
    .readdirSync(FIXTURES_DIR)
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .sort();

  const rows = [];

  for (const fixtureFile of fixtureFiles) {
    const imagePath = path.join(FIXTURES_DIR, fixtureFile);
    try {
      const document = await extractDocumentFromImage(imagePath);
      const result = parseReceiptFromDocument(document);
      const { itemGap, totalGap } = computeGaps(result);
      rows.push({
        fixture: fixtureFile,
        usedCoordinates: result.usedCoordinates,
        needsReview: result.needsReview,
        itemGap,
        totalGap,
      });
    } catch (err) {
      rows.push({ fixture: fixtureFile, usedCoordinates: 'ERROR', needsReview: err.message, itemGap: 'N/A', totalGap: 'N/A' });
    }
  }

  console.table(rows);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
