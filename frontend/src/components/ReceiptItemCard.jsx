// frontend/src/components/ReceiptItemCard.jsx
// Mobile counterpart to ReceiptItemRow - same fields, stacked so a long item
// name isn't squeezed down to a sliver by the price field sharing its row.

import MemberPicker from './MemberPicker';

export default function ReceiptItemCard({ item, index, members, onChange, onDelete }) {
  return (
    <div className="card flex flex-col gap-3 p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="w-5 shrink-0 pt-2.5 text-right text-sm text-muted">{index + 1}.</span>
        <div className="min-w-0 flex-1">
          <input
            className="input"
            type="text"
            placeholder="Item name"
            value={item.name}
            onChange={(e) => onChange({ ...item, name: e.target.value })}
          />
          {item.unit_note && <p className="mt-1 truncate px-0.5 text-xs text-muted">{item.unit_note}</p>}
        </div>
        <button
          type="button"
          aria-label="Delete item"
          className="btn btn-ghost !p-2.5 shrink-0 text-muted"
          onClick={() => onDelete(item.localId)}
        >
          ✕
        </button>
      </div>
      <div className="relative w-28">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">
          $
        </span>
        <input
          className="input pl-6"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={item.price}
          onChange={(e) => onChange({ ...item, price: e.target.value })}
        />
      </div>
      <div>
        <p className="field-label mb-1.5">Split between</p>
        <MemberPicker
          members={members}
          selectedIds={item.contributor_ids}
          onChange={(ids) => onChange({ ...item, contributor_ids: ids })}
        />
      </div>
    </div>
  );
}
