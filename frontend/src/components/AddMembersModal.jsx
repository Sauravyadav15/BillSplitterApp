// frontend/src/components/AddMembersModal.jsx

import AddMemberForm from './AddMemberForm';
import GroupMembersList from './GroupMembersList';

export default function AddMembersModal({ members, onAddMember, onContinue }) {
  const canContinue = members.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[85vh] w-full max-w-md overflow-y-auto p-6 [animation:fade-in-up_0.3s_ease_both]">
        <h2 className="mb-1">Add friends to this group</h2>
        <p className="mb-4 text-sm text-text">
          Bills split across everyone in the group by default, so add everyone who'll be sharing
          expenses here before you scan a receipt.
        </p>
        <GroupMembersList members={members} />
        <div className="mt-4">
          <AddMemberForm onSubmit={onAddMember} />
        </div>
        <button
          type="button"
          className="btn btn-primary mt-6 w-full"
          disabled={!canContinue}
          onClick={onContinue}
        >
          {canContinue ? 'Continue' : 'Add at least one member to continue'}
        </button>
      </div>
    </div>
  );
}
