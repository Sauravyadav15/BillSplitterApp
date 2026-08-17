// backend/utils/receiptParserDocumentAI.js
// Turns Document AI's OCR output into candidate {name, price} items - a
// dedicated sibling to receiptParser.js (used by receiptOcr.js/PaddleOCR and
// receiptOcrGoogle.js/Vision), not a shared implementation. See ADR 0006.
//
// Why a separate file instead of reusing receiptParser.js: that parser's
// "use the previous non-price line as the item name" fallback assumes name
// and price are usually on the same reconstructed line, with at most an
// occasional stray line between them. Document AI's document.text splits
// name and price onto separate lines far more often (see ADR 0006's "Known
// limitation" section), which means far more opportunities for something
// that isn't a real item name (or isn't a real final price) to land in
// between and corrupt the result - a per-item code printed on its own line
// ("MRJ", "HMRJ") can overwrite the real pending name, a promo/adjustment
// annotation ("ARCP: 50.00% ($6.49)") can read as a second priced item, a
// bare per-unit rate ("2 @ $2.69", "$11.00/kg") can get taken as the final
// price when the real line total is a separate, later line, and the
// SUBTOTAL/TOTAL section's labels routinely land far from their values.
// Trying to harden receiptParser.js's shared logic against all of that
// risked regressing the PaddleOCR/Vision path, which doesn't have these
// failure modes - a separate, independently tunable file avoids that risk.
//
// Two entry points, both exported:
//
// - parseReceiptLines(rawText) / extractSubtotal(rawText) / etc. - the
//   original text-only path, built around an explicit line classification
//   (ITEM NAME / ITEM PRICE / ITEM NOTE / DISCARD / FOOTER, see
//   classifyLines below) applied to document.text's own line breaks. Kept
//   working exactly as before - every OCR provider's contract guarantees
//   plain text, so this always has something to fall back to.
//
// - parseReceiptFromDocument(document) - see ADR 0007. Document AI's own
//   reading order in document.text is *itself* the root cause of most of
//   the failure modes above (a name and its price landing on separate
//   "lines" even though they're visually on the same physical row, or vice
//   versa). Rather than out-guessing that reading order with more text
//   heuristics, this rebuilds "lines" directly from each word token's own
//   pixel position - grouping into rows by physical proximity instead of
//   trusting Document AI's line breaks - then runs the exact same
//   classifyLines logic on those geometrically-correct lines. Falls back to
//   the text-only path when coordinate data isn't usable or doesn't
//   arithmetically reconcile; never fabricates a result neither path can
//   verify (see the arithmetic-validation cascade at the bottom).

const PRICE_AT_END = /(-)?\$?\s*(\d+\.\d{2})([^\d]{0,20})$/;
const QUANTITY_LINE = /(\(?\d+\)?\s*[x@])|(\bkg\s*@)|(\/\s*kg)|(\blb\s*@)|(\/\s*lb)|(\d+[.,]\d+\s*kg\b)|(\d+[.,]\d+\s*lb\b)/i;

// A price whose trailing junk is a per-unit rate suffix ("/kg", "/lb",
// "/EA") is itself a rate, not a line total - e.g. "$11.00/kg", "$0.99/EA".
const RATE_SUFFIX = /\/\s*(kg|lb|ea)\b/i;

// A per-unit-price confirmation line for a "sold by count" item (e.g. "EA
// 0.99/EA", the item's own name+price already captured on a prior line) -
// same failure mode as receiptParser.js's identically-named constant (see
// that file's comment): "EA" alone reads as a plausible 2-letter item name
// unless forced back to the fallback path.
const BARE_EACH_MARKER = /^\(?\d*\)?\s*ea\s*@?$/i;

// A promo/alternate-pricing blurb (e.g. "$2.47 Int 4, ", "$1.97 ea or 2/$")
// - text before the line's real trailing price that itself contains another
// price-shaped number. A real item name never contains a dollar amount, so
// this is a strong, wording-independent signal that the whole line is a
// pricing annotation, not a description - catches both "$X.XX Int N," (a
// bulk-buy price callout) and "$X.XX ea or N/$Y.YY" (an alternate-quantity
// price) without hardcoding either phrase, which matters since OCR mangles
// the wording inconsistently (e.g. "Int" read as "1nt").
const EMBEDDED_PRICE = /\d+\.\d{2}/;

const NOISE_KEYWORDS = [
  'subtotal', 'total', 'saving', 'saved', 'credit', 'store #', 'hst', 'gst',
  'e&oe', 'trans.', 'account', 'card', 'auth', 'visa', 'debit', 'thank you',
  'customer care', 'rewards', 'points', 'cashier', 'datetime', 'ref #',
  'ref#', 'approved', 'purchase', 'items sold', 'retain receipt',
  'within 14', 'how did we', 'feedback', 'promotional', 'discount',
  'number of items', 'tender', 'change', 'chance', 'mastercard',
  'price match', 'served by', 'member card', 'spend $', 'earn', 'gratuity',
  'tip',
  // Document-AI-specific noise seen in testing (see ADR 0006):
  'arcp', // "ARCP: 50.00% ($6.49)" - an in-store promo/adjusted-price
  // annotation line, not a second purchasable item - the real item was
  // already captured from its own name+price line before this one.
];

// "80 PTS" - a loyalty-points line whose count varies, so a fixed keyword
// can't catch it the way NOISE_KEYWORDS catches "POINTS EARNED".
const PTS_LINE = /^\d+\s*pts\.?$/i;

// A discount amount printed on its own line with nothing else on it (e.g.
// "-$1.00" right after "INSTANT SAVINGS", each its own Document AI line) -
// the label line is already caught by NOISE_KEYWORDS ('saving'), but the
// bare value line that follows isn't, and would otherwise be read as an
// orphaned price and misattached as a unit note on whatever item is open.
// Used by extractNegativeAdjustment below, which subtracts this from the
// currently open item instead of discarding it outright.
const STANDALONE_NEGATIVE_PRICE = /^-\$?\s*\d+\.\d{2}\s*$/;

// Resolves a discount/adjustment line to the negative amount it should
// subtract from the currently open item, or null if the line isn't one.
// Two shapes: a bare value with nothing else on it (STANDALONE_NEGATIVE_PRICE,
// e.g. "-$1.00" as its own Document AI line), or a label+value fused onto
// one line by the coordinate path's row reconstruction (e.g. "INSTANT
// SAVINGS -$1.00" as one row - the same label+value fusion the footer
// boundary fix above handles for SUBTOTAL/TOTAL) - recognized by
// isNoiseLine matching the label part (e.g. 'saving') with an explicit
// trailing negative price. Deliberately requires an explicit leading minus
// sign on the price itself: a *positive* "YOU SAVED $X" / "Saving $X" line
// is NOT a valid adjustment - the printed item price is already net of
// those on every receipt seen in testing, and subtracting it again
// double-counts the discount (confirmed on bill4.webp: doing so was off by
// $2.00 in the wrong direction).
function extractNegativeAdjustment(line) {
  if (STANDALONE_NEGATIVE_PRICE.test(line)) {
    return parseFloat(line.replace(/[^\d.-]/g, ''));
  }
  if (isNoiseLine(line)) {
    const priceMatch = line.match(PRICE_AT_END);
    if (priceMatch && priceMatch[1] === '-') {
      return parseFloat(priceMatch[1] + priceMatch[2]);
    }
  }
  return null;
}

