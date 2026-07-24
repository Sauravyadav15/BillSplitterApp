// backend/index.js

const app = require('./app');
const { warmUp } = require('./utils/receiptOcr');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Loads the OCR models into the persistent worker now, so the first receipt
// scan a user makes doesn't pay that ~20s cost - see utils/receiptOcr.js.
warmUp().catch((err) => console.error('PaddleOCR warmup failed:', err.message));
