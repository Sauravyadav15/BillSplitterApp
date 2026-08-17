// frontend/src/pages/GroupPage.jsx

import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getGroup, addMember, removeMember } from '../api/groups';
import { listBills } from '../api/bills';
import { getBalances } from '../api/balances';
import { createSettlement, listSettlements } from '../api/settlements';
import LoadingSpinner from '../components/LoadingSpinner';
import Skeleton from '../components/Skeleton';
import ErrorBanner from '../components/ErrorBanner';
import GroupMembersList from '../components/GroupMembersList';
import GroupAvatarBadge from '../components/GroupAvatarBadge';
import UserAvatar from '../components/UserAvatar';
import AddMemberForm from '../components/AddMemberForm';
import AddMembersModal from '../components/AddMembersModal';
import BillList from '../components/BillList';
import ActivityFeed from '../components/ActivityFeed';
import SpendingByMemberChart from '../components/SpendingByMemberChart';
import BalancesPanel from '../components/BalancesPanel';
import RecordSettlementForm from '../components/RecordSettlementForm';
import StatTile from '../components/StatTile';

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-5a2 2 0 1 0 0 4h5" />
  </svg>
);
const ReceiptIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm2 5h8M8 11h8M8 14h5" />
  </svg>
);
const StackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 9 4.5-9 4.5-9-4.5L12 3Zm-9 9 9 4.5 9-4.5M3 16.5 12 21l9-4.5" />
  </svg>
);

export default function GroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

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
    showToast('Member added to the group');
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
    const balanceBefore = myBalance;
    await createSettlement(groupId, { paid_to, amount });
    setPrefillSettlement(null);
    const [, balancesData] = await Promise.all([fetchSettlements(), getBalances(groupId)]);
    setBalancesState({ data: balancesData, loading: false, error: null });

    // A special moment worth calling out distinctly from the routine
    // confirmation toast: this settlement brought the balance from
    // non-zero to (about) zero, i.e. it's the one that actually finished
    // clearing things up - not just "was already zero" (a brand-new group
    // with no bills is trivially zero too, and shouldn't get a fake
    // celebration on a page that hasn't changed anything).
    const balanceAfter = Number(balancesData.balances.find((b) => b.user_id === user?.id)?.net_balance || 0);
    if (Math.abs(balanceBefore) >= 0.01 && Math.abs(balanceAfter) < 0.01) {
      showToast("You're all settled up!", { tone: 'celebration', icon: '🎉' });
    } else {
      showToast('Settlement recorded');
    }
  };

  const membersById = new Map((groupState.data?.members || []).map((m) => [m.id, m]));
  const totalSpent = (billsState.data?.bills || []).reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const myBalance = Number(
    balancesState.data?.balances.find((b) => b.user_id === user?.id)?.net_balance || 0
  );
  const billCount = billsState.data?.bills.length || 0;

  if (groupState.loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <ErrorBanner message={groupState.error} />

      <div
        className="reveal mb-6 flex flex-col gap-6 rounded-2xl border border-border p-6 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between sm:p-8"
        style={{ backgroundImage: 'linear-gradient(135deg, var(--accent-bg), transparent 65%)' }}
      >
        {groupState.data && (
          <div className="flex min-w-0 items-center gap-4">
            <GroupAvatarBadge group={groupState.data.group} className="h-14 w-14 shrink-0 text-2xl" />
            <div className="min-w-0">
              <h1 className="mb-1.5 truncate">{groupState.data.group.name}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex -space-x-2">
                  {groupState.data.members.slice(0, 5).map((m) => (
                    <UserAvatar key={m.id} user={m} className="h-7 w-7 text-[10px] ring-2 ring-surface" />
                  ))}
                  {groupState.data.members.length > 5 && (
                    <span className="avatar h-7 w-7 bg-surface-2 text-[10px] text-muted ring-2 ring-surface" style={{ backgroundImage: 'none' }}>
                      +{groupState.data.members.length - 5}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted">
                  {groupState.data.members.length} member{groupState.data.members.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </div>
        )}
        <button type="button" className="btn btn-primary shrink-0 sm:self-start" onClick={handleAddBillClick}>
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

      {/* Bento stats row - the group's story at a glance before anything else. */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          icon={<WalletIcon />}
          label="Your balance"
          value={myBalance}
          tone={myBalance > 0 ? 'positive' : myBalance < 0 ? 'negative' : 'default'}
          delay={0}
        />
        <StatTile icon={<ReceiptIcon />} label="Total spent" value={totalSpent} delay={70} />
        <StatTile icon={<StackIcon />} label="Bills" value={billCount} prefix="" decimals={0} delay={140} />
      </div>

      {/* Balances - promoted above the bills gallery since "who owes what" is
          the thing people open a group for. */}
      <div className="reveal card border-accent-soft-border mb-6 p-6" style={{ animationDelay: '180ms' }}>
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
              members={groupState.data?.members}
              currentUserId={user?.id}
              onSelectSuggestion={setPrefillSettlement}
            />
          )
        )}
      </div>

      {/* Spending by member - a raw-activity view ("who's been fronting the
          money") distinct from Balances' net-owed view above. */}
      {billsState.data?.bills.length > 0 && (
        <div className="reveal card mb-6 p-6" style={{ animationDelay: '195ms' }}>
          <h2 className="mb-4">Spending by Member</h2>
          <SpendingByMemberChart bills={billsState.data.bills} members={groupState.data?.members || []} />
        </div>
      )}

      {/* Recent activity - what's actually been happening, not just the
          current-state snapshot the Balances/Bills cards show. */}
      <div className="reveal card mb-6 p-6" style={{ animationDelay: '210ms' }}>
        <h2 className="mb-4">Recent Activity</h2>
        <ErrorBanner message={billsState.error || settlementsState.error} />
        {billsState.loading || settlementsState.loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          billsState.data &&
          settlementsState.data && (
            <ActivityFeed
              groupId={groupId}
              bills={billsState.data.bills}
              settlements={settlementsState.data.settlements}
              membersById={membersById}
              currentUserId={user?.id}
            />
          )
        )}
      </div>

      {/* Bills gallery - full-width now instead of squeezed into a 2/3
          column, so receipts get room to breathe. */}
      <div className="reveal card mb-6 p-6" style={{ animationDelay: '240ms' }}>
        <div className="mb-4 flex items-center justify-between">
          <h2>Bills</h2>
          {billsState.data?.bills.length > 0 && (
            <span className="text-xs font-semibold text-muted">
              {billsState.data.bills.length} bill{billsState.data.bills.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <ErrorBanner message={billsState.error} />
        {billsState.loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
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

      {/* Members + settlements, paired at the bottom - reference info you
          check less often than balances/bills. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="reveal card p-6" style={{ animationDelay: '300ms' }}>
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

        <div className="flex flex-col gap-6">
          <div className="reveal card p-6" style={{ animationDelay: '340ms' }}>
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

          <div className="reveal card p-6" style={{ animationDelay: '380ms' }}>
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
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg bg-surface-2 px-4 py-2.5 text-sm text-ink"
                  >
                    <UserAvatar user={membersById.get(s.paid_by)} className="h-6 w-6 text-[9px]" />
                    <span className="font-medium">{membersById.get(s.paid_by)?.name || 'Unknown'}</span>
                    <span className="text-muted">paid</span>
                    <UserAvatar user={membersById.get(s.paid_to)} className="h-6 w-6 text-[9px]" />
                    <span className="font-medium">{membersById.get(s.paid_to)?.name || 'Unknown'}</span>
                    <span className="font-semibold text-accent">${s.amount}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No settlements recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
