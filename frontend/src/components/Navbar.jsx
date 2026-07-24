// frontend/src/components/Navbar.jsx

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4 shadow-sm">
      <Link to="/" className="flex items-center gap-2.5 font-heading text-xl font-semibold text-ink">
        <span className="avatar h-8 w-8 text-sm">B</span>
        BillSplit
      </Link>
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2.5">
            <span className="avatar h-8 w-8 text-xs">{initials(user.name)}</span>
            <span className="hidden text-sm text-text sm:inline">{user.name}</span>
          </div>
        )}
        <button onClick={handleLogout} className="btn btn-ghost !rounded-full !px-4 !py-1.5 text-xs">
          Logout
        </button>
      </div>
    </nav>
  );
}