const CATEGORY_HEADER_PREFIXES = [
  'frozen food',
  'grocery', 'produce', 'meat', 'dairy', 'bakery', 'frozen', 'deli',
];

// A whole-line numbered department header, e.g. "21-GROCERY", "34-BAKERY
// COMMERCIAL" (seen on this store's receipts in place of a bare "GROCERY"
// line) - never a price or an item name, so treated as noise outright
// rather than routed through CATEGORY_HEADER_PREFIXES' partial-strip.
const NUMBERED_CATEGORY_HEADER = /^\d{1,3}-[A-Z][A-Z .]*$/;

// A short, single-token, all-caps fragment with no digits or spaces (e.g.
// "MRJ", "HMRJ", "GPMRJ", "RQ", "GPRO") - some receipts print a per-item
// code like this as its own text line between the item's name line and its
// price line. Length alone isn't a safe signal: a real single-word item
// name that happens to be short and standalone on its own line (e.g.
// "BANANA", "KALE" - both real items in testing) matches the same
// 2-6-letter shape and was being silently discarded by an earlier version
// of this check. Every code fragment seen in testing has 0-1 vowels
// (consonant clusters, not words); every real short item name seen has 2+.
// Not foolproof (a real word like "EGGS" has only 1 vowel and would still
// be misread if it ever appeared standalone), but it's the distinguishing
// signal actually available in plain text, and correctly separates every
// code/name pair observed so far.
const CODE_FRAGMENT_SHAPE = /^[A-Z]{2,6}$/;
function looksLikeCodeFragment(line) {
  if (!CODE_FRAGMENT_SHAPE.test(line)) return false;
  return (line.match(/[AEIOU]/g) || []).length < 2;
}

// A weighed-item detail line ("1.055 kg Gross", "-0.010 kg Tare =",
// "1.045 kg Net") - informational, never the name and never (on its own)
// the final price; skip without disturbing anything pending.
const WEIGHT_DETAIL_LINE = /^-?\d+\.\d{3}\s*kg\s*(Gross|Tare|Net)\b/i;

// A bare weight-only line with no rate of its own yet (e.g. "0.480 kg") -
// Document AI often splits a weighed item's note across two lines, this one
// then a separate "$3.28/kg" rate line. Held as a "fragment" and joined with
// whatever price-only line comes right after it into one readable unit note
// ("0.480 kg @ $3.28/kg") instead of being misread as a fresh item name
// (which used to let the following rate line's price attach to a bogus item
// literally named "0.480 kg" - a real bug, see CHANGELOG).
const BARE_WEIGHT_LINE = /^-?\d+[.,]\d{1,3}\s*(kg|lb)\.?$/i;

// A bare 1-3 digit count line (e.g. "2") with nothing else on it - the same
// splitting behavior as BARE_WEIGHT_LINE, but for a multi-buy note (e.g.
// "2" then "1/$5.99" as two separate lines, joined into "2 @ 1/$5.99").
// Scoped to short numbers only (never a barcode/PLU-length code) and only
// ever consulted while scanning the item list, never in the footer.
const BARE_COUNT_LINE = /^\(?\d{1,3}\)?$/;

function stripCategoryHeaderPrefix(line) {
  for (const keyword of CATEGORY_HEADER_PREFIXES) {
    const prefixPattern = new RegExp(`^${keyword}\\b\\s*`, 'i');
    if (prefixPattern.test(line)) {
      return line.replace(prefixPattern, '').trim();
    }
  }
  return line;
}

const EMBEDDED_SAVINGS_PHRASE = /\b(you\s+)?(instant\s+)?(price\s+matched\s*&?\s*)?sav(?:ed|ing)s?\b[^$\d]{0,25}-?\$?\d+\.\d{2}/gi;

function isNoiseLine(line) {
  const lower = line.toLowerCase();
  return NOISE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

const LEADING_ITEM_CODE = /^\(?\d{1,13}\)?[.):-]?\s+(?![x×@])/i;
const TRAILING_ITEM_CODE = /\s+\(?\d{4,13}\)?$/;

function stripItemCodeNoise(name) {
  return name.replace(LEADING_ITEM_CODE, '').replace(TRAILING_ITEM_CODE, '').trim();
}

function hasEnoughLetters(text) {
  return (text.match(/[a-zA-Z]/g) || []).length >= 2;
}

const SUBTOTAL_LINE = /^sub[\s-]?total\s*:?$/i;
const TOTAL_LINE = /^total\s*:?$/i;
const TIP_LINE = /^(tip|gratuity)\s*:?$/i;
const CHARGE_LABEL_PATTERN = /\b(tax|hst|gst|pst|vat|surcharge|svc\s*chg|service\s*charge|fee)\b/i;

// A line that is nothing but a standalone price - not a bare orphaned
// number that happens to trail a label some lines later (that's the
// pattern the positional-heuristic rejection below is about), but the
// *very next* line after the label with nothing else on it.
const STANDALONE_PRICE_LINE = /^\$?\s*\d+\.\d{2}\s*$/;

// A handful of markers that sit right next to (or immediately before) the
// actual amount paid on real receipts - a bank card network name, a
// tender/payment-method label, or an explicit currency code. Deliberately
// narrow (not a general "any dollar amount" pattern): used only as a
// last-resort candidate source for TOTAL in extractTotalFromLines below,
// and a candidate found this way is never returned on its own - only once
// verified against subtotal + charges, so a false-positive match here
// can't produce a wrong total by itself.
const TOTAL_CANDIDATE_MARKER = /\b(cad\$|debit|tender|mastercard|visa)\b/i;

// How many lines from the end of the receipt still count as "near the end"
// for a bare, unlabeled amount to be considered a TOTAL candidate - real
// receipts sometimes reprint the final charged amount a second time in
// this region (observed on a real fixture: the receipt's total reappears,
// unlabeled, two lines after an unrelated garbled line) with no marker
// word attached at all. Kept small deliberately: a bare price line further
// back is far more likely to be an unrelated value (a subtotal, an item
// price, a savings total) than the receipt's own total.
const TOTAL_CANDIDATE_TAIL_LINES = 10;

// How close a candidate has to land to count as a match in the arithmetic
// checks below - a few cents, to absorb per-line rounding in how the
// receipt itself computed tax/fees, not a wide "close enough" guess.
const ARITHMETIC_TOLERANCE = 0.02;

