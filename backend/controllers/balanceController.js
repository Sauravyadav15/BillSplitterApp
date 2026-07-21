// backend/controllers/balanceController.js

const pool = require('../config/db');
const { simplifyDebts } = require('../utils/debtSimplifier');

// GET /groups/:groupId/balances - net balance per member + suggested settle-up payments
const getGroupBalances = async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // 1. Current members (so people with zero activity still show a $0 balance)
    const membersResult = await pool.query(
      `SELECT u.id AS user_id, u.name, u.email
       FROM users u
       JOIN group_members gm ON gm.user_id = u.id
       WHERE gm.group_id = $1`,
      [groupId]
    );

    // 2. Net balance per user across bills paid, items consumed, and settlements.
    //    Whoever added a bill (added_by) fronted total_amount; every contributor on
    //    that bill's items owes their share back to that person. Settlements are
    //    direct repayments that net against those computed debts.
    const balancesResult = await pool.query(
      `SELECT t.user_id, u.name, u.email, SUM(t.delta) AS net_balance
       FROM (
         SELECT added_by AS user_id, total_amount AS delta
         FROM bills WHERE group_id = $1

         UNION ALL

         SELECT ic.user_id, -ic.share_amount AS delta
         FROM item_contributors ic
         JOIN bill_items bi ON ic.item_id = bi.id
         JOIN bills b ON bi.bill_id = b.id
         WHERE b.group_id = $1

         UNION ALL

         SELECT paid_by AS user_id, amount AS delta
         FROM settlements WHERE group_id = $1

         UNION ALL

         SELECT paid_to AS user_id, -amount AS delta
         FROM settlements WHERE group_id = $1
       ) t
       JOIN users u ON u.id = t.user_id
       GROUP BY t.user_id, u.name, u.email`,
      [groupId]
    );

    // 3. Merge: start from current members (zero balance), then overlay computed
    //    balances - this also surfaces former members who still hold a balance.
    const balanceMap = new Map();
    for (const member of membersResult.rows) {
      balanceMap.set(member.user_id, {
        user_id: member.user_id,
        name: member.name,
        email: member.email,
        net_balance: '0.00',
      });
    }
    for (const row of balancesResult.rows) {
      balanceMap.set(row.user_id, {
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        net_balance: Number(row.net_balance).toFixed(2),
      });
    }

    const balances = Array.from(balanceMap.values());

    // 4. Feed non-trivial balances (>= 1 cent) into the debt simplifier
    const balancesForSimplify = balances
      .map((b) => ({ user_id: b.user_id, balanceCents: Math.round(Number(b.net_balance) * 100) }))
      .filter((b) => Math.abs(b.balanceCents) >= 1);

    const rawTransactions = simplifyDebts(balancesForSimplify);

    const nameById = new Map(balances.map((b) => [b.user_id, b.name]));
    const suggestedSettlements = rawTransactions.map((tx) => ({
      from_user_id: tx.from_user_id,
      from_name: nameById.get(tx.from_user_id),
      to_user_id: tx.to_user_id,
      to_name: nameById.get(tx.to_user_id),
      amount: tx.amount,
    }));

    res.status(200).json({
      balances,
      suggested_settlements: suggestedSettlements,
    });

  } catch (err) {
    console.error('Get balances error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getGroupBalances };
