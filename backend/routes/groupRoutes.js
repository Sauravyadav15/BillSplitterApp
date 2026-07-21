// backend/routes/groupRoutes.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createGroup, getMyGroups, getGroupById, addMember } = require('../controllers/groupController');

// All group routes require authentication
router.post('/', authMiddleware, createGroup);
router.get('/', authMiddleware, getMyGroups); 
router.get('/:id', authMiddleware, getGroupById); 
router.post('/:id/members', authMiddleware, addMember);

module.exports = router;