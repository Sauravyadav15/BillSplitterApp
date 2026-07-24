// frontend/src/components/MemberPicker.jsx

export default function MemberPicker({ members, selectedIds, onChange }) {
  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {members.map((m) => {
        const checked = selectedIds.includes(m.id);
        return (
          <label key={m.id} className={`chip relative ${checked ? 'chip-checked' : ''}`}>
            <input
              type="checkbox"
              className="absolute h-0 w-0 opacity-0"
              checked={checked}
              onChange={() => toggle(m.id)}
            />
            <span aria-hidden="true">{checked ? '☑' : '☐'}</span>
            {m.name}
          </label>
        );
      })}
    </div>
  );
}
