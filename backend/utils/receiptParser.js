// backend/utils/receiptParser.js
// Turns raw OCR text into candidate {name, price} items. This is a heuristic,
// not a guarantee - real receipt photos vary a lot in layout, so results
// should be treated as suggestions for a human to review/edit, not ground truth.

// Allows an optional trailing tax-category code (or noisy OCR garbage after
// it, e.g. from a busy background bleeding stray characters into the line)
// after the price (e.g. "$11.98 C", "$1.49 HC") - as long as no digit appears
// in that trailing chunk, so it can never accidentally skip past a second,
// different price no matter how long the allowed gap is.
// Also allows an optional leading "-" (e.g. "FONTAINE SANTE HUMMUS OR DIPS 2
// -0.98") - some receipts print a manual price adjustment/return as its own
// negative-priced line rather than folding it into "Saving X" - without
// capturing the sign here, it gets left behind in the name and the price is
// read as positive, silently overcharging by 2x the adjustment.
const PRICE_AT_END = /(-)?\$?\s*(\d+\.\d{2})[^\d]{0,20}$/;

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
  'e&oe', 'trans.', 'account', 'card', 'auth', 'visa', 'debit', 'thank you',
  'customer care', 'rewards', 'points', 'cashier', 'datetime', 'ref #',
  'ref#', 'approved', 'purchase', 'food basic', 'items sold',
  'retain receipt', 'within 14', 'how did we', 'feedback', 'promotional',
  'discount', 'number of items', 'tender', 'change', 'chance', 'mastercard',
  'price match', 'served by', 'member card', 'spend $', 'earn', 'gratuity',
  'tip',
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

// Matches a line whose only text (once the trailing price is stripped) is
// the word "subtotal" itself - not "SUBTOTAL 139.21" mangled with anything
// else, and specifically not the "TOTAL" (post-tax) or "Total number of
// items sold" / "Total of your savings" lines that also contain "total".
// This is the right anchor to sanity-check parsed items against (rather than
// the post-tax TOTAL) because bill_items never include a tax line - a
// correctly-parsed item list should sum to the subtotal, not the total.
const SUBTOTAL_LINE = /^sub[\s-]?total\s*:?$/i;

// The post-tax total - unlike SUBTOTAL_LINE, this must not match "SUBTOTAL"
// itself (it requires the whole namePart to be just "total"), nor "Total
// number of items sold" / "Total of your savings" (those have extra words
// after "total", which the trailing `$` in PRICE_AT_END's namePart slice
// already excludes here since namePart is everything before the price).
const TOTAL_LINE = /^total\s*:?$/i;

// A tip/gratuity line isn't on every receipt (grocery receipts never have
// one; restaurant receipts sometimes do, either pre-printed or handwritten
// then re-scanned) - "gratuity" covers the more formal print style some
// restaurants use instead of "tip".
const TIP_LINE = /^(tip|gratuity)\s*:?$/i;

// A bill-level charge that isn't a purchasable product - tax, a venue fee
// (e.g. "B.C.H.Fee" - a bottle/can handling fee), a surcharge, a service
// charge. Word-boundaried so it only matches the word itself, not a
// substring inside an unrelated product name (e.g. "fee" must not match
// "COFFEE" or "TOFFEE" - `\bfee\b` doesn't, since there's no boundary
// between the doubled letters in the middle of those words). Tip/gratuity
// deliberately isn't included here - it's handled on its own path (see
// TIP_LINE / NOISE_KEYWORDS) since it's the one charge type that can be
// personally covered by one member instead of split.
const CHARGE_LABEL_PATTERN = /\b(tax|hst|gst|pst|vat|surcharge|svc\s*chg|service\s*charge|fee)\b/i;

// Best-effort: finds a labeled amount line (e.g. "SUBTOTAL 64.26"), if OCR
// picked up that line at all. Returns null (not a guess) when it can't find
// one - callers should skip whatever sanity check they wanted to run rather
// than compare against a missing anchor.
function extractLabeledAmount(rawText, labelPattern) {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    const priceMatch = line.match(PRICE_AT_END);
    if (!priceMatch) continue;

    const namePart = line.slice(0, priceMatch.index).trim();
    if (labelPattern.test(namePart)) {
      return parseFloat((priceMatch[1] || '') + priceMatch[2]);
    }
  }

  return null;
}

function extractSubtotal(rawText) {
  return extractLabeledAmount(rawText, SUBTOTAL_LINE);
}

function extractTotal(rawText) {
  return extractLabeledAmount(rawText, TOTAL_LINE);
}

function extractTip(rawText) {
  return extractLabeledAmount(rawText, TIP_LINE);
}

// Single pass over the receipt, classifying each priced line as either a
// purchasable item or a bill-level charge (see CHARGE_LABEL_PATTERN) -one
// pass rather than two so the noise-filtering/quantity-clause/item-code
// logic below can't drift out of sync between an "items" pass and a
// "charges" pass.
function parseReceiptLines(rawText) {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items = [];
  const charges = [];
  let lastNonPriceLine = null;

  for (const rawLine of lines) {
    let line = stripCategoryHeaderPrefix(rawLine);
    line = line.replace(EMBEDDED_SAVINGS_PHRASE, ' ').replace(/\s+/g, ' ').trim();

    if (!line || isNoiseLine(line)) {
      continue; // never an item or charge, never a fallback name candidate
    }

    const priceMatch = line.match(PRICE_AT_END);

    if (!priceMatch) {
      lastNonPriceLine = line;
      continue;
    }

    const price = parseFloat((priceMatch[1] || '') + priceMatch[2]);
    const namePart = line.slice(0, priceMatch.index).trim();

    // A tax/fee/surcharge line describes a bill-level charge, not a
    // product - route it to `charges` instead of `items` so it doesn't
    // inflate the items subtotal (and doesn't need a per-item contributor
    // split of its own; see billController.js, these split equally across
    // the bill's contributors same as everything else in `charges`).
    if (hasEnoughLetters(namePart) && CHARGE_LABEL_PATTERN.test(namePart)) {
      charges.push({ name: namePart, price });
      lastNonPriceLine = null;
      continue;
    }

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

  return { items, charges };
}

function parseReceiptItems(rawText) {
  return parseReceiptLines(rawText).items;
}

function parseReceiptCharges(rawText) {
  return parseReceiptLines(rawText).charges;
}

module.exports = {
  parseReceiptLines,
  parseReceiptItems,
  parseReceiptCharges,
  extractSubtotal,
  extractTotal,
  extractTip,
};
