// backend/utils/receiptParser.js
// Turns raw OCR text into candidate {name, price} items. This is a heuristic,
// not a guarantee - real receipt photos vary a lot in layout, so results
// should be treated as suggestions for a human to review/edit, not ground truth.

// Allows an optional trailing tax-category code (or noisy OCR garbage after
// it, e.g. from a busy background bleeding stray characters into the line)
// after the price (e.g. "$11.98 C", "$1.49 HC") - as long as no digit appears
// in that trailing chunk, so it can never accidentally skip past a second,
// different price no matter how long the allowed gap is.
const PRICE_AT_END = /\$?\s*(\d+\.\d{2})[^\d]{0,20}$/;

// A "quantity/weight" line (e.g. "2 @ $1.79" or "0.075 kg @ $6.57/kg") carries
// the price but not the product name - the name is on the preceding line.
// Decimal separator allows a comma too - some OCR passes misread the period
// in a weight value (e.g. "0,290 kg" instead of "0.290 kg"). Not anchored to
// line start: noisy images can put stray characters before the real content,
// but a plain item name is very unlikely to contain "N.NNN kg/lb" as a
// substring, so matching anywhere in the line is still safe.
const QUANTITY_LINE = /(\(?\d+\)?\s*[x@])|(\bkg\s*@)|(\/\s*kg)|(\blb\s*@)|(\/\s*lb)|(\d+[.,]\d+\s*kg\b)|(\d+[.,]\d+\s*lb\b)/i;

const NOISE_KEYWORDS = [
  'subtotal', 'total', 'saving', 'saved', 'credit', 'store #', 'hst', 'gst',
  'e&oe', 'trans.', 'account', 'card', 'auth', 'visa', 'thank you',
  'customer care', 'rewards', 'points', 'cashier', 'datetime', 'ref #',
  'ref#', 'approved', 'purchase', 'food basic', 'items sold',
  'retain receipt', 'within 14', 'how did we', 'feedback', 'promotional',
  'discount', 'number of items', 'tender', 'change', 'chance', 'mastercard',
  'price match', 'served by', 'member card', 'spend $', 'earn',
];

// Grocery category labels (e.g. "GROCERY", "PRODUCE") print as their own
// line above the items in that section on most receipts, but a bounding-box
// line reconstruction can occasionally pull one onto the same line as the
// single item that follows it (e.g. a short receipt with only one produce
// item). Treating these as a full-line noise keyword would silently drop
// that item along with the label, so instead only the leading label itself
// is stripped, and whatever remains on the line is still parsed normally.
const CATEGORY_HEADER_PREFIXES = ['grocery', 'produce', 'meat', 'dairy', 'bakery', 'frozen', 'deli'];

function stripCategoryHeaderPrefix(line) {
  for (const keyword of CATEGORY_HEADER_PREFIXES) {
    const prefixPattern = new RegExp(`^${keyword}\\b\\s*`, 'i');
    if (prefixPattern.test(line)) {
      return line.replace(prefixPattern, '').trim();
    }
  }
  return line;
}

// "YOU SAVED $1.00" / "SAVING 0.40" / "INSTANT SAVINGS -$1.20" / "YOU PRICE
// MATCHED & SAVED $1.24" - a loyalty-discount note that a receipt prints on
// its own line, but which a bounding-box line reconstruction can fuse onto
// the very item line it applies to (its dollar amount sits between the item
// name and the item's real price, e.g. "Cheese Cheddar YOU SAVED $1.00
// $5.79 C"). Rather than let the presence of "saved" anywhere in the line
// nuke the whole line via NOISE_KEYWORDS (discarding a real item), this
// strips just the discount phrase out first so the name and its actual
// trailing price are left intact.
const EMBEDDED_SAVINGS_PHRASE = /\b(you\s+)?(instant\s+)?(price\s+matched\s*&?\s*)?sav(?:ed|ing)s?\b[^$\d]{0,25}-?\$?\d+\.\d{2}/gi;

function isNoiseLine(line) {
  const lower = line.toLowerCase();
  return NOISE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

// Many receipt formats glue a product/PLU/UPC code onto the item name,
// either before it (e.g. a No Frills bill: "06038301095 PC SPLENDIDO TMT")
// or after it (e.g. a FreshCo bill: "Lentils Red 5574252489") - same kind of
// noise, opposite position, and it's not specific to grocery stores. A bare
// number isn't stripped if it looks like a real quantity marker instead
// (e.g. "2 x", "3 @") - that's meaningful and left in place; only a plain
// numeric code with nothing to say it's a quantity gets removed.
const LEADING_ITEM_CODE = /^\(?\d{1,13}\)?[.):-]?\s+(?![x×@])/i;
const TRAILING_ITEM_CODE = /\s+\(?\d{4,13}\)?$/;

function stripItemCodeNoise(name) {
  return name.replace(LEADING_ITEM_CODE, '').replace(TRAILING_ITEM_CODE, '').trim();
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

  for (const rawLine of lines) {
    let line = stripCategoryHeaderPrefix(rawLine);
    line = line.replace(EMBEDDED_SAVINGS_PHRASE, ' ').replace(/\s+/g, ' ').trim();

    if (!line || isNoiseLine(line)) {
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
    let unitNote = null;
    if (!name || !hasEnoughLetters(namePart)) {
      name = lastNonPriceLine;
    } else {
      // A quantity clause (e.g. "2 @ $0.59" or "0.075 kg @ $6.57/kg") can end
      // up fused onto the same reconstructed line as the item name it
      // belongs to, rather than sitting on its own line as usual. Salvage
      // whatever name text comes before the clause instead of discarding the
      // whole line - and keep the clause itself as a "unit_note" (the actual
      // weight/count and per-unit rate) instead of throwing it away, so the
      // review UI can show it under the name for the shopper to sanity-check
      // the scanned total against.
      const quantityMatch = namePart.match(QUANTITY_LINE);
      if (quantityMatch) {
        unitNote = namePart.slice(quantityMatch.index).trim() || null;
        const leading = namePart.slice(0, quantityMatch.index).trim();
        name = hasEnoughLetters(leading) ? leading : lastNonPriceLine;
      }
    }

    if (name) {
      name = stripItemCodeNoise(name);
    }

    if (name && hasEnoughLetters(name)) {
      items.push({ name, price, unit_note: unitNote });
    }

    lastNonPriceLine = null;
  }

  return items;
}

module.exports = { parseReceiptItems };
