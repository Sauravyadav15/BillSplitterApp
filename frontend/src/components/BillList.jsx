// frontend/src/components/BillList.jsx

import BillCard from './BillCard';

export default function BillList({ bills }) {
  if (bills.length === 0) {
    return <p>No bills yet - add one to get started.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {bills.map((bill) => (
        <BillCard key={bill.id} bill={bill} />
      ))}
    </div>
  );
}
