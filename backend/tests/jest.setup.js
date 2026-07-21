// backend/tests/jest.setup.js
// Runs before any test file's own code. Loading .env.test here first means
// config/db.js's later `require('dotenv').config()` (which loads plain .env)
// won't override these values - dotenv keeps the first value it sees per key.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });
