// backend/routes/meRoutes.js
// Routes about the logged-in user themselves, spanning all their groups -
// distinct from groupRoutes.js, which is always scoped to one :groupId.

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getMyBalanceSummary } = require('../controllers/balanceController');
const { getMe, updateAvatar } = require('../controllers/meController');

// GET /me
router.get('/', authMiddleware, getMe);

// PATCH /me/avatar
router.patch('/avatar', authMiddleware, updateAvatar);

// GET /me/balance-summary
router.get('/balance-summary', authMiddleware, getMyBalanceSummary);

module.exports = router;
