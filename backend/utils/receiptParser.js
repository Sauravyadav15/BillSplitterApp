// backend/utils/receiptParser.js
// Turns raw OCR text into candidate {name, price} items. This is a heuristic,
// not a guarantee - real receipt photos vary a lot in layout, so results
// should be treated as suggestions for a human to review/edit, not ground truth.

const PRICE_AT_END = /\$?\s*(\d+\.\d{2})\s*$/;

// A "quantity/weight" line (e.g. "2 @ $1.79" or "0.075 kg @ $6.57/kg") carries
// the price but not the product name - the name is on the preceding line.
const QUANTITY_LINE = /(^\(?\d+\)?\s*[x@])|(\bkg\s*@)|(\/kg)|(\blb\s*@)|(\/lb)/i;

const NOISE_KEYWORDS = [
  'subtotal', 'total', 'saving', 'credit', 'store #', 'hst', 'e&oe',
  'trans.', 'account', 'card', 'auth', 'visa', 'thank you', 'customer care',
  'rewards', 'points', 'cashier', 'datetime', 'ref #', 'ref#', 'approved',
  'purchase', 'grocery', 'produce', 'meat', 'dairy', 'bakery', 'frozen',
  'deli', 'food basic', 'items sold', 'retain receipt', 'within 14',
  'how did we', 'feedback',
];

function isNoiseLine(line) {
  const lower = line.toLowerCase();
  return NOISE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function hasEnoughLetters(text) {
  return (text.match(/[a-zA-Z]/g) || []).length >= 2;
}

function parseReceiptItems(rawText) {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items = [];
  let lastNonPriceLine = null;

  for (const line of lines) {
    if (isNoiseLine(line)) {
      continue; // never an item, never a fallback name candidate
    }

    const priceMatch = line.match(PRICE_AT_END);

    if (!priceMatch) {
      lastNonPriceLine = line;
      continue;
    }

    const price = parseFloat(priceMatch[1]);
    const namePart = line.slice(0, priceMatch.index).trim();

    let name = namePart;
    if (!name || QUANTITY_LINE.test(namePart) || !hasEnoughLetters(namePart)) {
      name = lastNonPriceLine;
    }

    if (name && hasEnoughLetters(name)) {
      items.push({ name, price });
    }

    lastNonPriceLine = null;
  }

  return items;
}

module.exports = { parseReceiptItems };
