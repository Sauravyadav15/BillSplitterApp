// frontend/src/components/BalancesPanel.jsx

import UserAvatar from './UserAvatar';

export default function BalancesPanel({ balances, suggestedSettlements, members, currentUserId, onSelectSuggestion }) {
  const membersById = new Map((members || []).map((m) => [m.id, m]));

  return (
    <div>
      <ul className="flex flex-col gap-2">
        {balances.map((b) => {
          const value = Number(b.net_balance);
          const cls = value > 0 ? 'badge badge-positive' : value < 0 ? 'badge badge-negative' : 'badge';
          return (
            <li key={b.user_id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3.5 py-2.5 text-sm">
              <UserAvatar user={membersById.get(b.user_id)} className="h-8 w-8 text-xs" />
              <span className="min-w-0 flex-1 truncate text-ink">{b.name}</span>
              <span className="shrink-0">
                <span className={cls}>${b.net_balance}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {suggestedSettlements.length > 0 && (
        <div className="mt-5">
          <h3>Suggested Settlements</h3>
          <div className="flex flex-col gap-2">
            {suggestedSettlements.map((s, idx) => {
              const canRecord = s.from_user_id === currentUserId;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3.5 py-2.5 text-sm transition-colors hover:border-accent-soft-border"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <UserAvatar user={membersById.get(s.from_user_id)} className="h-6 w-6 shrink-0 text-[9px]" />
                    <span className="shrink-0 text-muted">&rarr;</span>
                    <UserAvatar user={membersById.get(s.to_user_id)} className="h-6 w-6 shrink-0 text-[9px]" />
                    <span className="truncate text-ink">
                      {s.from_name} <span className="text-muted">&rarr;</span> {s.to_name}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <strong className="text-accent">${s.amount}</strong>
                    {canRecord && (
                      <button
                        type="button"
                        className="btn btn-secondary !px-3 !py-1 text-xs"
                        onClick={() => onSelectSuggestion(s)}
                      >
                        Record
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
