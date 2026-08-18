// frontend/src/components/AvatarPicker.jsx

import HeroAvatar, { HERO_AVATAR_COUNT } from './HeroAvatar';

const SEEDS = Array.from({ length: HERO_AVATAR_COUNT }, (_, i) => i);

export default function AvatarPicker({ value, onChange }) {
  return (
    <div>
      <span className="field-label">Choose your avatar</span>
      <div className="grid max-h-44 grid-cols-6 gap-2 overflow-y-auto rounded-xl border border-border bg-surface-2 p-2.5">
        {SEEDS.map((seed) => (
          <button
            key={seed}
            type="button"
            onClick={() => onChange(seed)}
            aria-label={`Avatar option ${seed + 1}`}
            aria-pressed={value === seed}
            className="flex w-full min-w-0 items-center justify-center rounded-full p-0.5 transition-transform hover:scale-110"
            style={{ outline: value === seed ? '2px solid var(--accent)' : 'none', outlineOffset: '2px' }}
          >
            <HeroAvatar seed={seed} className="aspect-square w-full" />
          </button>
        ))}
      </div>
    </div>
  );
}
