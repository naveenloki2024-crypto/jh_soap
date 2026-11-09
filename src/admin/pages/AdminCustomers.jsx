import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  Loader2,
  MailCheck,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import {
  deleteAdminCustomer,
  getAdminCustomer,
  getAdminCustomers,
  updateAdminCustomer,
} from '../../api/admin';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  orderStatusLabel,
  orderStatusTone,
} from '../adminUtils';
import {
  AdminBadge,
  AdminEmptyState,
  AdminError,
  AdminField,
  AdminModal,
  AdminPagination,
  AdminSpinner,
} from '../components/AdminUI';

function CustomerDetail({ id, onClose, onChanged }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAdminCustomer(id);
      setData(response);
      setForm({
        name: response.customer.name || '',
        email: response.customer.email || '',
        phone: response.customer.phone || '',
      });
    } catch (requestError) {
      setError(requestError.message || 'Could not load this customer.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (form.name.trim().length < 2) {
      setError('Customer name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await updateAdminCustomer(id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setData((prev) => ({ ...prev, customer: response.customer }));
      setEditing(false);
      setNotice('Customer details updated.');
      onChanged?.();
    } catch (requestError) {
      setError(requestError.message || 'Could not update this customer.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!data) return;
    const confirmed = window.confirm(
      `Delete customer ${data.customer.name}? This is only possible when they have no orders.`,
    );
    if (!confirmed) return;
    setSaving(true);
    setError('');
    try {
      await deleteAdminCustomer(id);
      onChanged?.();
      onClose();
    } catch (requestError) {
      setError(requestError.message || 'Could not delete this customer.');
      setSaving(false);
    }
  };

  return (
    <AdminModal
      title={data ? data.customer.name || 'Customer' : 'Customer details'}
      subtitle={data ? `Joined ${formatDate(data.customer.createdAt)}` : 'Loading customer…'}
      onClose={onClose}
      size="lg"
      footer={
        data ? (
          <div className="admin-modal-actions admin-modal-actions--split">
            <button
              type="button"
              className="admin-btn admin-btn--danger-ghost"
              onClick={handleDelete}
              disabled={saving || data.customer.orderCount > 0}
              title={data.customer.orderCount > 0 ? 'Customers with orders cannot be deleted' : ''}
            >
              <Trash2 size={16} />
              Delete customer
            </button>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => {
                  setEditing((value) => !value);
                  setError('');
                }}
                disabled={saving}
              >
                <Pencil size={15} />
                {editing ? 'Cancel edit' : 'Edit details'}
              </button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : null
      }
    >
      {loading ? <AdminSpinner label="Loading customer" /> : null}
      <AdminError message={error} onRetry={!data ? load : undefined} />
      {notice ? <p className="admin-success">{notice}</p> : null}

      {data ? (
        <>
          <div className="admin-customer-hero">
            <span className="admin-customer-avatar">
              {(data.customer.name || 'C').slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h3>{data.customer.name}</h3>
              <p>{data.customer.email || 'No email address'}</p>
              <div className="admin-inline-badges">
                {data.customer.emailVerified ? (
                  <AdminBadge tone="done">
                    <MailCheck size={12} /> Email verified
                  </AdminBadge>
                ) : (
                  <AdminBadge tone="muted">Email unverified</AdminBadge>
                )}
                {data.customer.phoneVerified ? (
                  <AdminBadge tone="done">Phone verified</AdminBadge>
                ) : null}
              </div>
            </div>
            <div className="admin-customer-metrics">
              <div>
                <strong>{formatNumber(data.customer.orderCount)}</strong>
                <span>Orders</span>
              </div>
              <div>
                <strong>{formatNumber(data.customer.addressCount)}</strong>
                <span>Addresses</span>
              </div>
            </div>
          </div>

          {editing ? (
            <form className="admin-detail-block admin-form-stack" onSubmit={handleSave}>
              <h3>Edit contact details</h3>
              <div className="admin-form-grid">
                <AdminField label="Full name">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, name: event.target.value }));
                      setError('');
                    }}
                    maxLength={120}
                  />
                </AdminField>
                <AdminField label="Email address">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, email: event.target.value }));
                      setError('');
                    }}
                    maxLength={200}
                  />
                </AdminField>
                <AdminField label="Phone">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, phone: event.target.value }));
                      setError('');
                    }}
                    maxLength={15}
                  />
                </AdminField>
              </div>
              <div className="admin-modal-actions">
                <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
                  {saving ? <Loader2 size={15} className="admin-spin" /> : null}
                  Save customer
                </button>
              </div>
            </form>
          ) : (
            <div className="admin-detail-grid">
              <section className="admin-detail-block">
                <h3>Contact</h3>
                <p>
                  <Phone size={14} /> {data.customer.phone || 'No phone number'}
                </p>
                <p>
                  <UserRound size={14} /> {data.customer.name}
                </p>
                {data.customer.defaultAddress ? (
                  <>
                    <h4>Default address</h4>
                    <p>
                      {[
                        data.customer.defaultAddress.address,
                        data.customer.defaultAddress.area,
                        data.customer.defaultAddress.city,
                        data.customer.defaultAddress.district,
                        data.customer.defaultAddress.state,
                        data.customer.defaultAddress.pincode,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </>
                ) : (
                  <p className="admin-muted">No saved address.</p>
                )}
                <h4>Activity</h4>
                <p>Last login: {formatDateTime(data.customer.lastLoginAt)}</p>
                <p>Customer since: {formatDate(data.customer.createdAt)}</p>
              </section>

              <section className="admin-detail-block">
                <h3>Order history</h3>
                {data.orders.length ? (
                  <ul className="admin-customer-orders">
                    {data.orders.map((order) => (
                      <li key={order.id}>
                        <div>
                          <strong>{order.orderNumber}</strong>
                          <small>{formatDateTime(order.createdAt)}</small>
                        </div>
                        <AdminBadge tone={orderStatusTone(order.orderStatus)}>
                          {orderStatusLabel(order.orderStatus)}
                        </AdminBadge>
                        <span>{formatCurrency(order.pricing?.total)}</span>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => {
                            onClose();
                            navigate(`/admin/orders?order=${order.id}`);
                          }}
                          aria-label={`Open order ${order.orderNumber}`}
                        >
                          <Eye size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="admin-muted">This customer has not placed an order yet.</p>
                )}
              </section>
            </div>
          )}
        </>
      ) : null}
    </AdminModal>
  );
}

