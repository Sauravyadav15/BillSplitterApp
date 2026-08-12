# 0004. Additional charges (tax, fees, tip): equal split via bill_extra_charges/bill_charges, tip exclusion when personally covered

Status: Accepted
Date: 2026-08-11

## Context

`bills.total_amount` originally meant one thing: the sum of item prices, which was also exactly what `item_contributors.share_amount` summed back to for that bill — a clean invariant that keeps `balanceController`'s balance math correct (whoever added the bill is credited `total_amount`; every contributor is debited their item shares; those always net to zero across the bill).

Real receipts print a `SUBTOTAL` (items only) and a `TOTAL` (subtotal + tax, sometimes + a fee, sometimes + tip) that differ from each other, and the app had no way to record that difference or flag when a photographed/scanned total didn't match what the app computed. Worse, `receiptParser.js` had no concept of "this line is a bill-level charge, not a product" — a `"TAX 8.18"` or `"B.C.H.Fee 7.56"` line (a real bottle/can handling fee on a licensed-venue receipt) got parsed as a regular item, inflating the item subtotal and permanently breaking the items-vs-receipt-subtotal sanity check.

Three questions had to be answered before touching the split math, since they change who owes what:

1. Should these charges be split proportionally to what each contributor already ordered, or equally across everyone on the bill?
2. Should a tip always be split like everything else, or can it be excluded entirely (e.g. someone hands over cash separately, not through the group's shared total)?
3. Once charges aren't fixed to two categories (tax, tip), should the personal-payer exclusion from (2) extend to any charge, or stay specific to tip?

The user's answers: everything splits equally across the bill's contributors, no proportional option. A tip is only ever brought up if the OCR scan actually finds one, and then the user chooses either an equal split or "one person covered it" (fully excluded from the shared total) — and that personal-payer exception stays tip-only; every other charge (tax, fees, surcharges) always splits equally with no exception.

## Decision

- `receiptParser.js` gained `CHARGE_LABEL_PATTERN` (word-boundaried `tax|hst|gst|pst|vat|surcharge|svc chg|service charge|fee`) and a combined `parseReceiptLines(rawText)` pass that classifies each priced line as either an item or a charge, instead of a single items-only pass. Word-boundaried specifically so `fee` matches `"B.C.H.Fee"` but not `"COFFEE"`/`"TOFFEE"` (no word boundary lands inside a doubled-letter run in the middle of those words). Tip/gratuity is deliberately excluded from this pattern — it's still detected via the separate `TIP_LINE` anchor (`extractTip`) and dropped from both `items`/`charges` via `NOISE_KEYWORDS`, since it's the one charge type with the personal-payer option below.
- Added `bill_extra_charges` (`bill_id`, `name`, `amount`) — one row per named charge (`"Tax"`, `"B.C.H.Fee"`, ...), auto-populated from `parseReceiptLines`'s `charges` output or added by hand on `AddBillPage`. This is what keeps the per-charge breakdown for display; it is *not* the per-contributor split.
- Kept `bills.tip_amount` (default `0`) and `bills.tip_paid_by` (nullable `users` FK) as dedicated columns rather than folding tip into `bill_extra_charges` — tip is the only charge type that can be personally covered, so it needs the extra `tip_paid_by` field regardless.
- `bills.total_amount` is `sum(bill_items.price) + sum(bill_extra_charges.amount) + (tip_amount, only if tip_paid_by is null)`. A personally-covered tip is excluded from `total_amount` entirely — nobody owes it back, so it shouldn't inflate what the bill's adder is credited.
- Kept `bill_charges` (`bill_id`, `user_id`, `amount`) as the per-contributor split table, now fed by pooling `sum(bill_extra_charges.amount) + shared tip` into one amount and splitting *that* equally across every distinct contributor on the bill's items, reusing `splitCalculator.splitItemPrice` (the same integer-cents, deterministic-remainder helper items already use). Kept separate from `item_contributors` since none of this is tied to any one item.
- `receiptParser.js` also has `extractTotal`/`extractTip` (mirroring the existing `extractSubtotal`), so `AddBillPage` can flag a subtotal+charges+tip mismatch against the receipt's own printed total, and only ever prompt for a tip split when a tip line was actually found on the receipt.
- `balanceController.js`'s balance queries have a `bill_charges` branch (debited to each charged user), alongside the existing `item_contributors` branch — the credit side needed no change since it's still just `total_amount`.

## Consequences

- The books-balance invariant still holds: `total_amount` (credit) always equals `sum(item_contributors.share_amount) + sum(bill_charges.amount)` (debits) for a given bill, by construction — `bill_charges` is only ever inserted when the pooled charges+shared-tip amount is nonzero, using the same split helper as items.
- Equal (not proportional) splitting is simpler to reason about and matches what the user asked for, but means someone who ordered a $3 side pays the same charge/tip share as someone who ordered a $30 entrée on the same bill.
- A personally-covered tip is tracked (`tip_amount` + `tip_paid_by_name`) for display, but deliberately isn't a settlement — the app doesn't record that the tip-payer is owed anything for it. If that turns out to matter, it would need an explicit settlement or its own ledger entry, not a silent assumption.
- Two "total" concepts now coexist by design: the receipt-comparison total shown on `AddBillPage` (`subtotal + charges + tip`, always, matching what's physically printed) versus `bills.total_amount` (excludes a personally-covered tip). Conflating them would either wrongly flag a match as a mismatch or wrongly fold an excluded tip into shared balances.
- `CHARGE_LABEL_PATTERN` is a heuristic, same as the rest of `receiptParser.js` - a fee named something outside its keyword list won't be auto-detected (the user can still add it by hand), and in principle a product name could coincide with a keyword in a way the word-boundary check doesn't fully guard against on some future receipt. Treated as an acceptable, correctable-by-the-user tradeoff, consistent with how the rest of the OCR pipeline is documented ("suggestions for a human to review/edit, not ground truth").
