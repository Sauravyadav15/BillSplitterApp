// frontend/src/components/BalancesPanel.jsx

export default function BalancesPanel({ balances, suggestedSettlements, currentUserId, onSelectSuggestion }) {
  return (
    <div>
      <ul className="flex flex-col gap-2">
        {balances.map((b) => {
          const value = Number(b.net_balance);
          const cls = value > 0 ? 'badge badge-positive' : value < 0 ? 'badge badge-negative' : 'badge';
          return (
            <li key={b.user_id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3.5 py-2.5 text-sm">
              <span className="text-ink">{b.name}</span>
              <span className={cls}>${b.net_balance}</span>
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
                  className="flex items-center justify-between rounded-lg border border-border px-3.5 py-2.5 text-sm transition-colors hover:border-accent-soft-border"
                >
                  <span className="text-ink">
                    {s.from_name} <span className="text-muted">&rarr;</span> {s.to_name}{' '}
                    <strong className="text-accent">${s.amount}</strong>
                  </span>
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
