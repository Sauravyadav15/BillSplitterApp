// frontend/src/components/ToastContainer.jsx
// Renders the active toast queue (see ToastContext) - one instance mounted
// once in App.jsx, portalled to document.body for the same reason
// ImageLightbox/BillsModal are: escapes any `.reveal`-animated ancestor that
// would otherwise become the containing block for `position: fixed`.

import { createPortal } from 'react-dom';
import { useToast } from '../context/ToastContext';

const TONE_ICON_CLASSES = {
  success: 'bg-accent text-accent-contrast',
  celebration: 'bg-gold text-gold-contrast',
};

const DEFAULT_ICON = { success: '✓', celebration: '🎉' };

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismissToast(toast.id)}
          className="card flex w-full max-w-sm items-center gap-3 px-4 py-3 text-left shadow-[var(--shadow-lg)] [animation:pop-in_0.25s_ease_both]"
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${TONE_ICON_CLASSES[toast.tone] || TONE_ICON_CLASSES.success}`}
          >
            {toast.icon || DEFAULT_ICON[toast.tone] || DEFAULT_ICON.success}
          </span>
          <p className="text-sm font-medium text-ink">{toast.message}</p>
        </button>
      ))}
    </div>,
    document.body
  );
}
