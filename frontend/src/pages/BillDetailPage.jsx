// frontend/src/pages/BillDetailPage.jsx

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBill } from '../api/bills';
import { resolveImageUrl } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import StatTile from '../components/StatTile';
import ContributorSplitBar from '../components/ContributorSplitBar';

const ReceiptIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm2 5h8M8 11h8M8 14h5" />
  </svg>
);
const ListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7 9v-1a4 4 0 0 0-3-3.87M15 4.13a3.5 3.5 0 0 1 0 6.75" />
  </svg>
);

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

  const uniqueContributorCount = new Set(
    (state.data?.items || []).flatMap((item) => item.contributors.map((c) => c.user_id))
  ).size;

  const itemsSubtotal = (state.data?.items || []).reduce((sum, item) => sum + Number(item.price), 0);
  const bill = state.data?.bill;
  const extraCharges = state.data?.extra_charges || [];
  const extraChargesTotal = extraCharges.reduce((sum, c) => sum + Number(c.amount), 0);
  const tipAmount = Number(bill?.tip_amount || 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <Link to={`/groups/${groupId}`} className="btn btn-secondary mb-4 !px-4 !py-2 text-sm">
        &larr; Back to group
      </Link>
      <ErrorBanner message={state.error} />

      {state.data && (
        <>
          <div className="reveal mb-6 flex flex-wrap items-end justify-between gap-2">
            <h1>Bill Detail</h1>
            <p className="text-sm text-muted">
              {new Date(`${state.data.bill.purchase_date}T00:00:00`).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Bento stats row - total/items/people at a glance before the detail below. */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile icon={<ReceiptIcon />} label="Total" value={state.data.bill.total_amount} delay={0} />
            <StatTile
              icon={<ListIcon />}
              label="Items"
              value={state.data.items.length}
              prefix=""
              decimals={0}
              delay={70}
            />
            <StatTile
              icon={<UsersIcon />}
              label="Split between"
              value={uniqueContributorCount}
              prefix=""
              decimals={0}
              delay={140}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
            {/* Receipt image - stays put on desktop while the item list scrolls beside it. */}
            <div className="reveal lg:sticky lg:top-24 lg:col-span-2" style={{ animationDelay: '180ms' }}>
              <div className="card p-6">
                {(state.data.images?.length > 0 ? state.data.images : [{ id: 'fallback', image_url: state.data.bill.image_url }]).map(
                  (image, index, all) => (
                    <div key={image.id} className={index > 0 ? 'mt-3' : undefined}>
                      <img
                        className="block w-full rounded-xl border border-border shadow-[var(--shadow-md)]"
                        src={resolveImageUrl(image.image_url)}
                        alt={all.length > 1 ? `Receipt part ${index + 1}` : 'Receipt'}
                      />
                      {all.length > 1 && (
                        <p className="mt-1 text-center text-xs font-semibold text-muted">Part {index + 1}</p>
                      )}
                    </div>
                  )
                )}
                <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-text">Subtotal</span>
                    <span className="text-ink">${itemsSubtotal.toFixed(2)}</span>
                  </div>

                  {(extraCharges.length > 0 || tipAmount > 0) && (
                    <div className="my-1 flex flex-col gap-1 rounded-lg bg-surface-2 p-2.5">
                      {extraCharges.map((c) => (
                        <div key={c.id} className="flex items-center justify-between">
                          <span className="text-text">{c.name}</span>
                          <span className="text-ink">${Number(c.amount).toFixed(2)}</span>
                        </div>
                      ))}
                      {tipAmount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-text">
                            Tip
                            {bill.tip_paid_by_name && (
                              <span className="ml-1 text-xs text-muted">(covered by {bill.tip_paid_by_name})</span>
                            )}
                          </span>
                          <span className="text-ink">${tipAmount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">Total</p>
                    <p className="text-gradient font-heading text-2xl font-semibold">
                      ${(itemsSubtotal + extraChargesTotal + tipAmount).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="reveal lg:col-span-3" style={{ animationDelay: '220ms' }}>
              <div className="card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2>Items</h2>
                  <span className="text-xs font-semibold text-muted">
                    {state.data.items.length} item{state.data.items.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Card layout below sm: a Item/Price/Contributors table gets too
                    narrow to hold the contributor list readably on a phone. */}
                <div className="flex flex-col gap-3 sm:hidden">
                  {state.data.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="reveal card flex flex-col gap-2.5 p-3.5"
                      style={{ animationDelay: `${240 + Math.min(index, 10) * 40}ms` }}
                    >
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
                      <ContributorSplitBar contributors={item.contributors} />
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

                <div className="hidden sm:flex sm:flex-col sm:gap-2">
                  {state.data.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="reveal flex flex-col gap-2 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-accent-soft"
                      style={{ animationDelay: `${240 + Math.min(index, 10) * 40}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-ink">
                          <span className="mr-1.5 text-muted">{index + 1}.</span>
                          <span className="font-medium">{item.name}</span>
                          {item.unit_note && <span className="ml-2 text-xs text-muted">{item.unit_note}</span>}
                        </p>
                        <p className="shrink-0 font-heading text-base font-semibold text-ink">${item.price}</p>
                      </div>
                      <ContributorSplitBar contributors={item.contributors} />
                      <div className="flex flex-wrap gap-1.5">
                        {item.contributors.map((c) => (
                          <span key={c.user_id} className="chip cursor-default !py-1 text-xs">
                            {c.name} <span className="text-muted">${c.share_amount}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {state.data.charges?.length > 0 && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                      Additional charges{tipAmount > 0 && !bill.tip_paid_by_name ? ' & tip' : ''} - split equally
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {state.data.charges.map((c) => (
                        <span key={c.user_id} className="chip cursor-default !py-1 text-xs">
                          {c.name} <span className="text-muted">${c.amount}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
