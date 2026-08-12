# 0002. Greedy max-debtor/max-creditor matching for debt simplification

Status: Accepted
Date: 2026-07-21

## Context

Raw per-bill debts within a group (who owes whom for which item) can produce many small pairwise debts — e.g. A owes B $5, B owes C $5, A owes C $5 — when in reality only one or two payments are needed to settle everyone up. `balanceController.getGroupBalances` needed a way to turn a group's net balances into a minimal-ish set of suggested settle-up payments (`suggested_settlements`).

Computing the *provably minimal* number of transactions is NP-hard in general (it's a variant of a set-partition/min-transaction problem). Exact solutions don't scale and aren't necessary at friend-group sizes.

## Decision

Implement a greedy heuristic in `backend/utils/debtSimplifier.js` (the "Splitwise-style" approach): sort creditors and debtors by amount, repeatedly match the largest creditor against the largest debtor, settle the smaller of the two amounts, and advance whichever side hits zero. This runs in a single pass and is trivial to unit test in isolation (no DB/HTTP dependencies — pure math on `{ user_id, balanceCents }` pairs).

## Consequences

- Not provably minimal in every case, but produces a small, sensible transaction set for the group sizes this app targets (a handful to a few dozen members).
- Easy to reason about and test; a future move to an exact minimal-transaction solver would be a drop-in replacement behind the same `simplifyDebts(balances)` signature if it's ever needed.
- Amounts are worked in integer cents throughout (see also `splitCalculator.js`, which splits an item price the same way) to avoid floating-point drift when repeatedly subtracting shares.
