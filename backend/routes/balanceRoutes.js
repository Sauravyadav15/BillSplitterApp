// backend/routes/balanceRoutes.js

const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const requireGroupMembership = require('../middleware/requireGroupMembership');
const handleValidationErrors = require('../middleware/handleValidationErrors');
const { getGroupBalances } = require('../controllers/balanceController');

// GET /groups/:groupId/balances
router.get(
  '/:groupId/balances',
  authMiddleware,
  requireGroupMembership,
  [param('groupId').isUUID().withMessage('groupId must be a valid UUID')],
  handleValidationErrors,
  getGroupBalances
);

module.exports = router;
