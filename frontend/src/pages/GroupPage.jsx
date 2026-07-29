// frontend/src/pages/GroupPage.jsx

import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGroup, addMember, removeMember } from '../api/groups';
import { listBills } from '../api/bills';
import { getBalances } from '../api/balances';
import { createSettlement, listSettlements } from '../api/settlements';
import LoadingSpinner from '../components/LoadingSpinner';
import Skeleton from '../components/Skeleton';
import ErrorBanner from '../components/ErrorBanner';
import GroupMembersList from '../components/GroupMembersList';
import AddMemberForm from '../components/AddMemberForm';
import AddMembersModal from '../components/AddMembersModal';
import BillList from '../components/BillList';
import BalancesPanel from '../components/BalancesPanel';
import RecordSettlementForm from '../components/RecordSettlementForm';

export default function GroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [groupState, setGroupState] = useState({ data: null, loading: true, error: null });
  const [billsState, setBillsState] = useState({ data: null, loading: true, error: null });
  const [balancesState, setBalancesState] = useState({ data: null, loading: true, error: null });
  const [settlementsState, setSettlementsState] = useState({ data: null, loading: true, error: null });

  const [prefillSettlement, setPrefillSettlement] = useState(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [memberError, setMemberError] = useState(null);
  const hasPromptedRef = useRef(false);

  const fetchGroup = async () => {
    setGroupState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getGroup(groupId);
      setGroupState({ data, loading: false, error: null });
    } catch (err) {
      setGroupState({ data: null, loading: false, error: err.response?.data?.error || 'Failed to load group' });
    }
  };

  const fetchBills = async () => {
    setBillsState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await listBills(groupId);
      setBillsState({ data, loading: false, error: null });
    } catch (err) {
      setBillsState({ data: null, loading: false, error: err.response?.data?.error || 'Failed to load bills' });
    }
  };

  const fetchBalances = async () => {
    setBalancesState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getBalances(groupId);
      setBalancesState({ data, loading: false, error: null });
    } catch (err) {
      setBalancesState({ data: null, loading: false, error: err.response?.data?.error || 'Failed to load balances' });
    }
  };

  const fetchSettlements = async () => {
    setSettlementsState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await listSettlements(groupId);
      setSettlementsState({ data, loading: false, error: null });
    } catch (err) {
      setSettlementsState({ data: null, loading: false, error: err.response?.data?.error || 'Failed to load settlements' });
    }
  };

  useEffect(() => {
    fetchGroup();
    fetchBills();
    fetchBalances();
    fetchSettlements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    if (groupState.data && !hasPromptedRef.current) {
      hasPromptedRef.current = true;
      if (groupState.data.members.length <= 1) {
        setShowAddMembers(true);
      }
    }
  }, [groupState.data]);

  const handleAddMember = async (email) => {
    await addMember(groupId, { email });
    await fetchGroup();
  };

  const handleRemoveMember = async (member) => {
    setMemberError(null);
    if (!window.confirm(`Remove ${member.name} from this group?`)) return;
    try {
      await removeMember(groupId, member.id);
      await fetchGroup();
    } catch (err) {
      setMemberError(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleAddBillClick = () => {
    if ((groupState.data?.members.length || 0) <= 1) {
      setShowAddMembers(true);
    } else {
      navigate(`/groups/${groupId}/bills/new`);
    }
  };

  const handleRecordSettlement = async ({ paid_to, amount }) => {
    await createSettlement(groupId, { paid_to, amount });
    setPrefillSettlement(null);
    await Promise.all([fetchSettlements(), fetchBalances()]);
  };

  const membersById = new Map((groupState.data?.members || []).map((m) => [m.id, m]));

  if (groupState.loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <ErrorBanner message={groupState.error} />

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {groupState.data && (
          <div className="flex items-center gap-4">
            <span className="avatar h-12 w-12 text-xl">
              {groupState.data.group.name[0]?.toUpperCase() || '?'}
            </span>
            <div>
              <h1 className="mb-0">{groupState.data.group.name}</h1>
              <p className="text-sm text-muted">
                {groupState.data.members.length} member{groupState.data.members.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        )}
        <button type="button" className="btn btn-primary" onClick={handleAddBillClick}>
          + Add Bill
        </button>
      </div>

      {showAddMembers && groupState.data && (
        <AddMembersModal
          members={groupState.data.members}
          onAddMember={handleAddMember}
          onContinue={() => setShowAddMembers(false)}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="card p-6">
            <h2 className="mb-4">Bills</h2>
            <ErrorBanner message={billsState.error} />
            {billsState.loading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            ) : (
              billsState.data && <BillList bills={billsState.data.bills} />
            )}
          </div>

          <div className="card p-6">
            <h2 className="mb-4">Settlement History</h2>
            <ErrorBanner message={settlementsState.error} />
            {settlementsState.loading ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : settlementsState.data && settlementsState.data.settlements.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {settlementsState.data.settlements.map((s) => (
                  <li key={s.id} className="rounded-lg bg-surface-2 px-4 py-2.5 text-sm text-ink">
                    <span className="font-medium">{membersById.get(s.paid_by)?.name || 'Unknown'}</span> paid{' '}
                    <span className="font-medium">{membersById.get(s.paid_to)?.name || 'Unknown'}</span>{' '}
                    <span className="font-semibold text-accent">${s.amount}</span> on{' '}
                    {new Date(s.created_at).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No settlements recorded yet.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="card border-accent-soft-border p-6">
            <h2 className="mb-4">Balances</h2>
            <ErrorBanner message={balancesState.error} />
            {balancesState.loading ? (
              <div className="flex flex-col gap-2">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              balancesState.data && (
                <BalancesPanel
                  balances={balancesState.data.balances}
                  suggestedSettlements={balancesState.data.suggested_settlements}
                  currentUserId={user?.id}
                  onSelectSuggestion={setPrefillSettlement}
                />
              )
            )}
          </div>

          <div className="card p-6">
            <h2 className="mb-4">Members</h2>
            <ErrorBanner message={memberError} />
            {groupState.data && (
              <GroupMembersList
                members={groupState.data.members}
                currentUserId={user?.id}
                creatorId={groupState.data.group.created_by}
                onRemove={handleRemoveMember}
              />
            )}
            <div className="mt-4">
              <AddMemberForm onSubmit={handleAddMember} />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-4">Record a Settlement</h2>
            {groupState.data && (
              <RecordSettlementForm
                members={groupState.data.members}
                currentUserId={user?.id}
                prefill={prefillSettlement}
                onSubmit={handleRecordSettlement}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