function splitLines(rawText) {
  return (rawText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// Same same-line best-effort lookup as receiptParser.js, still with a real
// limitation for Document AI (see ADR 0006): a positional heuristic ("the
// first orphaned footer value is the subtotal, the last is the total") was
// tried during development and rejected - it happened to work on 2 of 3
// test receipts but silently produced a plausible-looking wrong number on
// the third (a receipt with a promotional "today's savings" block between
// the labels and their real values), worse than an honest null.
//
// What *is* safe, and checked first: the label's value on the very next
// line, alone, with nothing else on it (e.g. "SUBTOTAL" then "113.65" as
// two consecutive lines) - unlike the rejected heuristic, this can never
// misattribute a value from elsewhere in the footer, since it only fires
// when there's a single unambiguous candidate immediately adjacent to the
// label. When that's not the case (the label and value are separated by
// other lines, or the label itself is OCR-garbled beyond recognition, e.g.
// "TOTAL" misread as "ΤΩΤΑΙ" on one receipt in testing), this still
// legitimately can't find it on its own - see the arithmetic fallback in
// extractTotalFromLines/extractSubtotalFromLines below for what recovers
// some of these.
function extractLabeledAmountFromLines(lines, labelPattern) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const priceMatch = line.match(PRICE_AT_END);

    if (priceMatch) {
      const namePart = line.slice(0, priceMatch.index).trim();
      if (labelPattern.test(namePart)) {
        return parseFloat((priceMatch[1] || '') + priceMatch[2]);
      }
      continue;
    }

    if (labelPattern.test(line) && i + 1 < lines.length && STANDALONE_PRICE_LINE.test(lines[i + 1])) {
      return parseFloat(lines[i + 1].replace(/[^\d.]/g, ''));
    }
  }

  return null;
}

// Collects every plausible TOTAL value the receipt's lines might contain
// besides the one (if any) `extractLabeledAmountFromLines` already found
// next to a "TOTAL" label - never returned directly, only ever checked
// against subtotal + charges by `findVerifiedTotalCandidate` below. Two
// sources: a marker-adjacent value (same line, or the very next line - the
// same adjacency rule extractLabeledAmountFromLines itself uses) and any
// bare price line within the last few lines of the receipt (see
// TOTAL_CANDIDATE_TAIL_LINES).
//
// `afterIndex` excludes everything at or before the SUBTOTAL line's own
// position (passed in by extractTotalFromLines) - without it, a short
// receipt can end up with the subtotal's own printed value falling inside
// the tail window, and if no charges were detected that value trivially
// "matches" subtotal + 0 charges (since that's exactly what it *is*),
// falsely verifying the subtotal as if it were an independently-printed
// total.
function collectTotalCandidates(lines, afterIndex) {
  const candidates = [];

  for (let i = afterIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const priceMatch = line.match(PRICE_AT_END);

    if (priceMatch && TOTAL_CANDIDATE_MARKER.test(line)) {
      candidates.push(parseFloat((priceMatch[1] || '') + priceMatch[2]));
      continue;
    }

    if (TOTAL_CANDIDATE_MARKER.test(line) && i + 1 < lines.length && STANDALONE_PRICE_LINE.test(lines[i + 1])) {
      candidates.push(parseFloat(lines[i + 1].replace(/[^\d.]/g, '')));
    }
  }

  const tailStart = Math.max(afterIndex + 1, lines.length - TOTAL_CANDIDATE_TAIL_LINES);
  for (let i = tailStart; i < lines.length; i++) {
    if (STANDALONE_PRICE_LINE.test(lines[i])) {
      candidates.push(parseFloat(lines[i].replace(/[^\d.]/g, '')));
    }
  }

  return candidates;
}

// The only way a candidate from collectTotalCandidates is ever actually
// used: it has to reconcile with subtotal + charges within a few cents.
// This is what makes the fallback safe to add at all - an unverified
// candidate is no more trustworthy than the unreliable value it would be
// replacing (same reasoning as the ΤΩΤΑΙ-garbled-label case noted in
// extractLabeledAmountFromLines's comment above: a wrong guess is worse
// than an honest null), so extractTotalFromLines only ever uses whatever
// this returns, never the raw candidate list.
function findVerifiedTotalCandidate(lines, expectedTotal, afterIndex) {
  for (const candidate of collectTotalCandidates(lines, afterIndex)) {
    if (Math.abs(candidate - expectedTotal) <= ARITHMETIC_TOLERANCE) {
      return candidate;
    }
  }
  return null;
}

// Searches for a verified SUBTOTAL value the same way findVerifiedTotalCandidate
// does for TOTAL: a candidate is never trusted on its own, only once it
// reconciles with total - charges. Unlike TOTAL, there's no reliable
// payment-section marker to key off - a subtotal isn't printed next to
// "TENDER"/"DEBIT"/etc. - so this instead anchors on the SUBTOTAL label
// itself, if the lines contain one anywhere at all: the known Document AI
// failure mode this targets is specifically the label existing but its
// value landing a few lines later rather than immediately next to it (see
// extractLabeledAmountFromLines's comment). If the label isn't present at
// all, there's no safe anchor to search from, and this returns null rather
// than guessing from an unrelated bare number elsewhere in the receipt -
// e.g. a receipt with no SUBTOTAL label and no charges detected would
// otherwise let a repeated print of the *total* falsely "verify" itself as
// if it were a distinct subtotal, since total - 0 charges equals total
// exactly.
function findVerifiedSubtotalCandidate(lines, expectedSubtotal) {
  const subtotalIndex = lines.findIndex((line) => SUBTOTAL_LINE.test(line));
  if (subtotalIndex === -1) return null;

  for (let i = subtotalIndex + 1; i < lines.length; i++) {
    if (TOTAL_LINE.test(lines[i])) break; // past this, any value belongs to TOTAL's section, not SUBTOTAL's
    const priceMatch = lines[i].match(PRICE_AT_END);
    if (priceMatch) {
      const candidate = parseFloat((priceMatch[1] || '') + priceMatch[2]);
      if (Math.abs(candidate - expectedSubtotal) <= ARITHMETIC_TOLERANCE) {
        return candidate;
      }
    }
  }

  return null;
}

function extractSubtotalFromLines(lines) {
  const subtotal = extractLabeledAmountFromLines(lines, SUBTOTAL_LINE);

  // The fallback below checks subtotal against total - charges, so it
  // needs total already pinned down first - deliberately the *base*
  // label-adjacent extraction here, not extractTotalFromLines's own
  // (possibly fallback-derived) result, so the two functions can't end up
  // trying to verify each other in a circle.
  const total = extractLabeledAmountFromLines(lines, TOTAL_LINE);
  if (total == null) return subtotal;

  const chargesTotal = classifyLines(lines).charges.reduce((sum, charge) => sum + charge.price, 0);
  const expectedSubtotal = total - chargesTotal;

  if (subtotal != null && Math.abs(subtotal - expectedSubtotal) <= ARITHMETIC_TOLERANCE) {
    return subtotal;
  }

  // subtotal is missing, or doesn't reconcile with total - charges. Search
  // for a candidate and only use it if the arithmetic actually checks out
  // - never the raw arithmetic result itself (total - chargesTotal) with
  // no independent confirmation, and never the unreliable label-adjacent
  // value just rejected.
  return findVerifiedSubtotalCandidate(lines, expectedSubtotal);
}

