// frontend/src/components/landing/LandingNavbar.jsx

import { Link } from 'react-router-dom';
import useHideOnScroll from '../../hooks/useHideOnScroll';
import { useTheme } from '../../context/ThemeContext';

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#faq', label: 'FAQ' },
];

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
    <circle cx="12" cy="12" r="4" />
    <path
      strokeLinecap="round"
      d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
    />
  </svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </svg>
);

export default function LandingNavbar() {
  const visible = useHideOnScroll();
  const { isDark, toggleTheme } = useTheme();

  return (
    <nav
      className="full-bleed-sticky z-40 rounded-b-2xl border-b border-border bg-surface/80 shadow-md backdrop-blur-md transition-transform duration-300"
      style={{ transform: visible ? 'translateY(0)' : 'translateY(-100%)' }}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src="/icon-64.png" alt="" className="h-7 w-7 rounded-lg sm:h-10 sm:w-10 sm:rounded-xl" />
          <span className="flex flex-col leading-tight">
            <span className="font-heading text-sm font-semibold text-gradient sm:text-lg">Smart Bill Split</span>
            <span className="hidden font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-muted sm:block">
              Scan &middot; Select &middot; Split fairly
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-text hover:text-accent">
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="btn btn-ghost !p-1.5"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          <Link to="/login" className="btn btn-ghost !px-3 !py-1.5 text-xs">
            Log in
          </Link>
          <Link to="/signup" className="btn btn-primary !px-4 !py-1.5 text-xs">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
