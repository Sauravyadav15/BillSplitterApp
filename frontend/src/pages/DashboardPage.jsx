// frontend/src/pages/DashboardPage.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listGroups, createGroup } from '../api/groups';
import { getMyBalanceSummary } from '../api/balances';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import BalanceSummaryCard from '../components/BalanceSummaryCard';
import GroupAvatarBadge from '../components/GroupAvatarBadge';
import CreateGroupModal from '../components/CreateGroupModal';

function firstName(name) {
  if (!name) return '';
  return name.trim().split(/\s+/)[0];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listGroups();
      setGroups(data.groups);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const data = await getMyBalanceSummary();
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchSummary();
  }, []);

  const handleCreate = async ({ name, icon, color_theme }) => {
    const data = await createGroup({ name, icon, color_theme });
    setShowCreateModal(false);
    navigate(`/groups/${data.group.id}`);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <div className="mb-6">
        <h1 className="mb-1">
          Hi <span className="text-gradient">{firstName(user?.name) || 'there'}</span>,
        </h1>
        <p className="text-text">Welcome back.</p>
      </div>

      <div className="mb-8">
        {(summaryLoading || summary) && <BalanceSummaryCard summary={summary} loading={summaryLoading} />}
      </div>

      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="mb-1">My Groups</h2>
          <p className="text-text">Everything you're splitting, in one place.</p>
        </div>
        <button type="button" className="btn btn-primary whitespace-nowrap" onClick={() => setShowCreateModal(true)}>
          + Create
        </button>
      </div>

      {showCreateModal && (
        <CreateGroupModal onCreate={handleCreate} onClose={() => setShowCreateModal(false)} />
      )}

      <ErrorBanner message={error} />

      {groups.length === 0 ? (
        <div className="card mt-4 flex flex-col items-center gap-2 border-dashed py-16 text-center">
          <p className="text-lg font-medium text-ink">No groups yet</p>
          <p className="text-text">Create one above to start splitting bills.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => navigate(`/groups/${group.id}`)}
              className="card card-hover flex flex-col gap-4 p-6 text-left"
            >
              <GroupAvatarBadge group={group} className="h-11 w-11 text-lg" />
              <div>
                <p className="font-heading text-lg font-semibold text-ink">{group.name}</p>
                <p className="text-sm text-muted">
                  Created {new Date(group.created_at).toLocaleDateString()}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
