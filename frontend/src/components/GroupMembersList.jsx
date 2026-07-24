// frontend/src/components/GroupMembersList.jsx

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

export default function GroupMembersList({ members }) {
  return (
    <ul className="flex flex-col gap-2">
      {members.map((member) => (
        <li key={member.id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3.5 py-2.5">
          <span className="avatar h-8 w-8 text-xs">{initials(member.name)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{member.name}</p>
            <p className="truncate text-xs text-muted">{member.email}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
