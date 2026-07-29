// frontend/src/components/landing/LandingNavbar.jsx

import { Link } from 'react-router-dom';
import useHideOnScroll from '../../hooks/useHideOnScroll';

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#faq', label: 'FAQ' },
];

export default function LandingNavbar() {
  const visible = useHideOnScroll();

  return (
    <nav
      className="full-bleed-sticky z-40 rounded-b-2xl border-b border-border bg-surface/80 shadow-md backdrop-blur-md transition-transform duration-300"
      style={{ transform: visible ? 'translateY(0)' : 'translateY(-100%)' }}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <img src="/icon-64.png" alt="" className="h-9 w-9 rounded-xl sm:h-10 sm:w-10" />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="font-heading text-lg font-semibold text-gradient">Smart Bill Split</span>
            <span className="font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-muted">
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
