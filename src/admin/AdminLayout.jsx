import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  CreditCard,
  Image,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Package,
  Plus,
  Settings,
  ShoppingBag,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/auth';
import logo from '../assets/logo.png';
import '../styles/Admin.css';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package, end: true },
  { to: '/admin/products/new', label: 'Add Product', icon: Plus, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { to: '/admin/hero', label: 'Hero Section', icon: Image },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
];

const PAGE_META = [
  {
    match: /^\/admin\/orders/,
    title: 'Orders',
    subtitle: 'Review, fulfil and update every customer order.',
  },
  {
    match: /^\/admin\/products\/new/,
    title: 'Add Product',
    subtitle: 'Create a new JH Soaps product with pricing, stock and imagery.',
  },
  {
    match: /^\/admin\/products/,
    title: 'Products',
    subtitle: 'Manage the catalogue, pricing and storefront visibility.',
  },
  {
    match: /^\/admin\/hero/,
    title: 'Hero Section',
    subtitle: 'Edit the homepage banner, imagery and calls to action.',
  },
  {
    match: /^\/admin\/settings/,
    title: 'Settings',
    subtitle: 'Store configuration, upload policy and admin shortcuts.',
  },
  {
    match: /^\/admin\/customers/,
    title: 'Customers',
    subtitle: 'Customer profiles, contact details and order history.',
  },
  {
    match: /^\/admin\/inventory/,
    title: 'Inventory',
    subtitle: 'Stock levels, low-stock alerts and manual adjustments.',
  },
  {
    match: /^\/admin\/payments/,
    title: 'Payments',
    subtitle: 'Cash-on-delivery and Razorpay transaction activity.',
  },
  {
    match: /^\/admin\/reports/,
    title: 'Reports',
    subtitle: 'Sales performance, best sellers and payment breakdown.',
  },
  {
    match: /^\/admin(?:\/dashboard)?\/?$/,
    title: 'Dashboard',
    subtitle: 'A live view of the JH Soaps store.',
  },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const meta =
    PAGE_META.find((entry) => entry.match.test(location.pathname)) || PAGE_META[0];

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onUnauthorized = async () => {
      try {
        await signOut();
      } finally {
        navigate('/admin/login', { replace: true });
      }
    };
    window.addEventListener('admin:unauthorized', onUnauthorized);
    return () => window.removeEventListener('admin:unauthorized', onUnauthorized);
  }, [navigate, signOut]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate('/admin/login', { replace: true });
    }
  };

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar${mobileOpen ? ' is-open' : ''}`}>
        <div className="admin-brand">
          <img src={logo} alt="JH Soaps" />
          <div>
            <span>JH Soaps</span>
            <small>Admin console</small>
          </div>
          <button
            type="button"
            className="admin-sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="admin-nav" aria-label="Admin sections">
          <p className="admin-nav-label">Manage</p>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <div className="admin-user-card">
            <span className="admin-user-avatar">
              {(user?.user_metadata?.full_name || user?.email || 'A').slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user?.user_metadata?.full_name || 'Administrator'}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <Link className="admin-store-link" to="/">
            <ArrowLeft size={15} />
            View storefront
          </Link>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="admin-sidebar-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>
          <div className="admin-page-heading">
            <div className="admin-eyebrow">
              <Leaf size={13} />
              JH Soaps · natural care
            </div>
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
          </div>
          <div className="admin-topbar-actions">
            <span className="admin-role-pill">{user?.role === 'super_admin' ? 'Super admin' : 'Admin'}</span>
            <button type="button" className="admin-btn admin-btn--ghost" onClick={handleSignOut}>
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
