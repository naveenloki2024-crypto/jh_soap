import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Package, UserRound } from 'lucide-react';
import { useAuth } from '../context/auth';

function initialsOf(name, email) {
  const source = String(name || email || '').trim();
  if (!source) return 'JH';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** Shared shell for the protected account pages (profile, orders). */
export default function AccountLayout() {
  const { displayName, user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <main className="account-page">
      <div className="account-shell">
        <aside className="account-sidebar">
          <div className="account-identity">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="account-identity-avatar" />
            ) : (
              <span className="account-identity-avatar account-identity-avatar--initials" aria-hidden="true">
                {initialsOf(displayName, user?.email)}
              </span>
            )}
            <span className="account-identity-name">{displayName}</span>
            <span className="account-identity-email">{user?.email}</span>
          </div>

          <nav className="account-nav" aria-label="Account">
            <NavLink
              to="/account"
              end
              className={({ isActive }) => `account-nav-link${isActive ? ' active' : ''}`}
            >
              <UserRound size={17} strokeWidth={1.5} aria-hidden="true" />
              My profile
            </NavLink>
            <NavLink
              to="/account/orders"
              className={({ isActive }) => `account-nav-link${isActive ? ' active' : ''}`}
            >
              <Package size={17} strokeWidth={1.5} aria-hidden="true" />
              My orders
            </NavLink>
          </nav>

          <button type="button" className="account-signout" onClick={handleSignOut}>
            <LogOut size={16} strokeWidth={1.5} aria-hidden="true" />
            Sign out
          </button>
        </aside>

        <div className="account-content">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