export default function AdminCustomers() {
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminCustomers({ page, limit: 15, q: appliedQuery });
      setCustomers(data.customers || []);
      setPagination(data.pagination || null);
    } catch (requestError) {
      setError(requestError.message || 'Could not load customers.');
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="admin-page">
      <div className="admin-page-toolbar">
        <div>
          <span className="admin-section-kicker">Relationships</span>
          <h2>Customers</h2>
        </div>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'admin-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="admin-filter-bar">
        <form
          className="admin-search"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setAppliedQuery(query.trim());
          }}
        >
          <Search size={17} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email or phone"
            aria-label="Search customers"
          />
          <button type="submit" className="admin-btn admin-btn--primary admin-btn--sm">
            Search
          </button>
        </form>
      </div>

      <AdminError message={error} onRetry={load} />

      <section className="admin-panel">
        {loading && !customers.length ? (
          <AdminSpinner label="Loading customers" />
        ) : customers.length ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Joined</th>
                    <th>Orders</th>
                    <th className="is-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <div className="admin-user-cell">
                          <span className="admin-user-avatar admin-user-avatar--sm">
                            {(customer.name || 'C').slice(0, 1).toUpperCase()}
                          </span>
                          <div>
                            <strong>{customer.name || 'Unnamed customer'}</strong>
                            <small>{customer.id.slice(-6).toUpperCase()}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span>{customer.email || '—'}</span>
                        <small>{customer.phone || 'No phone'}</small>
                      </td>
                      <td>{formatDate(customer.createdAt)}</td>
                      <td>{formatNumber(customer.orderCount)}</td>
                      <td className="is-right">
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => setSelectedId(customer.id)}
                          aria-label={`View ${customer.name}`}
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={pagination?.page || 1}
              totalPages={pagination?.totalPages || 1}
              total={pagination?.total || 0}
              onPageChange={setPage}
            />
          </>
        ) : (
          <AdminEmptyState
            icon={Users}
            title={appliedQuery ? 'No customers match' : 'No customers yet'}
            text={
              appliedQuery
                ? 'Try a different name, email or phone number.'
                : 'Customers are created automatically when they register or place an order.'
            }
          />
        )}
      </section>

      {selectedId ? (
        <CustomerDetail
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      ) : null}
    </div>
  );
}