function extractTotalFromLines(lines) {
  const total = extractLabeledAmountFromLines(lines, TOTAL_LINE);

  // Symmetric reasoning to extractSubtotalFromLines above: use the base
  // label-adjacent subtotal, not extractSubtotalFromLines's own fallback-
  // derived result.
  const subtotal = extractLabeledAmountFromLines(lines, SUBTOTAL_LINE);
  if (subtotal == null) return total;

  const chargesTotal = classifyLines(lines).charges.reduce((sum, charge) => sum + charge.price, 0);
  const expectedTotal = subtotal + chargesTotal;

  if (total != null && Math.abs(total - expectedTotal) <= ARITHMETIC_TOLERANCE) {
    return total;
  }

  // total is missing, or doesn't reconcile with subtotal + charges (e.g.
  // Document AI reading "TOTAL" as "ΤΩΤΑΙ" - see extractLabeledAmountFromLines's
  // comment above, which already correctly refuses to guess past that).
  // Search for a candidate elsewhere in the lines and only use it if the
  // arithmetic actually checks out; otherwise stay honest and return null
  // rather than either the unreliable label-adjacent value just rejected,
  // or an unverified candidate. Candidates are only ever searched for past
  // the SUBTOTAL line's own position *and* past its adjacent value line, if
  // there is one - skipping the label alone isn't enough, since the value
  // line right after it (e.g. "$41.30") is itself a bare
  // STANDALONE_PRICE_LINE and would otherwise still be picked up as a
  // "total candidate" that trivially matches subtotal + 0 charges. See
  // collectTotalCandidates for the full reasoning.
  const subtotalLabelIndex = lines.findIndex((line) => SUBTOTAL_LINE.test(line));
  let searchAfterIndex = subtotalLabelIndex;
  if (
    subtotalLabelIndex !== -1 &&
    subtotalLabelIndex + 1 < lines.length &&
    STANDALONE_PRICE_LINE.test(lines[subtotalLabelIndex + 1])
  ) {
    searchAfterIndex = subtotalLabelIndex + 1;
  }
  return findVerifiedTotalCandidate(lines, expectedTotal, searchAfterIndex);
}

function extractTipFromLines(lines) {
  return extractLabeledAmountFromLines(lines, TIP_LINE);
}

