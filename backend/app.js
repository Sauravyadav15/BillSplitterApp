// backend/app.js
// Express app definition only - no app.listen() here, so tests can
// import this module directly (via supertest) without a real server/port.

const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/db');   //database connection request
const { multer } = require('./middleware/upload');

// Import routes
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const billRoutes = require('./routes/billRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const balanceRoutes = require('./routes/balanceRoutes');
const meRoutes = require('./routes/meRoutes');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();// express app created

// CORS_ORIGIN is a comma-separated allow-list (e.g. the deployed frontend +
// custom domain) - unset in local dev, where the wide-open default is fine.
// Auth is a bearer token in the Authorization header, not a cookie, so this
// is about limiting which sites can read API responses, not CSRF.
const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors(corsOrigins?.length ? { origin: corsOrigins } : undefined));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Routes
app.use('/auth', authRoutes);   // ← all routes in authRoutes start with /auth
app.use('/groups', groupRoutes);
app.use('/groups', billRoutes);
app.use('/groups', settlementRoutes);
app.use('/groups', balanceRoutes);
app.use('/me', meRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'BillSplit API is running' });
});



app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      message: 'Database connected!',
      time: result.rows[0].now
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/protected', authMiddleware, (req, res) => {
  res.json({
    message: 'You accessed a protected route!',
    user: req.user,
  });
});

// Catches multer errors (oversized/non-image uploads) and any other route errors
// passed via next(err), so clients always get the same { error: "..." } shape.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'Upload error' });
  }
  next();
});

module.exports = app;
