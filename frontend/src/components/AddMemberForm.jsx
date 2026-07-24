// frontend/src/components/AddMemberForm.jsx

import { useState } from 'react';
import ErrorBanner from './ErrorBanner';

export default function AddMemberForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(email);
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-2">
        <input
          className="input"
          type="email"
          placeholder="Member email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-secondary whitespace-nowrap" disabled={submitting}>
          {submitting ? 'Adding...' : '+ Add'}
        </button>
      </div>
      <ErrorBanner message={error} />
    </form>
  );
}
