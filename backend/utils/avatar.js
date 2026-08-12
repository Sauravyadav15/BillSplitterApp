// backend/utils/avatar.js
// Validates a HeroAvatar seed id ("hero-N") - shared by authController (signup)
// and meController (profile avatar changes) so both enforce the exact same
// range. HERO_AVATAR_COUNT must be kept in sync with the frontend's
// HERO_AVATAR_COUNT (frontend/src/components/HeroAvatar.jsx) - the two apps
// don't share config, so this is a manual mirror, not an import.
const HERO_AVATAR_COUNT = 98;

function isValidAvatar(avatar) {
  if (typeof avatar !== 'string') return false;
  const match = /^hero-(\d+)$/.exec(avatar);
  if (!match) return false;
  const n = Number(match[1]);
  return Number.isInteger(n) && n >= 0 && n < HERO_AVATAR_COUNT;
}

module.exports = { HERO_AVATAR_COUNT, isValidAvatar };
