// backend/utils/parserProvider.js
// Single switch point between receipt-text parsers, mirroring ocrProvider.js.
// receiptParser.js (used for paddle/google - both keep item name and price
// on the same reading-order line) and receiptParserDocumentAI.js (Document
// AI splits them onto separate lines far more often, and needs its own
// noise handling - see ADR 0006) both export the same
// { parseReceiptLines, extractSubtotal, extractTotal, extractTip } shape,
// so billController.js requires this file instead of either parser
// directly, and stays in sync with whichever OCR_PROVIDER is active.
//
// receiptParserDocumentAI.js additionally exports parseReceiptFromDocument
// - a coordinate-aware entry point with no equivalent in receiptParser.js
// (see ADR 0007). billController.js feature-detects it rather than this
// file trying to paper over the difference with a stub on the other side.

function loadParser() {
  switch (process.env.OCR_PROVIDER) {
    case 'documentai':
      return require('./receiptParserDocumentAI');
    default:
      return require('./receiptParser');
  }
}

module.exports = loadParser();
