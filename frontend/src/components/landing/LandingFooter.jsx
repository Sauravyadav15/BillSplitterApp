// frontend/src/components/landing/LandingFooter.jsx

import { Link } from 'react-router-dom';

export default function LandingFooter() {
  return (
    <footer className="full-bleed px-6 pb-8 pt-16" style={{ backgroundImage: 'var(--gradient-hero)' }}>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-10 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <Link to="/" className="flex items-center gap-2.5 font-heading text-lg font-semibold">
            <img src="/icon-64.png" alt="" className="h-8 w-8 rounded-lg" />
            <span style={{ color: 'var(--hero-text)' }}>Smart Bill Split</span>
          </Link>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--gold)' }}>
            Scan. Select. Split fairly.
          </p>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--hero-muted)' }}>
            The bill splitter that keeps every friend in the loop — real-time balances, shared
            settlement history, one login for the whole group.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:flex sm:gap-16">
          <div>
            <h3 style={{ color: 'var(--gold)' }}>Product</h3>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <a href="#how-it-works" style={{ color: 'var(--hero-text)' }}>
                How it works
              </a>
              <a href="#features" style={{ color: 'var(--hero-text)' }}>
                Features
              </a>
              <a href="#faq" style={{ color: 'var(--hero-text)' }}>
                FAQ
              </a>
            </div>
          </div>
          <div>
            <h3 style={{ color: 'var(--gold)' }}>Account</h3>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link to="/signup" style={{ color: 'var(--hero-text)' }}>
                Sign up
              </Link>
              <Link to="/login" style={{ color: 'var(--hero-text)' }}>
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div
        className="mx-auto mt-12 max-w-[1180px] pt-6 text-xs"
        style={{ borderTop: '1px solid var(--hero-border)', color: 'var(--hero-muted)' }}
      >
        © {new Date().getFullYear()} Smart Bill Split.
      </div>
    </footer>
  );
}
