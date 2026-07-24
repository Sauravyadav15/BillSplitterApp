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
      className="card card-hover flex flex-col overflow-hidden text-left"
    >
      <img
        className="h-32 w-full object-cover"
        src={resolveImageUrl(bill.image_url)}
        alt="Receipt"
      />
      <div className="flex items-center justify-between p-4">
        <span className="font-heading text-lg font-semibold text-ink">${bill.total_amount}</span>
        <span className="text-xs text-muted">
          {new Date(bill.created_at).toLocaleDateString()}
        </span>
      </div>
    </button>
  );
}
