import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Leaf, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/auth';
import logo from '../assets/logo.png';
import '../styles/Admin.css';

function safeTarget(value) {
  if (!value || !value.startsWith('/admin') || value.startsWith('/admin/login')) {
    return '/admin/dashboard';
  }
  return value;
}

export default function AdminLoginPage() {
  const { user, signInAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const target = safeTarget(searchParams.get('redirect'));
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    document.title = 'Admin sign in · JH Soaps';
    return () => {
      document.title = 'JH Soaps';
    };
  }, []);

  if (isAdmin) return <Navigate to={target} replace />;

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const email = form.email.trim();
    if (!email || !form.password) {
      setError('Enter your admin email and password.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const data = await signInAdmin(email, form.password, form.remember);
      const role = data?.session?.user?.role;
      if (role !== 'admin' && role !== 'super_admin') {
        setError('This account does not have admin access.');
        return;
      }
      navigate(target, { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Sign in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page">
      <section className="admin-login-brand">
        <div className="admin-login-brand-inner">
          <Link to="/" className="admin-login-logo">
            <img src={logo} alt="JH Soaps" />
          </Link>
          <div>
            <p className="admin-login-kicker">
              <Leaf size={14} />
              JH Soaps
            </p>
            <h1>Store operations, naturally organised.</h1>
            <p>
              Manage orders, stock, customers and payments from one calm, focused
              workspace built for the JH Soaps team.
            </p>
          </div>
          <div className="admin-login-points">
            <span>
              <ShieldCheck size={17} />
              Admin-only, server-protected access
            </span>
            <span>
              <Leaf size={17} />
              Live inventory and order updates
            </span>
          </div>
        </div>
      </section>

      <section className="admin-login-panel">
        <form className="admin-login-card" onSubmit={handleSubmit} noValidate>
          <Link to="/" className="admin-login-back">
            <ArrowLeft size={15} />
            Back to storefront
          </Link>
          <div className="admin-login-heading">
            <span className="admin-login-badge">Admin console</span>
            <h2>Welcome back</h2>
            <p>Sign in with your JH Soaps administrator account.</p>
          </div>

          {user && !isAdmin ? (
            <p className="admin-login-note">
              You are signed in as a customer. Signing in here will switch this browser to
              an admin session.
            </p>
          ) : null}

          {error ? (
            <div className="admin-error" role="alert">
              {error}
            </div>
          ) : null}

          <label className="admin-field">
            <span className="admin-field-label">Email address</span>
            <span className="admin-input-wrap">
              <Mail size={17} />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="username"
                placeholder="admin@jhsoaps.com"
                required
              />
            </span>
          </label>

          <label className="admin-field">
            <span className="admin-field-label">Password</span>
            <span className="admin-input-wrap">
              <LockKeyhole size={17} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="admin-input-reveal"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          <label className="admin-check">
            <input
              type="checkbox"
              name="remember"
              checked={form.remember}
              onChange={handleChange}
            />
            <span>Keep me signed in on this device</span>
          </label>

          <button type="submit" className="admin-btn admin-btn--primary admin-login-submit" disabled={submitting}>
            {submitting ? <Loader2 size={17} className="admin-spin" /> : <ShieldCheck size={17} />}
            {submitting ? 'Signing in…' : 'Sign in to admin'}
          </button>

          <p className="admin-login-help">
            Admin access is issued by the store owner. Need an account? Ask a super admin to
            create one.
          </p>
        </form>
      </section>
    </div>
  );
}
