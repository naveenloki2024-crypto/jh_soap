import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Boxes,
  IndianRupee,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { getAdminDashboard } from '../../api/admin';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDateTime,
  formatNumber,
  orderStatusLabel,
  orderStatusTone,
  paymentStatusMeta,
} from '../adminUtils';
import {
  AdminBadge,
  AdminEmptyState,
  AdminError,
  AdminSpinner,
} from '../components/AdminUI';

function StatCard({ icon: Icon, label, value, note, tone = 'leaf' }) {
  return (
    <article className={`admin-stat admin-stat--${tone}`}>
      <div className="admin-stat-top">
        <span className="admin-stat-icon">
          <Icon size={19} strokeWidth={1.7} />
        </span>
        <span className="admin-stat-label">{label}</span>
      </div>
      <strong>{value}</strong>
      {note ? <p>{note}</p> : null}
    </article>
  );
}

function SalesChart({ rows }) {
  const max = Math.max(...rows.map((row) => row.revenue), 1);
  return (
    <div className="admin-chart-wrap">
      <div className="admin-chart">
        {rows.map((row) => {
          const height = row.revenue > 0 ? Math.max(6, Math.round((row.revenue / max) * 100)) : 2;
          const label = new Date(`${row.date}T00:00:00`).toLocaleDateString('en-IN', {
            weekday: 'short',
          });
          return (
            <div className="admin-chart-col" key={row.date}>
              <div className="admin-chart-value">{row.revenue ? formatCompactCurrency(row.revenue) : ''}</div>
              <div className="admin-chart-track">
                <div
                  className={`admin-chart-bar${row.revenue ? '' : ' is-empty'}`}
                  style={{ height: `${height}%` }}
                  title={`${label}: ${formatCurrency(row.revenue)} · ${row.orders} orders`}
                />
              </div>
              <span>{label}</span>
              <small>{row.orders} ord.</small>
            </div>
          );
        })}
      </div>
      <div className="admin-chart-legend">
        {rows.reduce((sum, row) => sum + row.revenue, 0) === 0
          ? 'No sales in the last 7 days yet.'
          : `Last 7 days: ${formatCurrency(rows.reduce((sum, row) => sum + row.revenue, 0))}`}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getAdminDashboard());
    } catch (requestError) {
      setError(requestError.message || 'Could not load the dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <AdminSpinner label="Loading your store overview" />;
  if (error && !data) return <AdminError message={error} onRetry={load} />;

  const rows = data?.salesAnalytics || [];
  const statusBreakdown = data?.statusBreakdown || {};
  const maxStatus = Math.max(...Object.values(statusBreakdown), 1);

  return (
    <div className="admin-page">
      <div className="admin-page-toolbar">
        <div>
          <span className="admin-section-kicker">Today at a glance</span>
          <h2>Store performance</h2>
        </div>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'admin-spin' : ''} />
          Refresh
        </button>
      </div>

      <AdminError message={error} onRetry={load} />

      <div className="admin-stats-grid">
        <StatCard
          icon={IndianRupee}
          label="Paid revenue"
          value={formatCurrency(data?.totalRevenue)}
          note={`${formatCurrency(data?.totalSales)} total sales`}
        />
        <StatCard
          icon={ShoppingBag}
          label="Total orders"
          value={formatNumber(data?.totalOrders)}
          note={`${formatNumber(data?.todayOrders)} placed today`}
          tone="olive"
        />
        <StatCard
          icon={TrendingUp}
          label="Pending orders"
          value={formatNumber(data?.pendingOrders)}
          note={`${formatNumber(data?.deliveredOrders)} delivered`}
          tone="amber"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={formatNumber(data?.totalCustomers)}
          note={`${formatNumber(data?.totalProducts)} active products`}
          tone="brown"
        />
      </div>

      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-panel--wide">
          <header className="admin-panel-head">
            <div>
              <h3>Sales, last 7 days</h3>
              <p>Order value excluding cancellations.</p>
            </div>
            <Link className="admin-text-link" to="/admin/reports">
              Open reports <ArrowUpRight size={14} />
            </Link>
          </header>
          <SalesChart rows={rows} />
        </section>

        <section className="admin-panel">
          <header className="admin-panel-head">
            <div>
              <h3>Order pipeline</h3>
              <p>Every order by current status.</p>
            </div>
          </header>
          <div className="admin-status-list">
            {[
              ['received', 'Pending'],
              ['confirmed', 'Confirmed'],
              ['packed', 'Processing'],
              ['shipped', 'Shipped'],
              ['delivered', 'Delivered'],
              ['cancelled', 'Cancelled'],
            ].map(([value, label]) => {
              const count = statusBreakdown[value] || 0;
              return (
                <button
                  type="button"
                  className="admin-status-row"
                  key={value}
                  onClick={() => navigate(`/admin/orders?status=${value}`)}
                >
                  <span className={`admin-status-dot admin-status-dot--${orderStatusTone(value)}`} />
                  <span className="admin-status-name">{label}</span>
                  <span className="admin-status-track">
                    <span style={{ width: `${Math.round((count / maxStatus) * 100)}%` }} />
                  </span>
                  <strong>{count}</strong>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-panel--wide">
          <header className="admin-panel-head">
            <div>
              <h3>Recent orders</h3>
              <p>The latest activity across the store.</p>
            </div>
            <Link className="admin-text-link" to="/admin/orders">
              View all <ArrowUpRight size={14} />
            </Link>
          </header>
          {data?.recentOrders?.length ? (
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
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => {
                    const payment = paymentStatusMeta(order.paymentStatus);
                    return (
                      <tr
                        key={order.id}
                        className="is-clickable"
                        onClick={() => navigate(`/admin/orders?order=${order.id}`)}
                      >
                        <td>
                          <span className="admin-order-number">{order.orderNumber}</span>
                        </td>
                        <td>
                          <span className="admin-cell-strong">{order.customer?.fullName}</span>
                          <small>{order.customer?.mobile}</small>
                        </td>
                        <td>{formatDateTime(order.createdAt)}</td>
                        <td>
                          <AdminBadge tone={payment.tone}>{payment.label}</AdminBadge>
                        </td>
                        <td>
                          <AdminBadge tone={orderStatusTone(order.orderStatus)}>
                            {orderStatusLabel(order.orderStatus)}
                          </AdminBadge>
                        </td>
                        <td className="is-right admin-cell-strong">
                          {formatCurrency(order.pricing?.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmptyState
              icon={ShoppingBag}
              title="No orders yet"
              text="New storefront orders will appear here as soon as they are placed."
            />
          )}
        </section>

        <section className="admin-panel">
          <header className="admin-panel-head">
            <div>
              <h3>Top sellers</h3>
              <p>By revenue across all time.</p>
            </div>
          </header>
          {data?.topSellingProducts?.length ? (
            <ol className="admin-rank-list">
              {data.topSellingProducts.slice(0, 6).map((product, index) => (
                <li key={product.productId || product.slug}>
                  <span className="admin-rank-index">{index + 1}</span>
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.quantity} units sold</small>
                  </div>
                  <span>{formatCurrency(product.revenue)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <AdminEmptyState icon={Package} title="No sales data yet" text="Top sellers appear once orders start arriving." />
          )}

          <div className="admin-mini-grid">
            <Link to="/admin/inventory" className="admin-mini-card">
              <Boxes size={18} />
              <div>
                <strong>{formatNumber(data?.lowStockProducts)}</strong>
                <span>Low stock</span>
              </div>
            </Link>
            <Link to="/admin/products" className="admin-mini-card">
              <Wallet size={18} />
              <div>
                <strong>{formatNumber(data?.outOfStockProducts)}</strong>
                <span>Out of stock</span>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
