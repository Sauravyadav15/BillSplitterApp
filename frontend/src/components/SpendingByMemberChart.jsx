// frontend/src/components/SpendingByMemberChart.jsx
// Horizontal bar chart: each member's total amount fronted (sum of the
// bills they added) in this group - a spending-activity view that
// complements Balances' net-owed view (a related but distinct question -
// this is "who's been putting money in," not "who owes/is owed"). Built
// from bills GroupPage already fetches, no new backend endpoint.
//
// Colored via contributorGradient - the same per-user identity color
// ContributorSplitBar already uses elsewhere in the app - rather than a
// separate chart-specific palette, so the same person reads as the same
// color everywhere. Each bar is directly labeled (name + $ amount, both
// always visible), so no legend is needed - see dataviz skill's
// color-formula/marks-and-anatomy references for why direct labels are
// preferred over a legend box when there's room for them.

import { contributorGradient } from '../utils/contributorColors';
import UserAvatar from './UserAvatar';

export default function SpendingByMemberChart({ bills, members }) {
  const totalsByMember = new Map();
  for (const member of members) {
    totalsByMember.set(member.id, { ...member, total: 0 });
  }
  for (const bill of bills) {
    const entry = totalsByMember.get(bill.added_by);
    if (entry) entry.total += Number(bill.total_amount || 0);
  }
  const rows = Array.from(totalsByMember.values())
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  if (rows.length === 0) {
    return <p className="text-sm text-muted">No spending yet - add a bill to see the breakdown.</p>;
  }

  const maxTotal = Math.max(...rows.map((r) => r.total));

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3" title={`${r.name}: $${r.total.toFixed(2)}`}>
          <UserAvatar user={r} className="h-7 w-7 shrink-0 text-[10px]" />
          <span className="w-20 shrink-0 truncate text-sm text-ink sm:w-28">{r.name}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
            {/* Floored at 4% so a small-but-nonzero total still renders a
                visible sliver instead of vanishing next to the largest bar. */}
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((r.total / maxTotal) * 100, 4)}%`,
                backgroundImage: contributorGradient(r.id),
              }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-sm font-semibold text-ink">${r.total.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}
