// frontend/src/utils/groupThemes.js
// Curated icon + color options for a group's avatar. Kept as plain data so
// GroupIconPicker (the editor) and GroupAvatarBadge (the renderer) share one
// source of truth for what "theme" ids mean.

export const GROUP_ICONS = [
  '🛒', '🏠', '🍕', '🎉', '💰', '✈️', '🐶', '🎮',
  '🎵', '📚', '🏋️', '🌮', '🍺', '🎂', '🐱', '🚗',
  '🏖️', '💼', '🎨', '🔥', '⭐', '🌟', '💡', '🎓',
];

export const GROUP_THEMES = [
  { id: 'teal', label: 'Teal', gradient: 'linear-gradient(135deg, #1e6f5c, #2e8b72)' },
  { id: 'gold', label: 'Gold', gradient: 'linear-gradient(135deg, #f0b429, #cc9923)' },
  { id: 'blue', label: 'Blue', gradient: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' },
  { id: 'purple', label: 'Purple', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
  { id: 'pink', label: 'Pink', gradient: 'linear-gradient(135deg, #db2777, #f472b6)' },
  { id: 'red', label: 'Red', gradient: 'linear-gradient(135deg, #d7263d, #ef4444)' },
  { id: 'orange', label: 'Orange', gradient: 'linear-gradient(135deg, #f59e0b, #fb923c)' },
  { id: 'green', label: 'Green', gradient: 'linear-gradient(135deg, #059669, #34d399)' },
];

const DEFAULT_GRADIENT = GROUP_THEMES[0].gradient;

export function themeGradient(id) {
  return GROUP_THEMES.find((t) => t.id === id)?.gradient || DEFAULT_GRADIENT;
}