// The core line classifier - given an already-split, already-trimmed array
// of lines (from document.text's own line breaks, *or* from geometrically
// reconstructed rows - see parseReceiptFromDocument below - the algorithm
// doesn't know or care which), applies the explicit ITEM NAME / ITEM PRICE
// / ITEM NOTE / DISCARD / FOOTER classification described in the file
// header and returns { items, charges }.
function classifyLines(lines) {
  const items = [];
  const charges = [];

  // Receipt boilerplate before the first department header (store name,
  // logo tagline, address, loyalty-program blurb) varies too much to
  // noise-filter by keyword, and unlike everything after it, none of it is
  // ever a real item name - gated off entirely until a department header is
  // seen (see CATEGORY_HEADER_PREFIXES below for what flips this true).
  //
  // Some receipt formats (e.g. a Loblaws/Superstore-style bill with no
  // "GROCERY"/"PRODUCE" section headers at all - confirmed on a real
  // fixture) never print a department header anywhere in the text, so this
  // gate would otherwise never open and the entire receipt - items and
  // charges alike - silently parses to nothing, which is worse than the
  // boilerplate-leakage this gate was built to prevent. Pre-scanning for
  // whether a department header appears *anywhere* in this receipt first
  // means the gate still behaves exactly as before on receipts that do have
  // one, and only opens from the start on receipts that structurally can't
  // ever trigger it.
  const hasAnyDepartmentHeader = lines.some((line) => {
    const trimmed = line.trim();
    return stripCategoryHeaderPrefix(trimmed) === '' || NUMBERED_CATEGORY_HEADER.test(trimmed);
  });
  let seenDepartmentHeader = !hasAnyDepartmentHeader;

  let pendingName = null; // a name seen with no price of its own yet
  let pendingIsCharge = false; // whether that name looked like a charge label (e.g. "ECOLOGY FEE")

  let currentItemIndex = null; // index into items[] most recently closed - a following note attaches here
  let currentIsCharge = false; // true when the most recently closed thing was a charge, not an item (charges never get a unit note)
  let pendingFragment = null; // a bare weight ("0.480 kg") or count ("2") line waiting for its rate/multi-buy value on the next line

  // True when the current item's price came from a rate/multi-buy line
  // (e.g. "$11.00/kg") rather than a plain final value - the real line
  // total is sometimes a separate, later line (e.g. a weighed item's
  // Gross/Tare/Net breakdown followed by "$11.00/kg" *then* "11.49" as the
  // actual total - confirmed on a real fixture, where using the rate itself
  // as the price was off by $0.49). While provisional, the next plain price
  // line overwrites the price instead of being treated as a new/unrelated
  // value; a further rate-signal line just adds another note and keeps
  // waiting.
  let priceIsProvisional = false;

  let subtotalIndex = -1; // set once SUBTOTAL is seen - opens the tax/fee capture window
  let stopped = false; // true once TOTAL is seen - rule: ignore everything after (payment method, TENDER, CHANGE, item count...)

  function attachNote(text) {
    if (currentItemIndex === null || currentIsCharge) return;
    const item = items[currentItemIndex];
    item.unit_note = item.unit_note ? `${item.unit_note} ${text}` : text;
  }

  function openItem(name, price) {
    items.push({ name, price, unit_note: null });
    currentItemIndex = items.length - 1;
    currentIsCharge = false;
    priceIsProvisional = false;
  }

  function openCharge(name, price) {
    charges.push({ name, price });
    currentItemIndex = null;
    currentIsCharge = true;
    priceIsProvisional = false;
  }

  // Resolves a price-only line once both `pendingFragment` and `pendingName`
  // are already known to be empty (checked by the caller): either refines
  // the current item's still-provisional price (see `priceIsProvisional`
  // above), or - if the current item's price is already final - attaches
  // this line as a unit note, but only when it actually looks like a
  // rate/multi-buy marker (`isRateSignal` - some non-price text before the
  // price, or a "/kg" "/lb" "/ea" rate suffix after it). A plain orphaned
  // value with no rate-signal shape and nothing to refine (e.g. a stray
  // garbled OCR fragment) is dropped instead of guessed onto whatever item
  // happens to be open - guessing wrong here previously produced runaway,
  // repeatedly-concatenated notes on real receipts with noisier OCR.
  function resolvePriceOnlyLine(price, rawLine, isRateSignal) {
    if (priceIsProvisional) {
      if (isRateSignal) {
        // Another rate/multi-buy marker for the same still-open item -
        // note it and keep waiting for the real total.
        attachNote(rawLine);
        return;
      }
      // A plain value is the real total - refine the provisional price and
      // stop treating it as still-open. Not also added as a note: it's
      // already captured as the item's price, so repeating it in the note
      // text (after the rate note already attached when the item opened)
      // would just be redundant.
      if (currentItemIndex !== null && !currentIsCharge) {
        items[currentItemIndex].price = price;
      }
      priceIsProvisional = false;
      return;
    }
    if (isRateSignal) attachNote(rawLine);
  }

  for (let i = 0; i < lines.length; i++) {
    if (stopped) break;

    const trimmedRaw = lines[i];

    if (stripCategoryHeaderPrefix(trimmedRaw) === '' || NUMBERED_CATEGORY_HEADER.test(trimmedRaw)) {
      seenDepartmentHeader = true;
      continue;
    }
    if (!seenDepartmentHeader) continue;

    let line = stripCategoryHeaderPrefix(trimmedRaw);
    const strippedOfSavingsPhrase = line.replace(EMBEDDED_SAVINGS_PHRASE, ' ').replace(/\s+/g, ' ').trim();

    // EMBEDDED_SAVINGS_PHRASE is meant to strip a "you saved $X"-style
    // annotation *out of* a longer line that has other real content too
    // (a name+price line with a trailing savings note - the printed price
    // is already net of it, see extractNegativeAdjustment's comment). When
    // the whole line was nothing but that phrase, stripping leaves nothing
    // behind - on the coordinate path, that's a discount row like
    // "INSTANT SAVINGS -1.00" fused onto one line by row reconstruction
    // (the same fusion Fix 1 above handles for SUBTOTAL/TOTAL), which
    // would otherwise silently vanish via the empty-line check below
    // before its value could ever be applied. Extracted from the
    // original, unstripped line - checked here so it runs before
    // EMBEDDED_SAVINGS_PHRASE can erase it and before isNoiseLine could
    // otherwise discard it outright.
    if (!strippedOfSavingsPhrase && line) {
      const negativeAdjustment = extractNegativeAdjustment(line);
      if (negativeAdjustment !== null && currentItemIndex !== null && !currentIsCharge) {
        items[currentItemIndex].price = Math.round((items[currentItemIndex].price + negativeAdjustment) * 100) / 100;
      }
      continue;
    }

    line = strippedOfSavingsPhrase;
    if (!line) continue;

    // Document AI's coordinate path (buildGeometricLines) reconstructs a
    // physical row into a single line with the label and its value fused
    // together (e.g. "SUBTOTAL 65.94"), unlike document.text where the two
    // are always separate lines. SUBTOTAL_LINE/TOTAL_LINE are deliberately
    // ^...$-anchored to the bare label alone (see their definitions above),
    // so neither one ever matched a fused line like that - the footer
    // boundary was silently never detected on the coordinate path, and the
    // entire payment section (TENDER, DEBIT, CHANGE...) parsed as more
    // items. Checked here, before the bare-label checks below, by splitting
    // off a trailing price the same way every other footer line in this
    // loop already does and testing what's left against the same two
    // patterns.
    const footerPriceMatch = line.match(PRICE_AT_END);
    if (footerPriceMatch) {
      const footerLabelPart = line.slice(0, footerPriceMatch.index).trim();
      if (SUBTOTAL_LINE.test(footerLabelPart)) {
        subtotalIndex = i;
        pendingName = null;
        pendingFragment = null;
        continue;
      }
      if (TOTAL_LINE.test(footerLabelPart)) {
        stopped = true;
        continue;
      }
    }

    if (SUBTOTAL_LINE.test(line)) {
      subtotalIndex = i;
      pendingName = null;
      pendingFragment = null;
      continue;
    }

    // Checked unconditionally (not just once a SUBTOTAL was found) so a
    // receipt whose SUBTOTAL line Document AI garbled beyond recognition
    // still stops at TOTAL instead of misreading the payment-method section
    // that follows as more items/notes.
    if (TOTAL_LINE.test(line)) {
      stopped = true;
      continue;
    }

    if (subtotalIndex !== -1) {
      // Between SUBTOTAL and TOTAL: any recognizable charge label (tax,
      // fee, surcharge...) captures its value, same-line or on the very
      // next line - the same adjacency rule extractLabeledAmountFromLines
      // uses, so this never misattributes a value from elsewhere in the
      // footer.
      const priceMatch = line.match(PRICE_AT_END);
      if (priceMatch) {
        const namePart = line.slice(0, priceMatch.index).trim();
        if (CHARGE_LABEL_PATTERN.test(namePart)) {
          charges.push({ name: namePart, price: parseFloat((priceMatch[1] || '') + priceMatch[2]) });
        }
        continue;
      }
      if (CHARGE_LABEL_PATTERN.test(line) && i + 1 < lines.length && STANDALONE_PRICE_LINE.test(lines[i + 1])) {
        charges.push({ name: line, price: parseFloat(lines[i + 1].replace(/[^\d.]/g, '')) });
        i++; // the value line was just consumed - don't re-process it
      }
      continue;
    }

    // Checked, and applied, before isNoiseLine below: a discount/adjustment
    // line's label text (e.g. "INSTANT SAVINGS -$1.00" fused onto one line
    // by the coordinate path) matches NOISE_KEYWORDS' 'saving' and would
    // otherwise be swallowed by isNoiseLine before its negative value could
    // ever be subtracted. See extractNegativeAdjustment's comment above for
    // why only an explicit minus sign qualifies.
    const negativeAdjustment = extractNegativeAdjustment(line);
    if (negativeAdjustment !== null) {
      if (currentItemIndex !== null && !currentIsCharge) {
        items[currentItemIndex].price = Math.round((items[currentItemIndex].price + negativeAdjustment) * 100) / 100;
      }
      continue;
    }

    // --- Discard: loyalty points, savings/discount lines ---
    if (isNoiseLine(line) || PTS_LINE.test(line)) {
      continue;
    }

    // --- Informational, never a name/price/note on their own ---
    if (looksLikeCodeFragment(line) || WEIGHT_DETAIL_LINE.test(line)) {
      continue;
    }

    // --- A weight or count fragment waiting for its rate/multi-buy value ---
    if (BARE_WEIGHT_LINE.test(line) || BARE_COUNT_LINE.test(line)) {
      pendingFragment = line;
      continue;
    }

    const priceMatch = line.match(PRICE_AT_END);

    if (!priceMatch) {
      if (EMBEDDED_PRICE.test(line)) continue; // a promo blurb, not a real name
      // A real new name interrupts anything still pending - a dangling
      // fragment with no follow-up price line was never going to resolve
      // to anything real, so it's dropped rather than misattached later.
      pendingFragment = null;
      const candidateName = stripItemCodeNoise(line);
      if (!hasEnoughLetters(candidateName)) continue; // e.g. a stray single-letter OCR fragment or bare barcode - never a real name
      pendingName = candidateName;
      pendingIsCharge = CHARGE_LABEL_PATTERN.test(line);
      continue;
    }

    const price = parseFloat((priceMatch[1] || '') + priceMatch[2]);
    const namePart = line.slice(0, priceMatch.index).trim();
    const trailingAfterPrice = priceMatch[3] || '';
    // Distinguish "this line is a rate/multi-buy marker" (some non-price
    // text before the price, e.g. "kg @", "1/", or a trailing "/kg"-style
    // rate suffix) from "this is a plain orphaned value with nothing around
    // it at all" (e.g. a bare "11.49").
    const isRateSignal = namePart.length > 0 || RATE_SUFFIX.test(trailingAfterPrice);

    // A weight/count fragment is already waiting for exactly this line -
    // checked before anything else (including a still-open pendingName)
    // since a fragment can in principle appear before an item's own price
    // line has arrived at all, not just after.
    if (pendingFragment) {
      attachNote(`${pendingFragment} @ ${line}`);
      pendingFragment = null;
      continue;
    }

    // A name is already open and waiting - by rule 2, the next price-bearing
    // line is its price, no matter what other text also appears on that
    // line (a garbled code fragment fused onto the price, e.g. "MRJbnpr
    // 5.50", was previously winning over the real pending name here -
    // confirmed on a real fixture). A rate-signal price (e.g. "$11.00/kg")
    // doesn't finalize the item though - it's recorded as a note and the
    // price stays provisional until a plain value refines it (see
    // priceIsProvisional above).
    if (pendingName !== null) {
      if (pendingIsCharge) {
        openCharge(pendingName, price);
      } else {
        openItem(pendingName, price);
        if (isRateSignal) {
          attachNote(line);
          priceIsProvisional = true;
        }
      }
      pendingName = null;
      pendingIsCharge = false;
      continue;
    }

    // Name and price combined on one line (still happens sometimes even on
    // Document AI) - only considered once no name is already pending.
    if (hasEnoughLetters(namePart) && !BARE_EACH_MARKER.test(namePart) && !EMBEDDED_PRICE.test(namePart)) {
      if (CHARGE_LABEL_PATTERN.test(namePart)) {
        openCharge(namePart, price);
        continue;
      }
      const quantityMatch = namePart.match(QUANTITY_LINE);
      if (quantityMatch) {
        const leading = namePart.slice(0, quantityMatch.index).trim();
        const unitNote = namePart.slice(quantityMatch.index).trim() || null;
        if (hasEnoughLetters(leading)) {
          openItem(stripItemCodeNoise(leading), price);
          if (unitNote) attachNote(unitNote);
          continue;
        }
        // e.g. namePart itself is just "kg @" with nothing useful before
        // it - fall through to the price-only handling below.
      } else {
        openItem(stripItemCodeNoise(namePart), price);
        continue;
      }
    }

    resolvePriceOnlyLine(price, line, isRateSignal);
  }

  return { items, charges };
}

