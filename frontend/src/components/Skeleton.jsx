// frontend/src/components/Skeleton.jsx
// A pulsing placeholder block, sized via className, used in place of a
// spinner for section-level loads so content doesn't visually "pop" or
// shift layout once it arrives.

export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} aria-hidden="true" />;
}
