// frontend/src/components/BillCard.jsx

import { useNavigate, useParams } from 'react-router-dom';
import { resolveImageUrl } from '../api/client';

export default function BillCard({ bill }) {
  const navigate = useNavigate();
  const { groupId } = useParams();

  return (
    <button
      type="button"
      onClick={() => navigate(`/groups/${groupId}/bills/${bill.id}`)}
      className="card card-hover group relative flex flex-col overflow-hidden text-left"
    >
      <div className="relative h-32 w-full overflow-hidden bg-surface-2">
        <img
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          src={resolveImageUrl(bill.image_url)}
          alt="Receipt"
        />
        <span className="absolute right-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-semibold text-muted shadow-sm backdrop-blur-sm">
          {new Date(`${bill.purchase_date}T00:00:00`).toLocaleDateString()}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-heading text-lg font-semibold text-ink">${bill.total_amount}</span>
          <span className="flex items-center gap-1.5 truncate text-xs text-muted">
            <span>{bill.item_count ?? 0} item{(bill.item_count ?? 0) === 1 ? '' : 's'}</span>
            {bill.contributor_count > 0 && (
              <>
                <span aria-hidden>&middot;</span>
                <span>{bill.contributor_count} {bill.contributor_count === 1 ? 'person' : 'people'}</span>
              </>
            )}
          </span>
        </div>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-accent-contrast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
          </svg>
        </span>
      </div>
    </button>
  );
}
