// frontend/src/components/ImageLightbox.jsx
// Full-screen preview for a receipt photo - click a thumbnail to open, click
// the backdrop (or press Escape) to close. Used on AddBillPage (where a
// subtotal/total mismatch banner asks the user to check the scan against the
// photo) and BillDetailPage.

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Portalled to document.body for the same reason as BillsModal: opened
  // from inside `.reveal`-animated ancestors, which become the containing
  // block for `position: fixed` descendants and would otherwise clip/mispin
  // this overlay instead of covering the full viewport.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 [animation:fade-in_0.2s_ease]"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white transition-colors hover:bg-white/20"
        aria-label="Close preview"
      >
        ✕
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-[var(--shadow-md)] [animation:fade-in-up_0.25s_ease_both]"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
