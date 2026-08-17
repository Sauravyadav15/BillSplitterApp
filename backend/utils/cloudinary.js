// backend/utils/cloudinary.js
// Cloudinary config, used only for uploads meant to persist with a bill (see
// billController.js's createBill). Not used by parseReceipt's OCR-preview
// upload, which is scratch-only - read once for OCR, then deleted within the
// same request - and never needs to survive past that request, so it stays
// on local disk.

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
