// frontend/src/components/landing/CtaSection.jsx

import { Link } from 'react-router-dom';

export default function CtaSection() {
  return (
    <section className="full-bleed px-6 py-20 sm:py-28" style={{ backgroundImage: 'var(--gradient-hero)' }}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="!text-3xl sm:!text-4xl" style={{ color: 'var(--hero-text)' }}>
          Stop guessing who owes what.
        </h2>
        <p className="mt-4 text-base sm:text-lg" style={{ color: 'var(--hero-muted)' }}>
          Create your first group in under a minute — it's free, and everyone stays on the same page.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/signup" className="btn btn-primary !px-7 !py-3 text-sm">
            Get Started Free
          </Link>
          <Link
            to="/login"
            className="btn !px-7 !py-3 text-sm"
            style={{ background: 'var(--hero-surface)', border: '1px solid var(--hero-border)', color: 'var(--hero-text)' }}
          >
            Log in
          </Link>
        </div>
      </div>
    </section>
  );
}
