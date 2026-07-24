// frontend/src/components/ReceiptItemRow.jsx

import MemberPicker from './MemberPicker';

export default function ReceiptItemRow({ item, members, onChange, onDelete }) {
  return (
    <tr className="hover:bg-accent-soft">
      <td className="border-b border-border p-2.5 align-top">
        <input
          className="input"
          type="text"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
        />
      </td>
      <td className="border-b border-border p-2.5 align-top">
        <input
          className="input"
          type="number"
          step="0.01"
          min="0"
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
