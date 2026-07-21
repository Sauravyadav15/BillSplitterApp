// backend/routes/authRoutes.js
// which URL triggers which controller, with which middleware
const express = require('express');
const router = express.Router();
const { signup } = require('../controllers/authController');
const {login}= require('../controllers/authController');


// POST /auth/signup
router.post('/signup', signup);
// POST /auth/login (NEW)
router.post('/login', login);

module.exports = router;