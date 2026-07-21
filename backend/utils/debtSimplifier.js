// backend/utils/debtSimplifier.js
// Pure math: no DB/HTTP concerns, so it's easy to test in isolation.
// Greedy max-debtor/max-creditor matching (the standard "Splitwise-style"
// simplification). Not provably minimal in every case, but a good pragmatic
// heuristic for small friend-group sizes.

// balances: [{ user_id, balanceCents }] where positive = owed money (creditor),
// negative = owes money (debtor). Callers should exclude near-zero balances first.
function simplifyDebts(balances) {
  const creditors = balances
    .filter((b) => b.balanceCents > 0)
    .map((b) => ({ user_id: b.user_id, amountCents: b.balanceCents }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const debtors = balances
    .filter((b) => b.balanceCents < 0)
    .map((b) => ({ user_id: b.user_id, amountCents: -b.balanceCents }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const transactions = [];
  let i = 0; // debtor pointer
  let j = 0; // creditor pointer

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settled = Math.min(debtor.amountCents, creditor.amountCents);

    if (settled > 0) {
      transactions.push({
        from_user_id: debtor.user_id,
        to_user_id: creditor.user_id,
        amount: (settled / 100).toFixed(2),
      });
    }

    debtor.amountCents -= settled;
    creditor.amountCents -= settled;

    if (debtor.amountCents === 0) i++;
    if (creditor.amountCents === 0) j++;
  }

  return transactions;
}

module.exports = { simplifyDebts };
