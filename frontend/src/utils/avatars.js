// frontend/src/utils/avatars.js
// Shared helpers for rendering a person's avatar - either their chosen
// HeroAvatar (see components/HeroAvatar.jsx) or, for accounts created before
// this feature (avatar is null), a two-letter initials fallback.

const HERO_PREFIX = 'hero-';

export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

export function heroAvatarId(seed) {
  return `${HERO_PREFIX}${seed}`;
}

// Returns the numeric seed if `avatar` is a valid "hero-N" id, else null.
export function parseHeroSeed(avatar) {
  if (typeof avatar !== 'string' || !avatar.startsWith(HERO_PREFIX)) return null;
  const n = Number(avatar.slice(HERO_PREFIX.length));
  return Number.isInteger(n) && n >= 0 ? n : null;
}
