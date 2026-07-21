// backend/utils/splitCalculator.js
// Pure math: no DB/HTTP concerns, so it's easy to test in isolation.

// Splits an item's price evenly among its contributors, in integer cents,
// so the returned shares always sum to exactly the item price.
function splitItemPrice(price, contributorIds) {
  const priceCents = Math.round(Number(price) * 100);
  const n = contributorIds.length;

  const base = Math.floor(priceCents / n);
  const remainder = priceCents - base * n; // 0 <= remainder < n

  // Sort lexicographically so who gets the extra cent is deterministic,
  // regardless of the order the client submitted contributor_ids in.
  const sortedIds = [...contributorIds].sort();

  return sortedIds.map((userId, idx) => {
    const shareCents = base + (idx < remainder ? 1 : 0);
    return {
      user_id: userId,
      share_amount: (shareCents / 100).toFixed(2),
    };
  });
}

module.exports = { splitItemPrice };
