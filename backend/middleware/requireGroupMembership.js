// backend/middleware/requireGroupMembership.js

const pool = require('../config/db');

const requireGroupMembership = async (req, res, next) => {
  try {
    const groupId = req.params.groupId;
    const userId = req.user.userId;

    const memberCheck = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    next();
  } catch (err) {
    console.error('Group membership check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = requireGroupMembership;
