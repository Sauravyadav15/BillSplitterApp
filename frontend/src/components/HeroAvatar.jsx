// frontend/src/components/HeroAvatar.jsx
// An original, unlicensed comic-superhero-style avatar - deterministically
// generated from a small seed by combining one of several color palettes
// with one of several mask/silhouette variants. Nothing here is drawn from
// or resembles any specific real/trademarked character - these are generic
// masked-hero motifs (cowl, domino mask, visor, wings, claw marks, a star,
// antennae), rendered as flat vector shapes, the same way identicon-style
// avatar generators work.

// Order matters and is APPEND-ONLY: existing users already have a stored
// seed ("hero-N") pointing at a specific palette+variant combo. The first
// 8 palettes and first 3 variants (cowl/domino/visor) reproduce the exact
// seed 0-23 mapping this component originally shipped with - never reorder
// or remove entries, only add new ones after the existing list.
const PALETTES = [
  { bg: '#d7263d', mask: '#14213d', accent: '#f0b429' }, // crimson / navy / gold
  { bg: '#1d4ed8', mask: '#e5e7eb', accent: '#ffffff' }, // cobalt / silver
  { bg: '#7c3aed', mask: '#111827', accent: '#f0b429' }, // violet / black / gold
  { bg: '#059669', mask: '#111827', accent: '#ffffff' }, // emerald / black
  { bg: '#f59e0b', mask: '#111827', accent: '#d7263d' }, // amber / black / red
  { bg: '#db2777', mask: '#111827', accent: '#ffffff' }, // magenta / black
  { bg: '#1e6f5c', mask: '#f0b429', accent: '#ffffff' }, // teal / gold (brand)
  { bg: '#334155', mask: '#d7263d', accent: '#ffffff' }, // slate / red
  // Appended - new palettes for the expanded variant set below.
  { bg: '#0ea5e9', mask: '#0c4a6e', accent: '#ffffff' }, // sky / navy
  { bg: '#65a30d', mask: '#1a2e05', accent: '#facc15' }, // olive / near-black / yellow
  { bg: '#ea580c', mask: '#1c1917', accent: '#ffffff' }, // burnt orange / black
  { bg: '#0f172a', mask: '#f0b429', accent: '#d7263d' }, // near-black / gold / crimson
  { bg: '#be123c', mask: '#111827', accent: '#facc15' }, // rose / black / yellow
  { bg: '#4c1d95', mask: '#f472b6', accent: '#ffffff' }, // deep violet / pink
];

const VARIANT_NAMES = ['cowl', 'domino', 'visor', 'winged', 'claw', 'star', 'antenna'];
const LEGACY_PALETTE_COUNT = 8;
const LEGACY_VARIANT_COUNT = 3;

// Flat, explicit (variant, palette) pairing - the actual seed -> look table.
// Reconstructs the legacy combinatorial order for seeds 0-23 first, then
// appends every remaining combo (new palettes x old variants, and every
// palette x new variants) in a stable, deterministic order.
const AVATAR_VARIANTS = [];
for (let v = 0; v < LEGACY_VARIANT_COUNT; v += 1) {
  for (let p = 0; p < LEGACY_PALETTE_COUNT; p += 1) {
    AVATAR_VARIANTS.push({ variant: VARIANT_NAMES[v], palette: PALETTES[p] });
  }
}
for (let v = 0; v < VARIANT_NAMES.length; v += 1) {
  for (let p = 0; p < PALETTES.length; p += 1) {
    if (v < LEGACY_VARIANT_COUNT && p < LEGACY_PALETTE_COUNT) continue; // already added above
    AVATAR_VARIANTS.push({ variant: VARIANT_NAMES[v], palette: PALETTES[p] });
  }
}

export const HERO_AVATAR_COUNT = AVATAR_VARIANTS.length;

