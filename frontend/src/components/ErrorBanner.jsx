// frontend/src/components/ErrorBanner.jsx

export default function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="my-2.5 flex items-center gap-2 rounded-lg border border-negative-soft-border bg-negative-soft px-3.5 py-2.5 text-sm font-medium text-negative [animation:fade-in_0.25s_ease]">
      <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-negative text-[11px] font-bold text-surface">
        !
      </span>
      {message}
    </div>
  );
}
