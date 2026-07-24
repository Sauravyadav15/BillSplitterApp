// backend/utils/ocrLineBuilder.js
// Reconstructs reading-order lines from OCR text boxes using their pixel
// bounding coordinates instead of trusting the OCR engine's own output order.
// This is what actually fixes item/price mismatches on receipts: a price box
// on the right edge of a line and the item-name box on the left edge of the
// same line aren't guaranteed to come back adjacent in scan order, but they
// do share a vertical (y) position - grouping by y-center puts them back on
// one line together, the same way a human eye reads the row.

// Boxes are grouped by walking them in y-center order and starting a new
// line whenever the gap to the previous box's y-center exceeds a fraction of
// the LOCAL text height (the smaller of the two boxes being compared) - not
// a single global-median threshold. A receipt mixes large header/logo text
// with small body and footer text, so one page-wide threshold is either too
// loose for the dense body rows (merging them) or too tight for the sparse
// header (splitting it); a per-step local threshold adapts to whatever
// region of the receipt is currently being scanned.
//
// This must be a per-step gap check, not "grow a line's [y0,y1] span and
// test containment against it" - the latter lets a merged span keep
// expanding, so on a long receipt it can snowball into swallowing unrelated
// rows underneath it (a tall header box bridging into the row below, which
// now bridges into the row below that, etc.) and fusing half the receipt
// into one unusable line.
const LINE_GAP_FACTOR = 0.5;

function buildLinesFromBoxes(boxes) {
  if (boxes.length === 0) return '';

  const withCenters = boxes.map((box) => ({
    box,
    centerY: (box.y0 + box.y1) / 2,
    height: box.y1 - box.y0,
  }));

  withCenters.sort((a, b) => a.centerY - b.centerY);

  const lines = [];
  let currentLine = null;
  let prev = null;

  for (const entry of withCenters) {
    const gapThreshold = prev ? Math.min(entry.height, prev.height) * LINE_GAP_FACTOR : 0;
    if (currentLine && prev && entry.centerY - prev.centerY <= gapThreshold) {
      currentLine.push(entry.box);
    } else {
      currentLine = [entry.box];
      lines.push(currentLine);
    }
    prev = entry;
  }

  return lines
    .map((line) =>
      [...line]
        .sort((a, b) => a.x0 - b.x0)
        .map((b) => b.text)
        .join(' ')
    )
    .join('\n');
}

module.exports = { buildLinesFromBoxes };
