// frontend/src/components/landing/HowItWorksSection.jsx

const STEPS = [
  {
    step: 1,
    title: 'Create a group',
    desc: "Sign up, then add your friends by email. Since everyone gets a real account, there's no list of names that only lives on your phone.",
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
    step: 2,
    title: 'Add a bill or scan a receipt',
    desc: 'Type it in, or snap a photo — items and prices are pulled out automatically so you can split down to the item, not just the total.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 2v2m6-2v2M5 7h14M6 4h12a1 1 0 0 1 1 1v15l-2.5-1.5L14 20l-2.5-1.5L9 20l-2.5-1.5L4 20V5a1 1 0 0 1 1-1v0Z"
      />
    ),
  },
  {
    step: 3,
    title: 'Everyone sees it, live',
    desc: 'Balances update for the whole group instantly. When someone settles up, it\'s logged with who, how much, and exactly when.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    ),
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-[1180px]">
        <div className="mx-auto max-w-2xl text-center">
          <h3>How it works</h3>
          <h2 className="mt-2 !text-3xl sm:!text-4xl">Three steps to a settled tab</h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="card card-hover relative p-7">
              <span className="badge badge-gold absolute right-6 top-6">{s.step}</span>
              <span className="avatar flex h-12 w-12 items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6">
                  {s.icon}
                </svg>
              </span>
              <h2 className="mt-5 !text-lg">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-text">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
