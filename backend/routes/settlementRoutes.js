// backend/routes/settlementRoutes.js

const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const requireGroupMembership = require('../middleware/requireGroupMembership');
const handleValidationErrors = require('../middleware/handleValidationErrors');
const { createSettlement, getSettlementsForGroup } = require('../controllers/settlementController');

// POST /groups/:groupId/settlements
router.post(
  '/:groupId/settlements',
  authMiddleware,
  requireGroupMembership,
  [
    param('groupId').isUUID().withMessage('groupId must be a valid UUID'),
    body('paid_to').isUUID().withMessage('paid_to must be a valid UUID'),
    body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
    body('paid_to').custom((value, { req }) => {
      if (value === req.user.userId) {
        throw new Error('You cannot record a settlement with yourself');
      }
      return true;
    }),
  ],
  handleValidationErrors,
  createSettlement
);

// GET /groups/:groupId/settlements
router.get(
  '/:groupId/settlements',
  authMiddleware,
  requireGroupMembership,
  [param('groupId').isUUID().withMessage('groupId must be a valid UUID')],
  handleValidationErrors,
  getSettlementsForGroup
);

module.exports = router;
