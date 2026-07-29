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
      <Link to={`/groups/${groupId}`} className="btn btn-secondary mb-4 !px-4 !py-2 text-sm">
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
                <p className="text-gradient font-heading text-2xl font-semibold">
                  ${state.data.bill.total_amount}
                </p>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="mb-4">Items</h2>

              {/* Card layout below sm: a Item/Price/Contributors table gets too
                  narrow to hold the contributor list readably on a phone. */}
              <div className="flex flex-col gap-3 sm:hidden">
                {state.data.items.map((item, index) => (
                  <div key={item.id} className="card flex flex-col gap-2.5 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-ink">
                        <span className="mr-1.5 text-muted">{index + 1}.</span>
                        {item.name}
                      </p>
                      <p className="shrink-0 font-heading text-base font-semibold text-ink">
                        ${item.price}
                      </p>
                    </div>
                    {item.unit_note && <p className="-mt-1.5 pl-4 text-xs text-muted">{item.unit_note}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {item.contributors.map((c) => (
                        <span key={c.user_id} className="chip cursor-default">
                          {c.name} <span className="text-muted">${c.share_amount}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <table className="hidden w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-border text-sm sm:table">
                <thead>
                  <tr>
                    <th className="w-10 border-b border-border bg-surface-2 px-3.5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                      #
                    </th>
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
                  {state.data.items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-accent-soft">
                      <td className="border-b border-border px-3.5 py-2.5 text-muted">{index + 1}</td>
                      <td className="border-b border-border px-3.5 py-2.5 text-ink">
                        {item.name}
                        {item.unit_note && <div className="text-xs text-muted">{item.unit_note}</div>}
                      </td>
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
