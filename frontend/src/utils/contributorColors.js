// frontend/src/utils/contributorColors.js
// Deterministic color per contributor (by user_id) for the per-item split
// bar on BillDetailPage. Reuses the same gradient set as GROUP_THEMES so no
// new colors enter the app's palette - just a stable hash -> gradient pick.

import { GROUP_THEMES } from './groupThemes';

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function contributorGradient(userId) {
  const theme = GROUP_THEMES[hashString(String(userId)) % GROUP_THEMES.length];
  return theme.gradient;
}
