// frontend/src/pages/ProfilePage.jsx

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateAvatar } from '../api/me';
import { parseHeroSeed } from '../utils/avatars';
import { HERO_AVATAR_COUNT } from '../components/HeroAvatar';
import UserAvatar from '../components/UserAvatar';
import AvatarPicker from '../components/AvatarPicker';
import ErrorBanner from '../components/ErrorBanner';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const initialSeed = parseHeroSeed(user?.avatar);
  const [avatarSeed, setAvatarSeed] = useState(() =>
    initialSeed !== null ? initialSeed : Math.floor(Math.random() * HERO_AVATAR_COUNT)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const hasChanges = avatarSeed !== initialSeed;

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const data = await updateAvatar(`hero-${avatarSeed}`);
      updateUser({ avatar: data.user.avatar });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update avatar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 sm:px-10">
      <Link to="/dashboard" className="btn btn-secondary mb-4 !px-4 !py-2 text-sm">
        &larr; Back to dashboard
      </Link>

      <h1 className="mb-6">Your Profile</h1>

      <div className="reveal card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-4">
          <UserAvatar user={{ ...user, avatar: `hero-${avatarSeed}` }} className="h-16 w-16 text-xl" />
          <div className="min-w-0">
            <p className="truncate font-heading text-lg font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-sm text-muted">{user?.email}</p>
          </div>
        </div>

        <ErrorBanner message={error} />
        {saved && (
          <div className="my-2.5 flex items-center gap-2 rounded-lg border border-positive-border bg-positive-bg px-3.5 py-2.5 text-sm font-medium text-positive [animation:fade-in_0.25s_ease]">
            <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-positive text-[11px] font-bold text-accent-contrast">
              &#10003;
            </span>
            Avatar updated.
          </div>
        )}

        <AvatarPicker value={avatarSeed} onChange={setAvatarSeed} />

        <button
          type="button"
          className="btn btn-primary mt-5 w-full"
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? 'Saving...' : 'Save avatar'}
        </button>
      </div>
    </div>
  );
}
