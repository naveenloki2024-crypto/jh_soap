import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Ban,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import {
  deleteAdminOrder,
  getAdminOrder,
  getAdminOrders,
  updateAdminOrderStatus,
} from '../../api/admin';
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  formatCurrency,
  formatDateTime,
  orderStatusLabel,
  orderStatusTone,
  paymentMethodLabel,
  paymentStatusMeta,
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

const STATUS_VALUES = ORDER_STATUS_OPTIONS.map((option) => option.value);

function OrderDetail({
  detail,
  loading,
  error,
  action,
  setAction,
  onClose,
  onStatus,
  onPayment,
  onDelete,
  onRefresh,
}) {
  const busy = action.busy;
  const isCancelled = detail?.orderStatus === 'cancelled';

  return (
    <AdminModal
      title={detail ? `Order ${detail.orderNumber}` : 'Order details'}
      subtitle={detail ? `Placed ${formatDateTime(detail.createdAt)}` : 'Loading order…'}
      onClose={onClose}
      size="lg"
      footer={
        detail ? (
          <div className="admin-modal-actions admin-modal-actions--split">
            <button
              type="button"
              className="admin-btn admin-btn--danger-ghost"
              onClick={onDelete}
              disabled={busy}
            >
              <Trash2 size={16} />
              Delete order
            </button>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={onRefresh} disabled={busy}>
                <RefreshCw size={15} className={busy ? 'admin-spin' : ''} />
                Refresh
              </button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : null
      }
    >
      {loading ? <AdminSpinner label="Loading order" /> : null}
      <AdminError message={error} onRetry={onRefresh} />

      {detail ? (
        <div className="admin-order-detail">
          <div className="admin-order-summary">
            <div>
              <span className="admin-label">Order status</span>
              <AdminBadge tone={orderStatusTone(detail.orderStatus)}>
                {orderStatusLabel(detail.orderStatus)}
              </AdminBadge>
            </div>
            <div>
              <span className="admin-label">Payment</span>
              <AdminBadge tone={paymentStatusMeta(detail.paymentStatus).tone}>
                {paymentStatusMeta(detail.paymentStatus).label}
              </AdminBadge>
            </div>
            <div>
              <span className="admin-label">Method</span>
              <strong>{paymentMethodLabel(detail.paymentMethod)}</strong>
            </div>
            <div>
              <span className="admin-label">Order total</span>
              <strong>{formatCurrency(detail.pricing?.total)}</strong>
            </div>
          </div>

          {action.message ? <p className="admin-success">{action.message}</p> : null}

          <div className="admin-detail-grid">
            <section className="admin-detail-block">
              <h3>Customer</h3>
              <p className="admin-cell-strong">{detail.customer?.fullName}</p>
              <p>{detail.customer?.mobile}</p>
              <p>{detail.customer?.email || 'No email provided'}</p>
              <h4>Shipping address</h4>
              <p>
                {[
                  detail.customer?.address,
                  detail.customer?.area,
                  detail.customer?.city,
                  detail.customer?.district,
                  detail.customer?.state,
                  detail.customer?.pincode,
                ]
                  .filter(Boolean)
                  .join(', ') || 'No address recorded'}
              </p>
              {detail.customer?.landmark ? <p>Landmark: {detail.customer.landmark}</p> : null}
              {detail.customer?.notes ? <p>Notes: {detail.customer.notes}</p> : null}
            </section>

            <section className="admin-detail-block">
              <h3>Items</h3>
              <ul className="admin-order-items">
                {detail.items?.map((item) => (
                  <li key={`${item.productId}-${item.slug}`}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </small>
                    </div>
                    <span>{formatCurrency(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <dl className="admin-totals">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatCurrency(detail.pricing?.subtotal)}</dd>
                </div>
                <div>
                  <dt>Offer savings</dt>
                  <dd>− {formatCurrency(detail.pricing?.offerDiscount)}</dd>
                </div>
                {detail.pricing?.couponDiscount ? (
                  <div>
                    <dt>Coupon {detail.couponCode ? `(${detail.couponCode})` : ''}</dt>
                    <dd>− {formatCurrency(detail.pricing.couponDiscount)}</dd>
                  </div>
                ) : null}
                <div className="is-total">
                  <dt>Total</dt>
                  <dd>{formatCurrency(detail.pricing?.total)}</dd>
                </div>
              </dl>
            </section>
          </div>

          <div className="admin-detail-grid">
            <section className="admin-detail-block">
              <h3>Update order status</h3>
              <form onSubmit={onStatus} className="admin-form-stack">
                <AdminField label="Status">
                  <select
                    value={action.orderStatus}
                    onChange={(event) =>
                      setAction((prev) => ({ ...prev, orderStatus: event.target.value, message: '' }))
                    }
                    disabled={isCancelled}
                  >
                    {ORDER_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Internal note" hint="Optional. Shown in the order timeline.">
                  <input
                    type="text"
                    value={action.note}
                    onChange={(event) =>
                      setAction((prev) => ({ ...prev, note: event.target.value, message: '' }))
                    }
                    placeholder="e.g. Packed with care"
                    maxLength={500}
                  />
                </AdminField>
                {isCancelled ? (
                  <p className="admin-hint">
                    <Ban size={14} /> Cancelled orders cannot be reopened. Stock was restored.
                  </p>
                ) : null}
                <button type="submit" className="admin-btn admin-btn--primary" disabled={busy || isCancelled}>
                  {busy ? <Loader2 size={15} className="admin-spin" /> : null}
                  Save order status
                </button>
              </form>
            </section>

            <section className="admin-detail-block">
              <h3>Payment</h3>
              <form onSubmit={onPayment} className="admin-form-stack">
                <AdminField label="Payment status">
                  <select
                    value={action.paymentStatus}
                    onChange={(event) =>
                      setAction((prev) => ({
                        ...prev,
                        paymentStatus: event.target.value,
                        message: '',
                      }))
                    }
                  >
                    {PAYMENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField
                  label="Payment reference"
                  hint="Required when marking as paid. Razorpay IDs appear here automatically."
                >
                  <input
                    type="text"
                    value={action.paymentReference}
                    onChange={(event) =>
                      setAction((prev) => ({
                        ...prev,
                        paymentReference: event.target.value,
                        message: '',
                      }))
                    }
                    placeholder="pay_… or manual reference"
                    maxLength={200}
                  />
                </AdminField>
                {detail.razorpayOrderId ? (
                  <p className="admin-hint">
                    Razorpay order: <code>{detail.razorpayOrderId}</code>
                  </p>
                ) : null}
                <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>
                  {busy ? <Loader2 size={15} className="admin-spin" /> : null}
                  Save payment
                </button>
              </form>
            </section>
          </div>

          <section className="admin-detail-block">
            <h3>Timeline</h3>
            {detail.statusHistory?.length ? (
              <ol className="admin-timeline">
                {[...detail.statusHistory].reverse().map((entry, index) => (
                  <li key={`${entry.changedAt}-${index}`}>
                    <span className={`admin-status-dot admin-status-dot--${orderStatusTone(entry.status)}`} />
                    <div>
                      <strong>{orderStatusLabel(entry.status)}</strong>
                      <small>{formatDateTime(entry.changedAt)}</small>
                      {entry.note ? <p>{entry.note}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="admin-muted">No status changes recorded yet.</p>
            )}
          </section>
        </div>
      ) : null}
    </AdminModal>
  );
}

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status');

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [appliedQuery, setAppliedQuery] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(STATUS_VALUES.includes(initialStatus) ? initialStatus : '');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedId = searchParams.get('order');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [action, setAction] = useState({
    orderStatus: 'received',
    note: '',
    paymentStatus: 'pending',
    paymentReference: '',
    busy: false,
    message: '',
  });

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminOrders({
        page,
        limit: 15,
        q: appliedQuery,
        status,
        paymentStatus,
      });
      setOrders(data.orders || []);
      setPagination(data.pagination || null);
    } catch (requestError) {
      setError(requestError.message || 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, page, paymentStatus, status]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const loadDetail = useCallback(async () => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError('');
    try {
      const data = await getAdminOrder(selectedId);
      setDetail(data.order);
    } catch (requestError) {
      setDetail(null);
      setDetailError(requestError.message || 'Could not load this order.');
    } finally {
      setDetailLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!detail) return;
    setAction((prev) => ({
      orderStatus: detail.orderStatus,
      note: '',
      paymentStatus: detail.paymentStatus,
      paymentReference: detail.paymentReference || '',
      busy: false,
      message: prev.message,
    }));
  }, [detail]);

  const openOrder = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set('order', id);
    setSearchParams(next);
  };

  const closeOrder = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('order');
    setSearchParams(next);
    setDetail(null);
    setDetailError('');
    setAction((prev) => ({ ...prev, message: '' }));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedQuery(query.trim());
  };

  const clearFilters = () => {
    setQuery('');
    setAppliedQuery('');
    setStatus('');
    setPaymentStatus('');
    setPage(1);
  };

  const patchAction = (values) => setAction((prev) => ({ ...prev, ...values }));

  const handleStatusSubmit = async (event) => {
    event.preventDefault();
    if (!detail || action.busy) return;
    setDetailError('');
    patchAction({ busy: true, message: '' });
    try {
      const data = await updateAdminOrderStatus(detail.id, {
        orderStatus: action.orderStatus,
        note: action.note.trim(),
      });
      setDetail(data.order);
      patchAction({ busy: false, message: 'Order status updated.' });
      loadOrders();
    } catch (requestError) {
      patchAction({ busy: false });
      setDetailError(requestError.message || 'Could not update the order status.');
    }
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    if (!detail || action.busy) return;
    const reference = action.paymentReference.trim();
    if (action.paymentStatus === 'paid' && !reference) {
      setDetailError('Add a payment reference before marking this order as paid.');
      return;
    }
    setDetailError('');
    patchAction({ busy: true, message: '' });
    try {
      const payload = { paymentStatus: action.paymentStatus };
      if (reference) payload.paymentReference = reference;
      const data = await updateAdminOrderStatus(detail.id, payload);
      setDetail(data.order);
      patchAction({ busy: false, message: 'Payment details updated.' });
      loadOrders();
    } catch (requestError) {
      patchAction({ busy: false });
      setDetailError(requestError.message || 'Could not update payment details.');
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    const confirmed = window.confirm(
      `Delete order ${detail.orderNumber}? Stock will be restored and the order removed permanently.`,
    );
    if (!confirmed) return;
    patchAction({ busy: true });
    try {
      await deleteAdminOrder(detail.id);
      closeOrder();
      loadOrders();
    } catch (requestError) {
      patchAction({ busy: false });
      setDetailError(requestError.message || 'Could not delete this order.');
    }
  };

  const activeFilters = useMemo(
    () => Boolean(appliedQuery || status || paymentStatus),
    [appliedQuery, paymentStatus, status],
  );

  return (
    <div className="admin-page">
      <div className="admin-page-toolbar">
        <div>
          <span className="admin-section-kicker">Fulfilment</span>
          <h2>All orders</h2>
        </div>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={loadOrders} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'admin-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="admin-filter-bar">
        <form className="admin-search" onSubmit={handleSearch}>
          <Search size={17} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search order number, customer or phone"
            aria-label="Search orders"
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
          aria-label="Filter by order status"
        >
          <option value="">All order statuses</option>
          {ORDER_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={paymentStatus}
          onChange={(event) => {
            setPaymentStatus(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by payment status"
        >
          <option value="">All payments</option>
          {PAYMENT_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {activeFilters ? (
          <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={clearFilters}>
            Clear
          </button>
        ) : null}
      </div>

      <AdminError message={error} onRetry={loadOrders} />

      <section className="admin-panel">
        {loading && !orders.length ? (
          <AdminSpinner label="Loading orders" />
        ) : orders.length ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Placed</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th className="is-right">Total</th>
                    <th className="is-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <button type="button" className="admin-link-btn" onClick={() => openOrder(order.id)}>
                          {order.orderNumber}
                        </button>
                      </td>
                      <td>
                        <span className="admin-cell-strong">{order.customer?.fullName}</span>
                        <small>{order.customer?.mobile}</small>
                      </td>
                      <td>{formatDateTime(order.createdAt)}</td>
                      <td>
                        <AdminBadge tone={paymentStatusMeta(order.paymentStatus).tone}>
                          {paymentStatusMeta(order.paymentStatus).label}
                        </AdminBadge>
                        <small>{paymentMethodLabel(order.paymentMethod)}</small>
                      </td>
                      <td>
                        <AdminBadge tone={orderStatusTone(order.orderStatus)}>
                          {orderStatusLabel(order.orderStatus)}
                        </AdminBadge>
                      </td>
                      <td className="is-right admin-cell-strong">{formatCurrency(order.pricing?.total)}</td>
                      <td className="is-right">
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => openOrder(order.id)}
                          aria-label={`View order ${order.orderNumber}`}
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
            icon={ShoppingBag}
            title={activeFilters ? 'No orders match these filters' : 'No orders yet'}
            text={
              activeFilters
                ? 'Try clearing the search or choosing a different status.'
                : 'Orders placed through checkout will appear here automatically.'
            }
            action={
              activeFilters ? (
                <button type="button" className="admin-btn admin-btn--ghost" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : null
            }
          />
        )}
      </section>

      {selectedId ? (
        <OrderDetail
          detail={detail}
          loading={detailLoading}
          error={detailError}
          action={action}
          setAction={setAction}
          onClose={closeOrder}
          onStatus={handleStatusSubmit}
          onPayment={handlePaymentSubmit}
          onDelete={handleDelete}
          onRefresh={loadDetail}
        />
      ) : null}
    </div>
  );
}
