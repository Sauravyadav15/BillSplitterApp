// backend/routes/billRoutes.js

const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const requireGroupMembership = require('../middleware/requireGroupMembership');
const handleValidationErrors = require('../middleware/handleValidationErrors');
const { uploadReceiptImage, uploadReceiptImages } = require('../middleware/upload');
const { createBill, getBillsForGroup, getBillById, parseReceipt } = require('../controllers/billController');

// POST /groups/:groupId/bills
router.post(
  '/:groupId/bills',
  authMiddleware,
  requireGroupMembership,
  uploadReceiptImages,
  [
    param('groupId').isUUID().withMessage('groupId must be a valid UUID'),
    body('items').exists().notEmpty().withMessage('items is required'),
    body('purchase_date')
      .exists()
      .withMessage('purchase_date is required')
      .bail()
      .isISO8601()
      .withMessage('purchase_date must be a valid date (YYYY-MM-DD)'),
    body('extra_charges').optional({ values: 'falsy' }).isString().withMessage('extra_charges must be a JSON string'),
    body('tip_amount').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('tip_amount must be a non-negative number'),
    body('tip_paid_by').optional({ values: 'falsy' }).isUUID().withMessage('tip_paid_by must be a valid user id'),
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
