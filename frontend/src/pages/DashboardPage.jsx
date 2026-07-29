// frontend/src/pages/DashboardPage.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listGroups, createGroup } from '../api/groups';
import { getMyBalanceSummary } from '../api/balances';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import BalanceSummaryCard from '../components/BalanceSummaryCard';

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

  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

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

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const data = await createGroup({ name: newGroupName });
      setNewGroupName('');
      navigate(`/groups/${data.group.id}`);
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create group');
    } finally {
      setCreating(false);
    }
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
        <form className="flex items-center gap-2" onSubmit={handleCreate}>
          <input
            className="input sm:w-56"
            type="text"
            placeholder="New group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            minLength={3}
            required
          />
          <button type="submit" className="btn btn-primary whitespace-nowrap" disabled={creating}>
            {creating ? 'Creating...' : '+ Create'}
          </button>
        </form>
      </div>

      <ErrorBanner message={error} />
      <ErrorBanner message={createError} />

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
              <span className="avatar h-11 w-11 text-lg">{group.name[0]?.toUpperCase() || '?'}</span>
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
