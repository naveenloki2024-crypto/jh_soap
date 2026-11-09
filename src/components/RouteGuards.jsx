import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { getRedirectTarget } from '../utils/redirect';
import BrandLoader from './BrandLoader';

/**
 * Wraps customer-only pages. While the session is being resolved it shows the
 * brand loader (real state, never an artificial delay); unauthenticated users
 * are sent to login and returned to the page they asked for afterwards.
 */
export function RequireAuth({ children }) {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <BrandLoader label="Checking your session" />;
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return children;
}

/** Protects the admin area. Customers are sent to the admin sign-in screen. */
export function RequireAdmin({ children }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <BrandLoader label="Checking admin access" />;
  }

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return children;
}

/** Keeps signed-in customers away from login/register, honouring ?redirect=. */
export function GuestOnly({ children }) {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <BrandLoader label="Checking your session" />;
  }

  if (isAuthenticated) {
    return <Navigate to={getRedirectTarget(location.search)} replace />;
  }

  return children;
}
