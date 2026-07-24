// frontend/src/pages/BillDetailPage.jsx

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBill } from '../api/bills';
import { resolveImageUrl } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function BillDetailPage() {
  const { groupId, billId } = useParams();

  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    (async () => {
      setState({ data: null, loading: true, error: null });
      try {
        const data = await getBill(groupId, billId);
        setState({ data, loading: false, error: null });
      } catch (err) {
        setState({ data: null, loading: false, error: err.response?.data?.error || 'Failed to load bill' });
      }
    })();
  }, [groupId, billId]);

  if (state.loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <Link to={`/groups/${groupId}`} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold">
        &larr; Back to group
      </Link>
      <ErrorBanner message={state.error} />

      {state.data && (
        <>
          <h1 className="mb-6">Bill Detail</h1>

          <div className="flex flex-col gap-6">
            <div className="card mx-auto w-full max-w-xl p-6">
              <img
                className="block w-full rounded-xl border border-border shadow-[var(--shadow-md)]"
                src={resolveImageUrl(state.data.bill.image_url)}
                alt="Receipt"
              />
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <p className="text-text">
                  {new Date(state.data.bill.created_at).toLocaleDateString()}
                </p>
                <p className="font-heading text-2xl font-semibold text-ink">
                  ${state.data.bill.total_amount}
                </p>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="mb-4">Items</h2>
              <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-border text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-border bg-surface-2 px-3.5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                      Item
                    </th>
                    <th className="border-b border-border bg-surface-2 px-3.5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                      Price
                    </th>
                    <th className="border-b border-border bg-surface-2 px-3.5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                      Contributors
                    </th>
                  </tr>
                </thead>
                <tbody className="[&>tr:last-child>td]:border-b-0">
                  {state.data.items.map((item) => (
                    <tr key={item.id} className="hover:bg-accent-soft">
                      <td className="border-b border-border px-3.5 py-2.5 text-ink">{item.name}</td>
                      <td className="border-b border-border px-3.5 py-2.5 text-ink">${item.price}</td>
                      <td className="border-b border-border px-3.5 py-2.5 text-ink">
                        {item.contributors
                          .map((c) => `${c.name} ($${c.share_amount})`)
                          .join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
