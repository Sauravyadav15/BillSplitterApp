// frontend/src/components/GroupAvatarBadge.jsx
// Renders a group's chosen icon on its chosen color theme, or falls back to
// a letter-on-brand-teal badge for groups created before this feature
// existed (icon/color_theme are null).

import { themeGradient } from '../utils/groupThemes';

export default function GroupAvatarBadge({ group, className = 'h-11 w-11 text-lg' }) {
  return (
    <span className={`avatar ${className}`} style={{ backgroundImage: themeGradient(group?.color_theme) }}>
      {group?.icon || group?.name?.[0]?.toUpperCase() || '?'}
    </span>
  );
}
