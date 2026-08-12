// frontend/src/components/ReceiptItemRow.jsx

import MemberPicker from './MemberPicker';

export default function ReceiptItemRow({ item, index, members, onChange, onDelete }) {
  return (
    <tr className="hover:bg-accent-soft">
      <td className="border-b border-border p-2.5 align-top text-sm text-muted">{index + 1}</td>
      <td className="border-b border-border p-2.5 align-top">
        <input
          className="input"
          type="text"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
        />
        {item.unit_note && <p className="mt-1 max-w-xs truncate px-0.5 text-xs text-muted">{item.unit_note}</p>}
      </td>
      <td className="border-b border-border p-2.5 align-top">
        {/* No min="0" - a scanned return/adjustment line (e.g. "-0.98") is a
            legitimate negative-priced item, not invalid input. */}
        <input
          className="input"
          type="number"
          step="0.01"
          value={item.price}
          onChange={(e) => onChange({ ...item, price: e.target.value })}
        />
      </td>
      <td className="border-b border-border p-2.5 align-top">
        <MemberPicker
          members={members}
          selectedIds={item.contributor_ids}
          onChange={(ids) => onChange({ ...item, contributor_ids: ids })}
        />
      </td>
      <td className="border-b border-border p-2.5 align-top">
        <button type="button" className="btn btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => onDelete(item.localId)}>
          Delete
        </button>
      </td>
    </tr>
  );
}
