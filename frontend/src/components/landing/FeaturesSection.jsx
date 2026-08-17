// frontend/src/components/landing/FeaturesSection.jsx

const FEATURES = [
  {
    title: 'Real-time group sync',
    desc: "The moment a bill or settlement is added, every member's balance updates — no refreshing, no taking someone's word for it.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"
      />
    ),
  },
  {
    title: 'One login, full history',
    desc: 'Your groups, bills, and settlements stay tied to your account — not stuck on the one phone that happened to create the split.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 3.13a4 4 0 0 1 0 7.75M18 8a4 4 0 0 1 0 7.75"
      />
    ),
  },
  {
    title: 'Scan & split receipts',
    desc: 'Snap a photo of your receipt and let OCR pull out item names and prices for you — review, tweak if needed, and split.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2m10-16h2a1 1 0 0 1 1 1v2m-4 14h2a1 1 0 0 0 1-1v-2M8 12h8M8 9h8"
      />
    ),
  },
  {
    title: 'Item-level splitting',
    desc: "Assign each item on the bill to exactly who shared it, instead of dividing the whole total evenly by default.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 3v18M4 3h16v18H4V3Zm5 6h11M9 15h11"
      />
    ),
  },
  {
    title: 'Timestamped settlements',
    desc: 'Every payment between friends is recorded with who paid whom, how much, and exactly when — a shared record, not a memory contest.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 7v5l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    ),
  },
  {
    title: 'Built for any group',
    desc: 'Roommates splitting the weekly grocery run, a family stocking up for the month, a recurring house tab — create as many groups as you need, each with its own members and balance.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M17 20h5v-1a4 4 0 0 0-3-3.87M9 20H4v-1a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v1m-1-13a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm8 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    ),
  },
  {
    title: 'Smart settle-up suggestions',
    desc: "Instead of everyone paying everyone back, Smart Bill Split works out the fewest payments needed to settle the whole group up — three people owing each other odd amounts can become one transfer instead of six.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4h16l-6 8v6l-4 2v-8L4 4Z" />,
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-surface-2/50 px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-[1180px]">
        <div className="mx-auto max-w-2xl text-center">
          <h3>Why choose Smart Bill Split</h3>
          <h2 className="mt-2 !text-3xl sm:!text-4xl">Built to be shared, not just used</h2>
          <p className="mt-3 text-text">
            Most bill splitters are a private calculator — the split only exists on the device that made it.
            Smart Bill Split keeps every member of the group looking at the same numbers.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            // Alternate a couple of icons into the brand's gold accent so the
            // grid doesn't read as one flat wall of teal - also picks out
            // the two most technically-differentiated features (scanning,
            // settle-up simplification) from the more expected ones.
            const gold = i === 2 || i === 5 || i === 6;
            return (
              <div key={f.title} className="card card-hover p-6">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    gold ? 'bg-gold-soft text-gold-strong' : 'bg-accent-soft text-accent'
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                    {f.icon}
                  </svg>
                </span>
                <h2 className="mt-4 !text-base">{f.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-text">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
