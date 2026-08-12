// frontend/src/components/MergedBillsTile.jsx
// Shown in the bills gallery instead of individual bill cards once a group
// has more than one bill - opens BillsModal with the full list on click.

import { resolveImageUrl } from '../api/client';

const StackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 9 4.5-9 4.5-9-4.5L12 3Zm-9 9 9 4.5 9-4.5M3 16.5 12 21l9-4.5" />
  </svg>
);

export default function MergedBillsTile({ bills, onOpen }) {
  const latest = bills[0];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="card card-hover group relative flex flex-col overflow-hidden text-left"
    >
      <div className="relative h-32 w-full overflow-hidden bg-surface-2">
        <img
          className="h-full w-full object-cover opacity-60 transition-transform duration-300 ease-out group-hover:scale-105"
          src={resolveImageUrl(latest.image_url)}
          alt="Receipts"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-ink/50">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm">
            <StackIcon />
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 p-4">
        <span className="truncate font-heading text-lg font-semibold text-ink">{bills.length} bills</span>
        <span className="text-xs font-semibold text-accent">View all</span>
      </div>
    </button>
  );
}
