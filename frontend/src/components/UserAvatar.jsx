// frontend/src/components/UserAvatar.jsx
// Renders a person's chosen HeroAvatar, or falls back to initials for
// accounts created before the avatar feature existed (avatar is null).

import HeroAvatar from './HeroAvatar';
import { initials, parseHeroSeed } from '../utils/avatars';

export default function UserAvatar({ user, className = 'h-8 w-8 text-xs' }) {
  const seed = parseHeroSeed(user?.avatar);
  if (seed !== null) {
    return <HeroAvatar seed={seed} className={className} />;
  }
  return <span className={`avatar ${className}`}>{initials(user?.name)}</span>;
}
