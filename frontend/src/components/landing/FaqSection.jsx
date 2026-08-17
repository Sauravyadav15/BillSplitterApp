// frontend/src/components/landing/FaqSection.jsx

import { useState } from 'react';

const FAQS = [
  {
    q: 'Is Smart Bill Split free to use?',
    a: 'Yes. Creating an account, groups, bills, and settlements is free.',
  },
  {
    q: 'Do all my friends need to create an account?',
    a: "Yes — that's what makes the balances real-time. Each member logs in and sees the group's shared balance from their own account, instead of trusting a split someone else typed up. Signing up takes about a minute.",
  },
  {
    q: 'How does receipt scanning work?',
    a: "Snap a photo of a receipt and Smart Bill Split reads it automatically, pulling out each item's name and price so you don't have to type them in. It's a starting point — you can review and adjust anything before splitting.",
  },
  {
    q: 'Can I be part of more than one group?',
    a: 'Yes. Create as many groups as you need — your flat\'s grocery runs, a potluck, a recurring house tab — and every group tracks its own members, bills, and balance separately.',
  },
  {
    q: 'What if someone needs to be removed from a group?',
    a: "Any group member can remove someone from the group. Bills and settlements they were already part of stay in the group's history.",
  },
  {
    q: 'Is my data secure?',
    a: "Your account is protected by a password we never store in plain text, and your groups are only visible to the people you've added to them. Receipt photos are processed by Google's OCR to read the items off them, then stored via Cloudinary.",
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="bg-surface-2/50 px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <div className="mx-auto max-w-2xl text-center">
          <h3>FAQ</h3>
          <h2 className="mt-2 !text-3xl sm:!text-4xl">Common questions</h2>
        </div>

        <div className="mt-12 flex flex-col gap-3">
          {FAQS.map((faq, i) => {
            const open = openIndex === i;
            return (
              <div key={faq.q} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? -1 : i)}
                  aria-expanded={open}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-4 text-left"
                >
                  <span className="font-heading text-base font-semibold text-ink">{faq.q}</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-5 w-5 shrink-0 text-muted transition-transform duration-200"
                    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {open && <p className="px-6 pb-5 text-sm leading-relaxed text-text">{faq.a}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