function parseReceiptLines(rawText) {
  return classifyLines(splitLines(rawText));
}

function parseReceiptItems(rawText) {
  return parseReceiptLines(rawText).items;
}

function parseReceiptCharges(rawText) {
  return parseReceiptLines(rawText).charges;
}

function extractSubtotal(rawText) {
  return extractSubtotalFromLines(splitLines(rawText));
}

function extractTotal(rawText) {
  return extractTotalFromLines(splitLines(rawText));
}

function extractTip(rawText) {
  return extractTipFromLines(splitLines(rawText));
}

// ============================================================================
// Token-coordinate extraction (ADR 0007) - reconstructs "lines" directly from
// each word token's own pixel position, instead of trusting document.text's
// reading order. classifyLines/extract*FromLines above are reused completely
// unchanged on these geometrically-built lines - the win here is in handing
// that already-hardened logic correctly-grouped input, not in reimplementing
// its noise/charge/note rules a second time from raw token geometry.
// ============================================================================

// A token whose text, once trimmed, matches this is a price-shaped token on
// its own (Document AI's tokenizer usually keeps a price like "$11.98" as
// one token, sometimes with a trailing tax-code letter as a separate token
// right after it, which PRICE_AT_END's trailing-junk allowance in
// classifyLines already handles once rows are reconstructed into text).
// Not used to build rows itself (rows are grouped purely by position, per
// UPGRADE 1) - only as one of the signals buildGeometricLines uses to decide
// whether a page has enough usable price-shaped tokens to be worth
// coordinate-parsing at all.
const PRICE_TOKEN_SHAPE = /^-?\$?\d+\.\d{2}$/;

// Below this many usable tokens (box + non-empty text both present), there
// isn't enough geometry on the page to safely estimate a skew angle or
// cluster rows - a scan that's mostly a failed OCR read, not a receipt that
// just happens to be tilted. Below this threshold, coordinate parsing isn't
// attempted at all and the caller falls back to the text-only path.
const MIN_TOKENS_FOR_COORDINATE_PARSE = 20;

// How many degrees of estimated skew still count as "basically level" - a
// fresh phone photo is rarely pixel-perfect square, and "correcting" a
// fraction of a degree would just add floating-point noise to every box for
// no benefit. Real tilt worth correcting is usually a full degree or more.
const MIN_CORRECTABLE_SKEW_DEGREES = 1;

// The largest fine-tilt skew this file will attempt to correct (see UPGRADE
// 1's "robust up to ~15 degrees" requirement). Beyond this, the skew
// estimate itself (a median of per-token top-edge angles) becomes less
// trustworthy - a badly tilted photo also tends to have noisier token
// detection - so coordinate parsing is abandoned for the page in favor of
// the text-based fallback instead of applying a correction that's as likely
// to make row-grouping worse as better.
const MAX_CORRECTABLE_SKEW_DEGREES = 15;

// A row-clustering tolerance narrower than "about half a token's height"
// starts splitting one visual row into two (normal baseline jitter within a
// single printed line); wider than "a full token's height" starts merging
// two adjacent rows into one. This sits in between, and is applied as a
// multiple of the page's own median token height rather than a fixed pixel
// count (see UPGRADE 1 step 4's "no hardcoded pixel thresholds" - the
// multiplier is the only tuned constant, the actual tolerance always scales
// with this specific photo's resolution and font size).
//
// 0.6 was chosen over a wider value after testing the tradeoff on a real
// fixture (grocerybill1.jpeg), not just picked as a round number. A page's
// median token height is dominated by whichever text is most common on it
// (usually small fine print, not the larger item-row text), so a
// multi-word item name's own tokens - whose exact vertical centers jitter
// slightly by font metrics - can occasionally split across two rows
// mid-name at 0.6 (confirmed: stranded "-MUSHROOMS" in a different row
// than "CREMINI \"BABY BELL 1.99", pairing that real item's name with a
// neighboring row's price instead of its own). Widening the tolerance to
// fix that (0.75) was tried and reverted: it *also* started pulling a
// stray price token in from the next physical row, corrupting the same
// item a different way, and broke row separation in this receipt's footer
// badly enough to lose an otherwise well-verified tax-charge capture on
// the same fixture. Between an occasional wrong item name (recoverable -
// this endpoint's whole output is preview-only, reviewed and editable by
// the user before a bill is created) and losing a charge capture that has
// no other way to succeed, 0.6 is the better tradeoff even though it
// doesn't fully solve the name-splitting case - see ADR 0007's known gaps.
const ROW_CLUSTER_TOLERANCE_FACTOR = 0.6;

