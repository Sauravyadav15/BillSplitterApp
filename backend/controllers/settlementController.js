// backend/controllers/settlementController.js

const pool = require('../config/db');

// POST /groups/:groupId/settlements - record a direct repayment between members
const createSettlement = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const paidBy = req.user.userId;
    const { paid_to: paidTo, amount } = req.body;

    // 1. Can't settle with yourself
    if (paidTo === paidBy) {
      return res.status(400).json({ error: 'You cannot record a settlement with yourself' });
    }

    // 2. paid_to must be a member of this group
    const memberCheck = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, paidTo]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(400).json({ error: 'paid_to is not a member of this group' });
    }

    // 3. Insert the settlement
    const result = await pool.query(
      'INSERT INTO settlements (group_id, paid_by, paid_to, amount) VALUES ($1, $2, $3, $4) RETURNING *',
      [groupId, paidBy, paidTo, Number(amount).toFixed(2)]
    );

    res.status(201).json({
      message: 'Settlement recorded successfully',
      settlement: result.rows[0],
    });

  } catch (err) {
    console.error('Create settlement error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /groups/:groupId/settlements - list settlements for a group
const getSettlementsForGroup = async (req, res) => {
  try {
    const groupId = req.params.groupId;

    const result = await pool.query(
      `SELECT id, group_id, paid_by, paid_to, amount, created_at
       FROM settlements
       WHERE group_id = $1
       ORDER BY created_at DESC`,
      [groupId]
    );

    res.status(200).json({
      settlements: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error('Get settlements error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { createSettlement, getSettlementsForGroup };
