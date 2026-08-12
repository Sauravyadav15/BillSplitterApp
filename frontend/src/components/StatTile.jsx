// frontend/src/components/StatTile.jsx
// A compact dashboard stat card - icon, label, animated number. Used in the
// bento-style stats row at the top of GroupPage/BillDetailPage so those
// pages open with something to look at besides a bare heading.

import useCountUp from '../hooks/useCountUp';

export default function StatTile({ icon, label, value, prefix = '$', decimals = 2, tone = 'default', delay = 0 }) {
  const animated = useCountUp(value);
  const display = decimals > 0 ? animated.toFixed(decimals) : Math.round(animated).toString();

  const toneClass = tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : 'text-ink';

  return (
    <div className="stat-tile reveal" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 text-muted">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {icon}
        </span>
        <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p className={`font-heading text-2xl font-semibold ${toneClass}`}>
        {prefix}
        {display}
      </p>
    </div>
  );
}