// Coarse rotation Document AI detects (90-degree steps only - orientation
// can't express fine tilt, which is what the skew estimate above is for).
// Derived from the documented Orientation semantics (Google Cloud Document
// AI Page.Layout.Orientation: PAGE_RIGHT = "orientation is aligned with
// page right; turn the head 90 degrees clockwise from upright to read",
// PAGE_DOWN = 180 degrees, PAGE_LEFT = 90 degrees counterclockwise). If
// reading the content upright requires turning your head clockwise by that
// many degrees, the content itself is rotated the same amount clockwise
// relative to the page, so correcting it means rotating the coordinates by
// the *negative* of that amount. Implemented from the documented enum
// semantics (see Google's Document AI reference), not verified against a
// real rotated fixture - none of this file's test receipts are actually
// rotated 90 degrees, only the fine-tilt path below has been exercised
// against real (near-level) photos.
const ORIENTATION_CORRECTION_DEGREES = {
  PAGE_UP: 0,
  PAGE_RIGHT: -90,
  PAGE_DOWN: 180,
  PAGE_LEFT: 90,
};

function rotatePoint(x, y, degrees, cx, cy) {
  const radians = (degrees * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

function rotateBox(box, degrees, cx, cy) {
  return box.map((point) => rotatePoint(point.x, point.y, degrees, cx, cy));
}

function medianOf(numbers) {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function boxHeight(box) {
  const ys = box.map((point) => point.y);
  return Math.max(...ys) - Math.min(...ys);
}

function boxVerticalCenter(box) {
  const ys = box.map((point) => point.y);
  return (Math.max(...ys) + Math.min(...ys)) / 2;
}

function boxHorizontalCenter(box) {
  const xs = box.map((point) => point.x);
  return (Math.max(...xs) + Math.min(...xs)) / 2;
}

// Estimates the page's fine tilt (beyond any 90-degree orientation already
// corrected) as the *median* angle of each token's top edge (top-left
// corner to top-right corner) - median rather than mean so a handful of
// still-noisy/misdetected token boxes (a real receipt photo always has a
// few) can't drag the estimate off, the same "robust to a noisy minority"
// reasoning CODE_FRAGMENT_SHAPE's vowel-count check uses elsewhere in this
// file. Boxes are expected in pixel-proportional space (see
// buildGeometricLines - normalizedVertices are scaled by the page's actual
// width/height first), not raw 0..1 normalized coordinates: on a
// non-square page (every receipt photo), x and y are normalized by
// different factors, so computing an angle directly from normalizedVertices
// would distort it by the page's aspect ratio.
function estimateSkewDegrees(boxes) {
  const angles = boxes
    .map((box) => {
      const [topLeft, topRight] = box;
      const width = topRight.x - topLeft.x;
      if (Math.abs(width) < 1e-6) return null; // a degenerate box - not a useful angle sample
      return Math.atan2(topRight.y - topLeft.y, width) * (180 / Math.PI);
    })
    .filter((angle) => angle !== null);

  return medianOf(angles);
}

// Groups tokens into physical rows by vertical-center proximity rather than
// requiring an exact shared y - a tilted or slightly wavy printed line still
// has all its tokens within roughly one token-height of each other
// vertically, even though no two are at *exactly* the same y (see UPGRADE 1
// step 3b/3c). Compares each token to the running average of the row it's
// joining, not just the immediately preceding token, so a long row can't
// drift outside the tolerance one token at a time. Rows come out sorted
// top-to-bottom (tokens were sorted by centerY first); within each row,
// tokens are sorted left-to-right by centerX to restore reading order.
function clusterIntoRows(tokens, tolerance) {
  const sorted = [...tokens].sort((a, b) => a.centerY - b.centerY);
  const rows = [];
  let currentRow = [];
  let centerSum = 0;

  for (const token of sorted) {
    if (currentRow.length === 0) {
      currentRow = [token];
      centerSum = token.centerY;
      continue;
    }
    const rowAverage = centerSum / currentRow.length;
    if (Math.abs(token.centerY - rowAverage) <= tolerance) {
      currentRow.push(token);
      centerSum += token.centerY;
    } else {
      rows.push(currentRow);
      currentRow = [token];
      centerSum = token.centerY;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  return rows.map((row) => [...row].sort((a, b) => a.centerX - b.centerX));
}

function rowToLine(row) {
  return row
    .map((token) => token.text)
    .filter((text) => text.length > 0)
    .join(' ');
}

// Resolves one token's text by slicing document.text with its
// textAnchor.textSegments - a token does not carry its own text (see the
// file header for parseReceiptFromDocument, and ADR 0007). startIndex is
// omitted by Document AI's JSON serialization when it's 0 (standard
// proto3 behavior for a default-valued field), so a missing startIndex
// means "starts at the beginning of the document," not "no segment."
function getTokenText(documentText, token) {
  const segments = token.layout && token.layout.textAnchor && token.layout.textAnchor.textSegments;
  if (!segments || segments.length === 0) return '';
  return segments
    .map((segment) => {
      const start = segment.startIndex ? Number(segment.startIndex) : 0;
      const end = Number(segment.endIndex);
      return documentText.slice(start, end);
    })
    .join('')
    .trim();
}

// A token's 4-corner box in pixel-proportional space (normalizedVertices
// scaled by the page's actual width/height) - see estimateSkewDegrees for
// why this matters on a non-square page. Returns null when the box data
// isn't usable (missing vertices, or fewer than 4 - Document AI's Document
// OCR processor always emits 4 for a token, but this is defensive against
// a malformed or partial response rather than assumed).
function getTokenBox(token, pageWidth, pageHeight) {
  const vertices = token.layout && token.layout.boundingPoly && token.layout.boundingPoly.normalizedVertices;
  if (!vertices || vertices.length < 4) return null;
  return vertices.map((vertex) => ({ x: (vertex.x || 0) * pageWidth, y: (vertex.y || 0) * pageHeight }));
}

// Builds geometrically-reconstructed text lines from a Document AI
// `document` object's token coordinates - the input classifyLines/
// extract*FromLines are run against in place of document.text's own line
// breaks. Returns null when there isn't enough usable coordinate data to
// trust (too few tokens, missing page dimensions, or tilt beyond
// MAX_CORRECTABLE_SKEW_DEGREES) - callers fall back to the plain-text path
// entirely in that case, rather than clustering noise into meaningless rows.
function buildGeometricLines(document) {
  if (!document || typeof document.text !== 'string' || !Array.isArray(document.pages) || document.pages.length === 0) {
    return null;
  }

  const allLines = [];

  for (const page of document.pages) {
    const pageWidth = (page.dimension && page.dimension.width) || 0;
    const pageHeight = (page.dimension && page.dimension.height) || 0;
    if (pageWidth <= 0 || pageHeight <= 0) return null; // can't build a proportion-correct angle/box without real dimensions

    const rawTokens = Array.isArray(page.tokens) ? page.tokens : [];
    let tokens = rawTokens
      .map((token) => {
        const box = getTokenBox(token, pageWidth, pageHeight);
        const text = getTokenText(document.text, token);
        return box && text ? { text, box } : null;
      })
      .filter((token) => token !== null);

    if (tokens.length < MIN_TOKENS_FOR_COORDINATE_PARSE) return null;

    // A page with plenty of tokens but not one that's price-shaped is a
    // sign OCR quality is too poor to trust here (or this genuinely isn't a
    // priced receipt) - geometric row-grouping has nothing meaningful to
    // anchor on either way, so it isn't attempted.
    const hasPriceShapedToken = tokens.some((token) => PRICE_TOKEN_SHAPE.test(token.text));
    if (!hasPriceShapedToken) return null;

    // Step 1: correct the coarse 90-degree orientation, if any, before
    // estimating fine tilt - a page read sideways would otherwise report a
    // ~90-degree "skew" that's actually the orientation, not real tilt.
    const orientation = (page.layout && page.layout.orientation) || 'PAGE_UP';
    const orientationDegrees = ORIENTATION_CORRECTION_DEGREES[orientation] || 0;
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    if (orientationDegrees !== 0) {
      tokens = tokens.map((token) => ({ ...token, box: rotateBox(token.box, orientationDegrees, centerX, centerY) }));
    }

    // Step 2: estimate and correct fine tilt from the (now orientation-
    // corrected) token boxes themselves.
    const skewDegrees = estimateSkewDegrees(tokens.map((token) => token.box));
    const absSkew = Math.abs(skewDegrees);
    if (absSkew > MAX_CORRECTABLE_SKEW_DEGREES) {
      return null; // tilt too severe to trust the estimate - see the constant's comment
    }
    if (absSkew >= MIN_CORRECTABLE_SKEW_DEGREES) {
      tokens = tokens.map((token) => ({ ...token, box: rotateBox(token.box, -skewDegrees, centerX, centerY) }));
    }

    const positioned = tokens.map((token) => ({
      text: token.text,
      centerX: boxHorizontalCenter(token.box),
      centerY: boxVerticalCenter(token.box),
      height: boxHeight(token.box),
    }));

    const medianHeight = medianOf(positioned.map((token) => token.height));
    if (medianHeight <= 0) return null; // degenerate boxes throughout - nothing safe to cluster with

    const rows = clusterIntoRows(positioned, medianHeight * ROW_CLUSTER_TOLERANCE_FACTOR);
    for (const row of rows) {
      const line = rowToLine(row);
      if (line) allLines.push(line);
    }
  }

  return allLines.length > 0 ? allLines : null;
}

// How far a parse result's own numbers are from internally consistent - the
// two checks UPGRADE 2 asks for: item prices should sum to the subtotal,
// and the subtotal plus charges should sum to the total. Returns a summed
// dollar error (0 = exactly reconciles); a check only contributes when both
// its anchor values are actually present (there's nothing to contradict
// otherwise). Returns Infinity when nothing was checkable at all - a
// receipt where neither subtotal nor total was ever found isn't "verified
// fine," it just has nothing to verify against.
//
// Deliberately a magnitude, not a pass/fail: a receipt with real per-item
// promotional discounts that get intentionally discarded as noise (see
// classifyLines' DISCARD rules) will *never* pass the item-sum-vs-subtotal
// check exactly, on either the coordinate or text-based path, since both
// share the same discard logic - confirmed on a real fixture
// (loblawsbill.webp, ARCP discount lines), where treating "doesn't
// reconcile" as a flat rejection made the cascade below fall through to
// whichever result came last in the fallback order, even when it was
// dramatically worse (a badly mis-clustered coordinate result, off by over
// $100) than the other, merely-imperfect one (off by $8.50 from discounts
// that were never going to net out). Comparing magnitudes lets the cascade
// prefer the better of two imperfect results instead.
function reconciliationError(result) {
  const itemSum = result.items.reduce((sum, item) => sum + item.price, 0);
  const chargeSum = result.charges.reduce((sum, charge) => sum + charge.price, 0);

  let checkedAnything = false;
  let error = 0;

  if (result.subtotal != null) {
    checkedAnything = true;
    error += Math.abs(itemSum - result.subtotal);
  }

  if (result.subtotal != null && result.total != null) {
    checkedAnything = true;
    error += Math.abs(result.subtotal + chargeSum - result.total);
  }

  return checkedAnything ? error : Infinity;
}

function buildFullResult(lines) {
  const { items, charges } = classifyLines(lines);
  return {
    items,
    charges,
    subtotal: extractSubtotalFromLines(lines),
    total: extractTotalFromLines(lines),
    tip: extractTipFromLines(lines),
  };
}

// Primary entry point for the documentai OCR provider once coordinate data
// is available - see ADR 0007. Builds geometrically-reconstructed lines
// from the Document AI response's token coordinates (buildGeometricLines
// above) and classifies them with the exact same logic as the text-only
// path (classifyLines/extract*FromLines), then arithmetically validates the
// result (UPGRADE 2) before trusting it:
//
// - If coordinate data isn't usable at all (too few tokens, missing page
//   dimensions, tilt beyond what can be trusted), falls back to the plain
//   document.text path entirely.
// - If the coordinate-based result reconciles exactly (item prices sum to
//   subtotal; subtotal + charges sum to total, within ARITHMETIC_TOLERANCE),
//   it's returned as-is.
// - Otherwise, the plain-text path is returned instead, flagged with
//   `needsReview: true` unless *it* happens to reconcile exactly.
//
// Deliberately not "whichever of the two is closer to reconciling": that
// was tried and reverted after two real fixtures showed it backfiring -
// comparing two *unverified* dollar-amount errors against each other is
// itself a guess, not a verification, and it isn't a reliable one. On
// loblawsbill.webp, a badly mis-clustered coordinate result (off by over
// $100, real items merged/duplicated) still scored a smaller error than the
// text result's presence of legitimately unrecoverable per-item promo
// discounts (~$8.50, unrelated to parsing quality - see classifyLines'
// DISCARD rules). On foodbasicsbill.jpeg, the coordinate path dropped half
// the real items (6 of 12) but still "won" on error alone, because the
// text-based path had no subtotal to check against at all (nothing checked
// looks infinitely worse than something checked-and-wrong, which isn't a
// fair comparison). The coordinate path is only ever used when it's
// independently verified - never as a preferred-but-unverified fallback.
function parseReceiptFromDocument(document) {
  const rawText = (document && document.text) || '';
  const textLines = splitLines(rawText);
  const textResult = buildFullResult(textLines);
  const textReconciles = reconciliationError(textResult) <= ARITHMETIC_TOLERANCE;

  const geometricLines = buildGeometricLines(document);
  if (!geometricLines) {
    return { ...textResult, usedCoordinates: false, needsReview: !textReconciles };
  }

  const coordResult = buildFullResult(geometricLines);
  if (reconciliationError(coordResult) <= ARITHMETIC_TOLERANCE) {
    return { ...coordResult, usedCoordinates: true, needsReview: false };
  }

  return { ...textResult, usedCoordinates: false, needsReview: !textReconciles };
}

module.exports = {
  parseReceiptLines,
  parseReceiptItems,
  parseReceiptCharges,
  extractSubtotal,
  extractTotal,
  extractTip,
  parseReceiptFromDocument,
};
