// frontend/src/components/landing/DemoSection.jsx

const ITEMS = [
  { name: 'Trader Joe\'s Grocery Run', paidBy: 'Priya', amount: 68 },
  { name: 'Farmers Market Produce', paidBy: 'Aman', amount: 24 },
  { name: 'Costco Bulk Order', paidBy: 'Riya', amount: 94 },
];

const ACTIVITY = [
  { text: "Riya settled $30 with Aman", time: 'Just now', live: true },
  { text: 'Priya added "Trader Joe\'s Grocery Run" — $68', time: '10 min ago' },
  { text: 'Aman added "Farmers Market Produce" — $24', time: '1 hr ago' },
];

export default function DemoSection() {
  const total = ITEMS.reduce((sum, i) => sum + i.amount, 0);

  return (
    <section className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-[1180px]">
        <div className="mx-auto max-w-2xl text-center">
          <h3>See it in action</h3>
          <h2 className="mt-2 !text-3xl sm:!text-4xl">One shared tab, updated live</h2>
          <p className="mt-3 text-text">
            No one has to ask "did you add that yet?" — every bill and every settlement lands
            in the group's shared activity the second it happens.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="card p-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="!text-lg">Weekly Groceries</h2>
                <span className="badge badge-gold">Grocery run</span>
              </div>
              <span className="badge badge-positive">3 members</span>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              {ITEMS.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{item.name}</p>
                    <p className="text-xs text-muted">Paid by {item.paidBy}</p>
                  </div>
                  <p className="font-heading text-sm font-semibold text-ink">${item.amount}</p>
                </div>
              ))}
            </div>
            <div className="btn btn-primary mt-5 w-full !cursor-default justify-between !px-5">
              <span>Total expenses</span>
              <span>${total}</span>
            </div>
          </div>

          <div className="card p-7">
            <div className="flex items-center justify-between">
              <h2 className="!text-lg">Live activity</h2>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-positive">
                <span className="live-dot" style={{ background: 'var(--positive)' }} />
                Syncing
              </span>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              {ACTIVITY.map((a) => (
                <div
                  key={a.text}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3"
                >
                  <p className="text-sm text-text">{a.text}</p>
                  <span className="shrink-0 text-xs font-medium text-muted">{a.time}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-accent-soft-border bg-accent-soft px-4 py-3 text-sm text-accent">
              Every group member sees this exact same feed — with the same timestamps.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
