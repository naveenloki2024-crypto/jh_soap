import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, LogOut, Package, UserRound } from 'lucide-react';
import { useAuth } from '../context/auth';
import { loginPath } from '../utils/redirect';
import { useLanguage } from '../context/LanguageContext';

function initialsOf(name, email) {
  const source = String(name || email || '').trim();
  if (!source) return 'JH';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

const AccountMenu = () => {
  const { status, isAuthenticated, displayName, profile, user, signOut } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  if (status === 'loading') {
    return <span className="account-skeleton" aria-hidden="true" />;
  }

  const currentPath = `${location.pathname}${location.search}`;

  if (!isAuthenticated) {
    return (
      <div className="account-menu" ref={wrapRef}>
        <button
          type="button"
          className="icon-btn"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('common.account')}
          onClick={() => setOpen((value) => !value)}
        >
          <User size={20} strokeWidth={1.5} />
        </button>

        {open && (
          <div className="account-dropdown" role="menu" aria-label={t('accountMenu.accountMenu')}>
            <p className="account-dropdown-caption">{t('accountMenu.welcome')}</p>
            <Link
              to={loginPath(currentPath)}
              role="menuitem"
              className="account-item account-item--primary"
              onClick={() => setOpen(false)}
            >
              {t('accountMenu.signIn')}
            </Link>
            <Link
              to="/register"
              role="menuitem"
              className="account-item"
              onClick={() => setOpen(false)}
            >
              {t('accountMenu.createAccount')}
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="account-menu" ref={wrapRef}>
      <button
        type="button"
        className="account-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('accountMenu.accountMenu')}
        onClick={() => setOpen((value) => !value)}
      >
        {profile?.avatarUrl ? (
          <img src={profile.avatarUrl} alt="" className="account-avatar" />
        ) : (
          <span className="account-avatar account-avatar--initials" aria-hidden="true">
            {initialsOf(displayName, user?.email)}
          </span>
        )}
        <span className="account-trigger-name">{displayName}</span>
      </button>

      {open && (
        <div className="account-dropdown" role="menu" aria-label={t('accountMenu.accountMenu')}>
          <div className="account-dropdown-header">
            <span className="account-dropdown-name">{displayName}</span>
            <span className="account-dropdown-email">{user?.email || user?.phone}</span>
          </div>
          <Link to="/account" role="menuitem" className="account-item" onClick={() => setOpen(false)}>
            <UserRound size={16} strokeWidth={1.5} aria-hidden="true" />
            {t('accountMenu.myProfile')}
          </Link>
          <Link
            to="/account/orders"
            role="menuitem"
            className="account-item"
            onClick={() => setOpen(false)}
          >
            <Package size={16} strokeWidth={1.5} aria-hidden="true" />
            {t('accountMenu.myOrders')}
          </Link>
          <button type="button" role="menuitem" className="account-item" onClick={handleSignOut}>
            <LogOut size={16} strokeWidth={1.5} aria-hidden="true" />
            {t('accountMenu.signOut')}
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;
