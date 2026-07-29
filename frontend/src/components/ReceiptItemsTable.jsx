// frontend/src/components/ReceiptItemsTable.jsx

import ReceiptItemRow from './ReceiptItemRow';
import ReceiptItemCard from './ReceiptItemCard';

export default function ReceiptItemsTable({ items, members, onChange }) {
  const updateItem = (updated) => {
    onChange(items.map((it) => (it.localId === updated.localId ? updated : it)));
  };

  const deleteItem = (localId) => {
    onChange(items.filter((it) => it.localId !== localId));
  };

  if (items.length === 0) {
    return <p>No items yet - scan the receipt or add one manually.</p>;
  }

  return (
    <>
      {/* Card layout below sm: table columns get too cramped to hold a name,
          price and the contributor picker in one row on a phone screen. */}
      <div className="flex flex-col gap-3 sm:hidden">
        {items.map((item, index) => (
          <ReceiptItemCard
            key={item.localId}
            item={item}
            index={index}
            members={members}
            onChange={updateItem}
            onDelete={deleteItem}
          />
        ))}
      </div>

      <table className="hidden w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-border text-sm sm:table">
        <thead>
          <tr>
            <th className="w-10 border-b border-border bg-surface-2 px-3.5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted">
              #
            </th>
            <th className="border-b border-border bg-surface-2 px-3.5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted">
              Name
            </th>
            <th className="w-28 border-b border-border bg-surface-2 px-3.5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted">
              Price
            </th>
            <th className="border-b border-border bg-surface-2 px-3.5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted">
              Contributors
            </th>
            <th className="border-b border-border bg-surface-2 px-2 py-3"></th>
          </tr>
        </thead>
        <tbody className="[&>tr:last-child>td]:border-b-0">
          {items.map((item, index) => (
            <ReceiptItemRow
              key={item.localId}
              item={item}
              index={index}
              members={members}
              onChange={updateItem}
              onDelete={deleteItem}
            />
          ))}
        </tbody>
      </table>
    </>
  );
}
