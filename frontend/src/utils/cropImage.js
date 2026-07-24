// frontend/src/utils/cropImage.js
// Extracts the cropped region of an <img> element as a File, using
// react-image-crop's own cropToCanvas helper (handles displayed-vs-natural
// size scaling correctly, rather than us reimplementing that math).

import { cropToCanvas } from 'react-image-crop';

export async function getCroppedImageFile(image, pixelCrop, fileName = 'cropped-receipt.jpg') {
  const canvas = document.createElement('canvas');
  await cropToCanvas(image, canvas, pixelCrop);

  // High-quality JPEG rather than lossless PNG: PNG re-encodes a real photo
  // (lots of gradients/noise, unlike flat graphics) into a much larger file
  // than the original JPEG - large enough to blow past the upload size
  // limit. 0.98 quality keeps compression artifacts negligible while
  // staying a reasonable size.
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not crop image'));
          return;
        }
        resolve(new File([blob], fileName, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.98
    );
  });
}
