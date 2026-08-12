// frontend/src/components/landing/HeroSection.jsx

import { Link } from 'react-router-dom';

const MEMBERS = [
  { initials: 'A', name: 'Aman' },
  { initials: 'P', name: 'Priya' },
  { initials: 'R', name: 'Riya' },
];

const TRUST_CHIPS = ['Free to use', 'Real-time balances', 'No spreadsheets'];

export default function HeroSection() {
  return (
    <section
      className="full-bleed relative overflow-hidden pb-24 pt-16 sm:pb-32 sm:pt-24"
      style={{ backgroundImage: 'var(--gradient-hero)' }}
    >
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
          {/* Copy */}
          <div className="[animation:fade-in-up_0.5s_ease_both]">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold"
              style={{ background: 'var(--hero-surface)', border: '1px solid var(--hero-border)', color: 'var(--hero-text)' }}
            >
              <span className="live-dot" />
              Balances update live for everyone
            </span>

            <h1 className="mt-5 !text-4xl sm:!text-5xl" style={{ color: 'var(--hero-text)' }}>
              Split the grocery run,
              <br />
              not on <span style={{ color: 'var(--gold)' }}>separate phones</span>.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed sm:text-lg" style={{ color: 'var(--hero-muted)' }}>
              Most splitting apps only show the math to whoever typed it in. Smart Bill Split
              is different: scan the grocery receipt, everyone logs in and sees the same shared
              balances, and the moment someone settles up, it shows for the whole group — with
              the exact date and time.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/signup" className="btn btn-primary !px-6 !py-3 text-sm">
                Get Started Free
              </Link>
              <a
                href="#how-it-works"
                className="btn !px-6 !py-3 text-sm"
                style={{ background: 'var(--hero-surface)', border: '1px solid var(--hero-border)', color: 'var(--hero-text)' }}
              >
                See how it works
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-2.5">
              {TRUST_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: 'var(--hero-surface)', border: '1px solid var(--hero-border)', color: 'var(--hero-muted)' }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Product preview mockup */}
          <div className="relative mx-auto w-full max-w-sm [animation:fade-in-up_0.6s_ease_both] lg:mx-0 lg:ml-auto">
            <div className="card p-6 shadow-[var(--shadow-lg)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="avatar h-10 w-10 text-sm">W</span>
                  <div>
                    <p className="font-heading text-base font-semibold text-ink">Weekly Groceries</p>
                    <p className="text-xs text-muted">3 members</p>
                  </div>
                </div>
                <span className="badge badge-positive gap-1">
                  <span className="live-dot" style={{ background: 'var(--positive)' }} />
                  Live
                </span>
              </div>

              <div className="mt-4 flex -space-x-2">
                {MEMBERS.map((m) => (
                  <span key={m.name} className="avatar h-9 w-9 border-2 border-surface text-xs" title={m.name}>
                    {m.initials}
                  </span>
                ))}
              </div>

              <div className="mt-5 rounded-2xl p-4" style={{ backgroundImage: 'var(--gradient-positive)' }}>
                <p className="text-xs font-bold uppercase tracking-wide text-accent-contrast/70">You'll receive</p>
                <p className="mt-1 font-heading text-2xl font-semibold text-accent-contrast">$62</p>
              </div>

              <div className="mt-8 sm:mt-14" />
            </div>

            <div className="card absolute -bottom-6 -left-6 hidden w-56 p-3.5 shadow-[var(--shadow-lg)] sm:block">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <span className="live-dot" style={{ background: 'var(--positive)' }} />
                Just now
              </p>
              <p className="mt-1 text-sm text-text">
                <strong className="text-ink">Riya</strong> settled $30 with <strong className="text-ink">Aman</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
