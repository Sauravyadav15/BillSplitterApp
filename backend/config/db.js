// backend/config/db.js

const { Pool, types } = require('pg');
require('dotenv').config();

// pg's default DATE (oid 1082) parser returns a JS Date at UTC midnight,
// which then shifts to the wrong calendar day once anything renders it in a
// non-UTC local timezone (e.g. bills.purchase_date). Keeping it as the raw
// 'YYYY-MM-DD' string sidesteps that entirely - any timezone interpretation
// happens explicitly, once, at display time instead of implicitly here.
types.setTypeParser(1082, (val) => val);

// Jest sets NODE_ENV=test automatically (whether or not it's set anywhere
// else), so the test suite always lands on its own database instead of
// whatever DATABASE_URL points the dev server at - tests TRUNCATE every
// table between runs, which previously wiped real accounts/groups/bills any
// time `npm test` ran against the same database the dev server was using.
const connectionString =
  process.env.NODE_ENV === 'test' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;

// Hosted Postgres (Neon, Supabase, etc.) requires SSL; a local dev/test
// instance on localhost neither needs nor (in most default setups) accepts
// it, so this switches on the connection string itself rather than adding a
// separate env var to keep in sync.
const pool = new Pool({
  connectionString,
  ssl: connectionString && !/localhost|127\.0\.0\.1/.test(connectionString) ? { rejectUnauthorized: false } : false,
});

// Test the connection on startup
pool.connect()
  .then((client) => {
    console.log('✅ PostgreSQL connected');
    client.release();
  })
  .catch((err) => console.error('❌ PostgreSQL connection error:', err.message));

module.exports = pool;