import { Leaf } from 'lucide-react';
import logo from '../assets/logo.png';

/**
 * Premium split layout shared by the auth pages: a botanical brand panel and
 * the form card. Collapses to a single column on small screens.
 */
export default function AuthLayout({ eyebrow, title, subtitle, children, footer }) {
  return (
    <section className="auth-page">
      <div className="auth-shell">
        <aside className="auth-aside">
          <span className="auth-aside-mark" aria-hidden="true">
            <Leaf size={120} strokeWidth={0.75} />
          </span>
          <div className="auth-aside-content">
            <img src={logo} alt="JH Soap" className="auth-aside-logo" />
            <h2 className="auth-aside-title">Handmade herbal care, made slowly with nature.</h2>
            <ul className="auth-aside-list">
              <li>
                <Leaf size={15} strokeWidth={1.75} aria-hidden="true" />
                Pure herbs, no harsh chemicals
              </li>
              <li>
                <Leaf size={15} strokeWidth={1.75} aria-hidden="true" />
                Track your orders in one place
              </li>
              <li>
                <Leaf size={15} strokeWidth={1.75} aria-hidden="true" />
                Any 3 soaps for ₹285
              </li>
            </ul>
          </div>
        </aside>

        <div className="auth-panel">
          <div className="auth-panel-inner">
            {eyebrow && <span className="auth-eyebrow">{eyebrow}</span>}
            <h1 className="auth-title">{title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
            {children}
            {footer && <div className="auth-panel-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
