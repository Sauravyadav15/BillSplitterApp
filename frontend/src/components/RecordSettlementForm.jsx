// frontend/src/components/RecordSettlementForm.jsx

import { useEffect, useState } from 'react';
import ErrorBanner from './ErrorBanner';

export default function RecordSettlementForm({ members, currentUserId, prefill, onSubmit }) {
  const otherMembers = members.filter((m) => m.id !== currentUserId);

  const [paidTo, setPaidTo] = useState(otherMembers[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (prefill) {
      setPaidTo(prefill.to_user_id);
      setAmount(prefill.amount);
    }
  }, [prefill]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ paid_to: paidTo, amount: Number(amount) });
      setAmount('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record settlement');
    } finally {
      setSubmitting(false);
    }
  };

  if (otherMembers.length === 0) {
    return <p>Add another member to record a settlement.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2.5">
        <select className="input" value={paidTo} onChange={(e) => setPaidTo(e.target.value)}>
          {otherMembers.map((m) => (
            <option key={m.id} value={m.id}>
              Pay {m.name}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Recording...' : 'Record Settlement'}
        </button>
      </div>
      <ErrorBanner message={error} />
    </form>
  );
}
