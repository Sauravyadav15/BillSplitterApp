// frontend/src/components/PurchaseDateModal.jsx
// Blocks the rest of AddBillPage until the user confirms when the purchase
// actually happened - defaults to today, but the receipt is often scanned
// days after the trip, so the date shouldn't be silently assumed from
// created_at.

import { useState } from 'react';

function todayLocalISODate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export default function PurchaseDateModal({ onConfirm }) {
  const [date, setDate] = useState(todayLocalISODate);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date) return;
    onConfirm(date);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm p-6 [animation:fade-in-up_0.3s_ease_both]">
        <h2 className="mb-1">When was this purchased?</h2>
        <p className="mb-4 text-sm text-text">
          The receipt might be from a different day than today - let us know when the purchase actually happened.
        </p>
        <label className="block">
          <span className="field-label">Date of purchase</span>
          <input
            className="input"
            type="date"
            value={date}
            max={todayLocalISODate()}
            onChange={(e) => setDate(e.target.value)}
            required
            autoFocus
          />
        </label>
        <button type="submit" className="btn btn-primary mt-5 w-full" disabled={!date}>
          Continue
        </button>
      </form>
    </div>
  );
}
