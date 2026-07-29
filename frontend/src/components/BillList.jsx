// frontend/src/components/BillList.jsx

import BillCard from './BillCard';

export default function BillList({ bills }) {
  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border py-10 text-center">
        <p className="font-medium text-ink">No bills yet</p>
        <p className="text-sm text-muted">Add one to get started.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {bills.map((bill) => (
        <BillCard key={bill.id} bill={bill} />
      ))}
    </div>
  );
}
