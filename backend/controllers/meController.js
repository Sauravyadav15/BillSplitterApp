// backend/controllers/meController.js
// Profile actions for the logged-in user themselves (as opposed to
// balanceController's group-scoped summary, also mounted under /me).

const pool = require('../config/db');
const { isValidAvatar } = require('../utils/avatar');

const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, avatar, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!isValidAvatar(avatar)) {
      return res.status(400).json({ error: 'Invalid avatar' });
    }

    const result = await pool.query(
      'UPDATE users SET avatar = $1 WHERE id = $2 RETURNING id, name, email, avatar, created_at',
      [avatar, req.user.userId]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Update avatar error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getMe, updateAvatar };
