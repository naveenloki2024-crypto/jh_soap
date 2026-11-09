import { Link } from 'react-router-dom';
import { Boxes, ExternalLink, Image, Package, ShieldCheck, Upload } from 'lucide-react';
import { useAuth } from '../../context/auth';

const SHORTCUTS = [
  {
    to: '/admin/hero',
    icon: Image,
    title: 'Hero Section',
    text: 'Edit the homepage headline, banner images and calls to action.',
  },
  {
    to: '/admin/products',
    icon: Package,
    title: 'Products',
    text: 'Review the catalogue, prices, stock and product imagery.',
  },
  {
    to: '/admin/inventory',
    icon: Boxes,
    title: 'Inventory',
    text: 'Adjust stock levels and watch for low-stock items.',
  },
];

export default function AdminSettings() {
  const { user } = useAuth();

  return (
    <div className="admin-page">
      <div className="admin-page-toolbar">
        <div>
          <span className="admin-section-kicker">Configuration</span>
          <h2>Settings</h2>
        </div>
        <Link className="admin-btn admin-btn--ghost" to="/" target="_blank" rel="noreferrer">
          <ExternalLink size={16} />
          View storefront
        </Link>
      </div>

      <div className="admin-settings-grid">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Store content shortcuts</h3>
              <p>Jump straight to the areas that update the customer website.</p>
            </div>
          </div>
          <div className="admin-settings-list">
            {SHORTCUTS.map(({ to, icon: Icon, title, text }) => (
              <Link key={to} className="admin-settings-link" to={to}>
                <span className="admin-settings-icon">
                  <Icon size={18} strokeWidth={1.7} />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Image upload policy</h3>
              <p>Applied to product and homepage hero uploads.</p>
            </div>
          </div>
          <div className="admin-settings-body">
            <div className="admin-settings-row">
              <Upload size={17} strokeWidth={1.7} />
              <div>
                <strong>Accepted formats</strong>
                <small>JPG, JPEG, PNG and WEBP (GIF is also accepted for existing flows).</small>
              </div>
            </div>
            <div className="admin-settings-row">
              <ShieldCheck size={17} strokeWidth={1.7} />
              <div>
                <strong>Maximum file size</strong>
                <small>5 MB per image. Files are validated by type and signature.</small>
              </div>
            </div>
            <div className="admin-settings-row">
              <Image size={17} strokeWidth={1.7} />
              <div>
                <strong>Storage</strong>
                <small>
                  Images are written to the project upload storage and MongoDB only stores the public
                  image URL.
                </small>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Signed-in administrator</h3>
              <p>Your current JH Soaps admin session.</p>
            </div>
          </div>
          <div className="admin-settings-body">
            <div className="admin-settings-row">
              <ShieldCheck size={17} strokeWidth={1.7} />
              <div>
                <strong>{user?.user_metadata?.full_name || 'Administrator'}</strong>
                <small>{user?.email || '—'}</small>
              </div>
            </div>
            <div className="admin-settings-row">
              <ShieldCheck size={17} strokeWidth={1.7} />
              <div>
                <strong>Role</strong>
                <small>{user?.role === 'super_admin' ? 'Super admin' : 'Admin'}</small>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