function HeroFace({ variant, palette }) {
  const { mask, accent } = palette;

  if (variant === 'cowl') {
    return (
      <>
        <path
          d="M32 6C19 6 10 15 10 28c0 9 4 16 10 20l2-9c1-4 4-6 8-6h4c4 0 7 2 8 6l2 9c6-4 10-11 10-20C54 15 45 6 32 6Z"
          fill={mask}
        />
        <path d="M14 20 6 10l10 4z" fill={mask} />
        <path d="M50 20l8-10-10 4z" fill={mask} />
        <path d="M22 29q5-5 10-1l-1.5 4.5q-4 2-8 0Z" fill={accent} />
        <path d="M42 29q-5-5-10-1l1.5 4.5q4 2 8 0Z" fill={accent} />
      </>
    );
  }

  if (variant === 'domino') {
    return (
      <>
        <circle cx="32" cy="27" r="18" fill="#e7e0d6" />
        <path d="M14 23q18-11 36 0l-2.5 6.5q-15.5-8.5-31 0Z" fill={mask} />
        <circle cx="24" cy="25.5" r="3.4" fill={accent} />
        <circle cx="40" cy="25.5" r="3.4" fill={accent} />
      </>
    );
  }

  if (variant === 'visor') {
    return (
      <>
        <path
          d="M32 6C19 6 10 15 10 28c0 9 4 16 10 20l2-9c1-4 4-6 8-6h4c4 0 7 2 8 6l2 9c6-4 10-11 10-20C54 15 45 6 32 6Z"
          fill={mask}
        />
        <rect x="16" y="23" width="32" height="9" rx="4.5" fill={accent} />
      </>
    );
  }

  if (variant === 'winged') {
    return (
      <>
        <path
          d="M32 6C19 6 10 15 10 28c0 9 4 16 10 20l2-9c1-4 4-6 8-6h4c4 0 7 2 8 6l2 9c6-4 10-11 10-20C54 15 45 6 32 6Z"
          fill={mask}
        />
        <path d="M12 22 0 13l14 3z" fill={mask} />
        <path d="M52 22 64 13l-14 3z" fill={mask} />
        <path d="M22 29q5-5 10-1l-1.5 4.5q-4 2-8 0Z" fill={accent} />
        <path d="M42 29q-5-5-10-1l1.5 4.5q4 2 8 0Z" fill={accent} />
      </>
    );
  }

  if (variant === 'claw') {
    return (
      <>
        <circle cx="32" cy="27" r="18" fill="#e7e0d6" />
        <circle cx="24" cy="25.5" r="3" fill={mask} />
        <circle cx="40" cy="25.5" r="3" fill={mask} />
        <path d="M16 13 27 35" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <path d="M23 11 34 35" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <path d="M30 10 41 35" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      </>
    );
  }

  if (variant === 'star') {
    return (
      <>
        <path
          d="M32 6C19 6 10 15 10 28c0 9 4 16 10 20l2-9c1-4 4-6 8-6h4c4 0 7 2 8 6l2 9c6-4 10-11 10-20C54 15 45 6 32 6Z"
          fill={mask}
        />
        <circle cx="23" cy="27" r="2.6" fill={accent} />
        <circle cx="41" cy="27" r="2.6" fill={accent} />
        <path
          d="M32 13.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8Z"
          fill={accent}
        />
      </>
    );
  }

  // antenna
  return (
    <>
      <circle cx="32" cy="27" r="18" fill="#e7e0d6" />
      <path d="M14 23q18-11 36 0l-2.5 6.5q-15.5-8.5-31 0Z" fill={mask} />
      <circle cx="24" cy="25.5" r="3.4" fill={accent} />
      <circle cx="40" cy="25.5" r="3.4" fill={accent} />
      <path d="M22 10 18 2" stroke={mask} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="18" cy="2" r="2.4" fill={accent} />
      <path d="M42 10 46 2" stroke={mask} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="46" cy="2" r="2.4" fill={accent} />
    </>
  );
}

export default function HeroAvatar({ seed = 0, className = 'h-10 w-10' }) {
  const idx = ((Math.floor(seed) % HERO_AVATAR_COUNT) + HERO_AVATAR_COUNT) % HERO_AVATAR_COUNT;
  const { variant, palette } = AVATAR_VARIANTS[idx];

  return (
    <svg viewBox="0 0 64 64" className={`${className} shrink-0 rounded-full`} role="img" aria-label="Avatar">
      <circle cx="32" cy="32" r="32" fill={palette.bg} />
      <HeroFace variant={variant} palette={palette} />
      <path d="M32 45.5 26 53h12z" fill={palette.accent} opacity="0.85" />
    </svg>
  );
}
