// frontend/src/components/BalanceSummaryCard.jsx
// Home-page "at a glance" summary: how much the user is owed vs. owes,
// added up across every group they're in.

export default function BalanceSummaryCard({ summary, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="h-24 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-24 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <div className="rounded-2xl p-4 shadow-[var(--shadow-md)]" style={{ backgroundImage: 'var(--gradient-positive)' }}>
        <p className="text-xs font-bold uppercase tracking-wide text-accent-contrast/70">
          You'll receive
        </p>
        <p className="mt-1.5 truncate font-heading text-2xl font-semibold text-accent-contrast">
          ${summary.will_receive}
        </p>
      </div>
      <div className="rounded-2xl p-4 shadow-[var(--shadow-md)]" style={{ backgroundImage: 'var(--gradient-negative)' }}>
        <p className="text-xs font-bold uppercase tracking-wide text-accent-contrast/70">
          You'll pay
        </p>
        <p className="mt-1.5 truncate font-heading text-2xl font-semibold text-accent-contrast">
          ${summary.will_pay}
        </p>
      </div>
    </div>
  );
}
