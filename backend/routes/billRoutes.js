// backend/routes/billRoutes.js

const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const requireGroupMembership = require('../middleware/requireGroupMembership');
const handleValidationErrors = require('../middleware/handleValidationErrors');
const { uploadReceiptImage } = require('../middleware/upload');
const { createBill, getBillsForGroup, getBillById, parseReceipt } = require('../controllers/billController');

// POST /groups/:groupId/bills
router.post(
  '/:groupId/bills',
  authMiddleware,
  requireGroupMembership,
  uploadReceiptImage,
  [
    param('groupId').isUUID().withMessage('groupId must be a valid UUID'),
    body('items').exists().notEmpty().withMessage('items is required'),
  ],
  handleValidationErrors,
  createBill
);

// POST /groups/:groupId/bills/parse-receipt - OCR preview, does not create a bill
router.post(
  '/:groupId/bills/parse-receipt',
  authMiddleware,
  requireGroupMembership,
  uploadReceiptImage,
  [param('groupId').isUUID().withMessage('groupId must be a valid UUID')],
  handleValidationErrors,
  parseReceipt
);

// GET /groups/:groupId/bills
router.get(
  '/:groupId/bills',
  authMiddleware,
  requireGroupMembership,
  [param('groupId').isUUID().withMessage('groupId must be a valid UUID')],
  handleValidationErrors,
  getBillsForGroup
);

// GET /groups/:groupId/bills/:billId
router.get(
  '/:groupId/bills/:billId',
  authMiddleware,
  requireGroupMembership,
  [
    param('groupId').isUUID().withMessage('groupId must be a valid UUID'),
    param('billId').isUUID().withMessage('billId must be a valid UUID'),
  ],
  handleValidationErrors,
  getBillById
);

module.exports = router;
