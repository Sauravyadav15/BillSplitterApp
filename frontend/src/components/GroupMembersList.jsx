// frontend/src/components/GroupMembersList.jsx

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

export default function GroupMembersList({ members, currentUserId, creatorId, onRemove }) {
  return (
    <ul className="flex flex-col gap-2">
      {members.map((member) => {
        const isCreator = member.id === creatorId;
        const isOwner = currentUserId === creatorId;
        const canRemove = onRemove && isOwner && !isCreator;
        return (
          <li key={member.id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3.5 py-2.5">
            <span className="avatar h-8 w-8 text-xs">{initials(member.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {member.name}
                {isCreator && <span className="ml-1.5 text-xs font-normal text-muted">(creator)</span>}
              </p>
              <p className="truncate text-xs text-muted">{member.email}</p>
            </div>
            {canRemove && (
              <button
                type="button"
                aria-label={`Remove ${member.name}`}
                className="btn btn-ghost !p-1.5 shrink-0 text-muted hover:text-negative"
                onClick={() => onRemove(member)}
              >
                ✕
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
