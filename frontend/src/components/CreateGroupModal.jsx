// frontend/src/components/CreateGroupModal.jsx

import { useState } from 'react';
import GroupIconPicker from './GroupIconPicker';
import ErrorBanner from './ErrorBanner';

const DEFAULT_ICON = '🛒';
const DEFAULT_THEME = 'teal';

export default function CreateGroupModal({ onCreate, onClose }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onCreate({ name, icon, color_theme: theme });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm p-6 [animation:fade-in-up_0.3s_ease_both]">
        <div className="mb-4 flex items-center justify-between">
          <h2>New group</h2>
          <button type="button" onClick={onClose} className="btn btn-ghost !p-1.5 text-muted" aria-label="Close">
            ✕
          </button>
        </div>

        <ErrorBanner message={error} />

        <label className="mb-4 block">
          <span className="field-label">Group name</span>
          <input
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={3}
            required
            autoFocus
          />
        </label>

        <GroupIconPicker icon={icon} onIconChange={setIcon} theme={theme} onThemeChange={setTheme} />

        <button type="submit" className="btn btn-primary mt-5 w-full" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create group'}
        </button>
      </form>
    </div>
  );
}
