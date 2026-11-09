import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  CreditCard,
  Download,
  Eye,
  RefreshCw,
  Search,
  Wallet,
} from 'lucide-react';
import { getAdminPayments } from '../../api/admin';
import {
  PAYMENT_STATUS_OPTIONS,
  downloadCsv,
  formatCurrency,
  formatDateTime,
  formatNumber,
  paymentMethodLabel,
  paymentStatusMeta,
} from '../adminUtils';
import {
  AdminBadge,
  AdminEmptyState,
  AdminError,
  AdminPagination,
  AdminSpinner,
} from '../components/AdminUI';

export default function AdminPayments() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAdminPayments({
        page,
        limit: 15,
        q: appliedQuery,
        status,
        method,
      });
      setData(response);
    } catch (requestError) {
      setError(requestError.message || 'Could not load payments.');
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, method, page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const payments = data?.payments || [];
  const summary = data?.summary || {};

  const exportPayments = () => {
    if (!payments.length) return;
    downloadCsv('jh-soaps-payments.csv', [
      [
        'Order',
        'Customer',
        'Phone',
        'Amount',
        'Method',
        'Payment status',
        'Order status',
        'Reference',
        'Razorpay order',
        'Razorpay payment',
        'Date',
      ],
      ...payments.map((payment) => [
        payment.orderNumber,
        payment.customerName,
        payment.phone,
        payment.amount,
        paymentMethodLabel(payment.method),
        paymentStatusMeta(payment.status).label,
        payment.orderStatus,
        payment.reference || '',
        payment.razorpayOrderId || '',
        payment.razorpayPaymentId || '',
        formatDateTime(payment.createdAt),
      ]),
    ]);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-toolbar">
        <div>
          <span className="admin-section-kicker">Money movement</span>
          <h2>Payments</h2>
        </div>
        <div className="admin-toolbar-actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'admin-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={exportPayments}
            disabled={!payments.length}
          >
            <Download size={16} />
            Export page
          </button>
        </div>
      </div>

      <div className="admin-payment-summary">
        {['paid', 'pending', 'failed', 'refunded'].map((key) => {
          const meta = paymentStatusMeta(key);
          const item = summary[key] || { count: 0, amount: 0 };
          return (
            <article className={`admin-payment-card admin-payment-card--${meta.tone}`} key={key}>
              <span>
                <Wallet size={17} />
                {meta.label}
              </span>
              <strong>{formatCurrency(item.amount)}</strong>
              <small>{formatNumber(item.count)} transactions</small>
            </article>
          );
        })}
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
            placeholder="Search order, customer, phone or Razorpay ID"
            aria-label="Search payments"
          />
          <button type="submit" className="admin-btn admin-btn--primary admin-btn--sm">
            Search
          </button>
        </form>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by payment status"
        >
          <option value="">All payment statuses</option>
          {PAYMENT_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={method}
          onChange={(event) => {
            setMethod(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by payment method"
        >
          <option value="">All methods</option>
          <option value="cod">Cash on delivery</option>
          <option value="razorpay">Razorpay</option>
        </select>
      </div>

      <AdminError message={error} onRetry={load} />

      <section className="admin-panel">
        {loading && !payments.length ? (
          <AdminSpinner label="Loading payments" />
        ) : payments.length ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Transaction reference</th>
                    <th>Status</th>
                    <th className="is-right">Amount</th>
                    <th className="is-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const meta = paymentStatusMeta(payment.status);
                    return (
                      <tr key={payment.id}>
                        <td>
                          <button
                            type="button"
                            className="admin-link-btn"
                            onClick={() => navigate(`/admin/orders?order=${payment.id}`)}
                          >
                            {payment.orderNumber}
                          </button>
                        </td>
                        <td>
                          <span className="admin-cell-strong">{payment.customerName}</span>
                          <small>{payment.phone}</small>
                        </td>
                        <td>{formatDateTime(payment.createdAt)}</td>
                        <td>{paymentMethodLabel(payment.method)}</td>
                        <td>
                          <span className="admin-mono">
                            {payment.razorpayPaymentId || payment.reference || '—'}
                          </span>
                          {payment.razorpayOrderId ? (
                            <small>Order: {payment.razorpayOrderId}</small>
                          ) : null}
                        </td>
                        <td>
                          <AdminBadge tone={meta.tone}>{meta.label}</AdminBadge>
                        </td>
                        <td className="is-right admin-cell-strong">{formatCurrency(payment.amount)}</td>
                        <td className="is-right">
                          <button
                            type="button"
                            className="admin-icon-btn"
                            onClick={() => navigate(`/admin/orders?order=${payment.id}`)}
                            aria-label={`View order ${payment.orderNumber}`}
                          >
                            <Eye size={17} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={data?.pagination?.page || 1}
              totalPages={data?.pagination?.totalPages || 1}
              total={data?.pagination?.total || 0}
              onPageChange={setPage}
            />
          </>
        ) : (
          <AdminEmptyState
            icon={CreditCard}
            title={
              appliedQuery || status || method
                ? 'No transactions match these filters'
                : 'No payment activity yet'
            }
            text="Razorpay and cash-on-delivery transactions appear here as orders are placed."
          />
        )}
      </section>

      <p className="admin-page-footnote">
        <ArrowUpRight size={14} />
        Payment statuses can be corrected from the related order detail.
      </p>
    </div>
  );
}
