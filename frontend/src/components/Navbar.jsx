// frontend/src/components/Navbar.jsx

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import useHideOnScroll from '../hooks/useHideOnScroll';
import UserAvatar from './UserAvatar';

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 sm:h-4 sm:w-4">
    <circle cx="12" cy="12" r="4" />
    <path
      strokeLinecap="round"
      d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
    />
  </svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 sm:h-4 sm:w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </svg>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const visible = useHideOnScroll();

  return (
    <nav
      className="full-bleed-sticky z-40 rounded-b-2xl border-b border-border bg-surface/80 shadow-md backdrop-blur-md transition-transform duration-300"
      style={{ transform: visible ? 'translateY(0)' : 'translateY(-100%)' }}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        {/* Scales down instead of hiding on mobile - shrinking the icon and
            the Home/Logout pill alongside it keeps it on one line on most
            phone widths without dropping the name entirely. min-w-0 +
            truncate on the text (rather than shrink-0 + whitespace-nowrap
            on the whole link) is the difference between an ellipsis and a
            real horizontal-scroll bug on a narrower device or a longer
            display name next to it - the link can now actually shrink
            instead of forcing the whole page wider when there truly isn't
            room for both sides. */}
        <Link
          to="/dashboard"
          className="flex min-w-0 items-center gap-1.5 font-heading text-base font-semibold sm:gap-2.5 sm:text-xl"
        >
          <img src="/icon-64.png" alt="Smart Bill Split" className="h-7 w-7 shrink-0 rounded-lg sm:h-8 sm:w-8" />
          <span className="truncate text-gradient">Smart Bill Split</span>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          {user && (
            <Link
              to="/profile"
              className="hidden items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-2 sm:flex"
            >
              <UserAvatar user={user} className="h-8 w-8 text-xs" />
              <span className="text-sm text-text">{user.name}</span>
            </Link>
          )}

          <div className="flex items-center gap-0.5 rounded-xl border border-border p-1 sm:gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="btn btn-ghost !rounded-lg !p-1.5 sm:!p-2"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <Link to="/dashboard" className="btn btn-ghost !rounded-lg !px-2 !py-1 text-xs sm:!px-3 sm:!py-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 sm:h-4 sm:w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3 11 9-8 9 8M5 10v10h5v-6h4v6h5V10" />
              </svg>
              Home
            </Link>
            <button onClick={logout} className="btn btn-ghost !rounded-lg !px-2 !py-1 text-xs sm:!px-3 sm:!py-1.5">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
