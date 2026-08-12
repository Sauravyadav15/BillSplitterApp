// frontend/src/components/BillList.jsx

import { useState } from 'react';
import BillCard from './BillCard';
import MergedBillsTile from './MergedBillsTile';
import BillsModal from './BillsModal';

export default function BillList({ bills }) {
  const [showAll, setShowAll] = useState(false);

  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border py-10 text-center">
        <p className="font-medium text-ink">No bills yet</p>
        <p className="text-sm text-muted">Add one to get started.</p>
      </div>
    );
  }

  if (bills.length === 1) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <div className="reveal">
          <BillCard bill={bills[0]} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <div className="reveal">
          <MergedBillsTile bills={bills} onOpen={() => setShowAll(true)} />
        </div>
      </div>
      {showAll && <BillsModal bills={bills} onClose={() => setShowAll(false)} />}
    </>
  );
}
