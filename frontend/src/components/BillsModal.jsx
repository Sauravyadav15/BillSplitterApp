// frontend/src/components/BillsModal.jsx
// Popup listing every bill in a group - two per row on desktop, one per row
// on mobile. Opened from MergedBillsTile when a group has multiple bills.

import { createPortal } from 'react-dom';
import BillCard from './BillCard';

export default function BillsModal({ bills, onClose }) {
  // Portalled to document.body: BillList mounts inside a `.reveal` card whose
  // entrance animation ends on a held `transform` (fill-mode "both"), which
  // makes that card the containing block for any `position: fixed`
  // descendant. Without the portal this modal would be pinned to that card's
  // box instead of the viewport, clipping/overlapping on short screens.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6 [animation:fade-in-up_0.3s_ease_both]">
        <div className="mb-4 flex items-center justify-between">
          <h2>All bills</h2>
          <button type="button" onClick={onClose} className="btn btn-ghost !p-1.5 text-muted" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {bills.map((bill) => (
            <BillCard key={bill.id} bill={bill} />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
