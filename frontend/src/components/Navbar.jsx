// frontend/src/components/Navbar.jsx

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useHideOnScroll from '../hooks/useHideOnScroll';
import UserAvatar from './UserAvatar';

export default function Navbar() {
  const { user, logout } = useAuth();
  const visible = useHideOnScroll();

  return (
    <nav
      className="full-bleed-sticky z-40 rounded-b-2xl border-b border-border bg-surface/80 shadow-md backdrop-blur-md transition-transform duration-300"
      style={{ transform: visible ? 'translateY(0)' : 'translateY(-100%)' }}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
        <Link to="/dashboard" className="flex items-center gap-2.5 font-heading text-xl font-semibold">
          <img src="/icon-64.png" alt="Smart Bill Split" className="h-8 w-8 rounded-lg" />
          {/* Hidden below sm: "Smart Bill Split" has nowhere to fit next to
              the icon and the Home/Logout pill on a phone-width screen
              without wrapping onto a second line, which nearly doubled the
              navbar's height. Icon-only is the standard mobile-nav pattern
              for exactly this squeeze. */}
          <span className="hidden text-gradient sm:inline">Smart Bill Split</span>
        </Link>

        <div className="flex items-center gap-4">
          {user && (
            <Link
              to="/profile"
              className="hidden items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-2 sm:flex"
            >
              <UserAvatar user={user} className="h-8 w-8 text-xs" />
              <span className="text-sm text-text">{user.name}</span>
            </Link>
          )}

          <div className="flex items-center gap-1 rounded-xl border border-border p-1">
            <Link to="/dashboard" className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3 11 9-8 9 8M5 10v10h5v-6h4v6h5V10" />
              </svg>
              Home
            </Link>
            <button onClick={logout} className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
