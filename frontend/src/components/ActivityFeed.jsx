// frontend/src/components/ActivityFeed.jsx
// A merged, reverse-chronological timeline of bills added + settlements
// recorded in this group. GroupPage already fetches both lists for its own
// Bills/Settlement History cards - this re-presents the same data as a
// story ("who did what, when") instead of only current-state snapshots
// (balances, a bill gallery), which is what makes a group read as an
// active, ongoing shared tab rather than just a spreadsheet. No new
// backend endpoint - everything here is already-fetched data, merged and
// sorted client-side.

import { Link } from 'react-router-dom';
import UserAvatar from './UserAvatar';

function timeAgo(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const MAX_EVENTS = 8;

export default function ActivityFeed({ groupId, bills, settlements, membersById, currentUserId }) {
  const events = [
    ...bills.map((b) => ({
      type: 'bill',
      id: `bill-${b.id}`,
      created_at: b.created_at,
      actorId: b.added_by,
      actorName: b.added_by_name,
      amount: b.total_amount,
      billId: b.id,
    })),
    ...settlements.map((s) => ({
      type: 'settlement',
      id: `settlement-${s.id}`,
      created_at: s.created_at,
      actorId: s.paid_by,
      actorName: membersById.get(s.paid_by)?.name || 'Someone',
      toId: s.paid_to,
      toName: membersById.get(s.paid_to)?.name || 'someone',
      amount: s.amount,
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (events.length === 0) {
    return <p className="text-sm text-muted">No activity yet - add a bill to get started.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {events.slice(0, MAX_EVENTS).map((e) => {
        const isActorMe = e.actorId === currentUserId;
        const actorLabel = isActorMe ? 'You' : e.actorName;
        const row = (
          <>
            <UserAvatar user={membersById.get(e.actorId) || { name: e.actorName }} className="h-7 w-7 shrink-0 text-[10px]" />
            <span className="min-w-0 flex-1 truncate text-sm text-text">
              <span className="font-medium text-ink">{actorLabel}</span>{' '}
              {e.type === 'bill' ? (
                'added a bill'
              ) : (
                <>
                  paid <span className="font-medium text-ink">{e.toId === currentUserId ? 'you' : e.toName}</span>
                </>
              )}
            </span>
            <span className="shrink-0 font-heading text-sm font-semibold text-ink">${Number(e.amount).toFixed(2)}</span>
            <span className="hidden shrink-0 text-xs text-muted sm:inline">{timeAgo(e.created_at)}</span>
          </>
        );

        return (
          <li key={e.id}>
            {e.type === 'bill' ? (
              <Link
                to={`/groups/${groupId}/bills/${e.billId}`}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
              >
                {row}
              </Link>
            ) : (
              <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
