// frontend/src/components/GroupMembersList.jsx

import UserAvatar from './UserAvatar';

export default function GroupMembersList({ members, currentUserId, creatorId, onRemove }) {
  return (
    <ul className="flex flex-col gap-2">
      {members.map((member) => {
        const isCreator = member.id === creatorId;
        const isOwner = currentUserId === creatorId;
        const canRemove = onRemove && isOwner && !isCreator;
        return (
          <li key={member.id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3.5 py-2.5">
            <UserAvatar user={member} className="h-8 w-8 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {member.name}
                {isCreator && <span className="badge badge-gold ml-1.5 !px-1.5 !py-0 align-middle text-[10px]">Owner</span>}
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
