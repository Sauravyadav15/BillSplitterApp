// frontend/src/components/ContributorSplitBar.jsx
// A thin segmented bar showing each contributor's proportional share of a
// bill item - sits above the contributor chip list so "who owes how much of
// this" reads as a shape, not just a row of numbers.

import { contributorGradient } from '../utils/contributorColors';

export default function ContributorSplitBar({ contributors }) {
  if (!contributors || contributors.length === 0) return null;

  return (
    <div className="segment-bar" role="presentation">
      {contributors.map((c) => (
        <span
          key={c.user_id}
          title={`${c.name} - $${c.share_amount}`}
          style={{
            flexGrow: Number(c.share_amount) || 0,
            flexBasis: 0,
            backgroundImage: contributorGradient(c.user_id),
          }}
        />
      ))}
    </div>
  );
}
