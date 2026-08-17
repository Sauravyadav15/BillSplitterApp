// frontend/src/context/ToastContext.jsx
// Lightweight, app-wide toast queue for confirming write actions (bill
// created, settlement recorded, member added, ...) that otherwise navigate
// away immediately with no feedback that anything happened. Lives above the
// router in App.jsx so a toast triggered right before a navigate() call
// survives the route change instead of unmounting with the page that
// queued it.

import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let nextId = 0;

// How long a toast stays up before auto-dismissing - long enough to read a
// short confirmation message, short enough not to pile up if several
// actions fire in quick succession.
const DEFAULT_DURATION_MS = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // tone: 'success' (default, teal) | 'celebration' (gold, for a bigger
  // moment like clearing a balance to zero).
  const showToast = useCallback(
    (message, { tone = 'success', icon, duration = DEFAULT_DURATION_MS } = {}) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, tone, icon }]);
      setTimeout(() => dismissToast(id), duration);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>{children}</ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
