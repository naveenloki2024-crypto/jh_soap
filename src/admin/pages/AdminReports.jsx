import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  CalendarRange,
  Download,
  IndianRupee,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { getAdminReports } from '../../api/admin';
import {
  downloadCsv,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatNumber,
  paymentStatusMeta,
} from '../adminUtils';
import {
  AdminBadge,
  AdminEmptyState,
  AdminError,
  AdminSpinner,
} from '../components/AdminUI';

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
];

function formatPeriodLabel(period, value) {
  if (!value) return '—';
  if (period === 'monthly') {
    const [year, month] = value.split('-');
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-IN', {
      month: 'short',
      year: '2-digit',
    });
  }
  if (period === 'weekly') {
    const parts = value.split('-W');
    return parts.length === 2 ? `W${parts[1]} ${parts[0]}` : value;
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function ReportChart({ rows, period }) {
  const max = Math.max(...rows.map((row) => row.revenue), 1);
  return (
    <div className="admin-report-chart-wrap">
      <div className="admin-report-chart">
        {rows.map((row) => {
          const height = row.revenue > 0 ? Math.max(6, Math.round((row.revenue / max) * 100)) : 2;
          return (
            <div className="admin-report-chart-col" key={row.period}>
              <span className="admin-report-chart-value">
                {row.revenue ? formatCompactCurrency(row.revenue) : ''}
              </span>
              <div className="admin-report-chart-track">
                <div
                  className={`admin-report-chart-bar${row.revenue ? '' : ' is-empty'}`}
                  style={{ height: `${height}%` }}
                  title={`${formatPeriodLabel(period, row.period)} · ${formatCurrency(
                    row.revenue,
                  )} · ${row.orders} orders`}
                />
              </div>
              <span>{formatPeriodLabel(period, row.period)}</span>
              <small>{row.orders} ord.</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminReports() {
  const [period, setPeriod] = useState('daily');
  const [days, setDays] = useState('30');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getAdminReports({ period, days }));
    } catch (requestError) {
      setError(requestError.message || 'Could not build this report.');
    } finally {
      setLoading(false);
    }
  }, [days, period]);

  useEffect(() => {
    load();
  }, [load]);

  const exportReport = () => {
    if (!data) return;
    const rows = [
      ['JH Soaps sales report'],
      ['Period', `${period} · last ${data.days} days`],
      ['Generated', new Date().toLocaleString('en-IN')],
      [],
      ['Total orders', data.summary.totalOrders],
      ['Cancelled orders', data.summary.cancelledOrders],
      ['Total sales', data.summary.totalSales],
      ['Paid revenue', data.summary.paidRevenue],
      ['Average order value', data.summary.averageOrderValue],
      [],
      ['Sales by period'],
      ['Period', 'Orders', 'Revenue', 'Paid revenue'],
      ...data.series.map((row) => [row.period, row.orders, row.revenue, row.paidRevenue]),
      [],
      ['Best sellers'],
      ['Product', 'Units', 'Revenue'],
      ...data.bestSellers.map((row) => [row.name, row.quantity, row.revenue]),
    ];
    downloadCsv(`jh-soaps-report-${period}-${data.days}d.csv`, rows);
  };

  if (loading && !data) return <AdminSpinner label="Building your report" />;

  const summary = data?.summary || {};
  const series = data?.series || [];
  const bestSellers = data?.bestSellers || [];
  const paymentBreakdown = data?.paymentBreakdown || [];
  const maxQty = Math.max(...bestSellers.map((row) => row.quantity), 1);

  return (
    <div className="admin-page">
      <div className="admin-page-toolbar">
        <div>
          <span className="admin-section-kicker">Business intelligence</span>
          <h2>Sales reports</h2>
        </div>
        <div className="admin-toolbar-actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'admin-spin' : ''} />
            Refresh
          </button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={exportReport} disabled={!data}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="admin-report-controls">
        <div className="admin-segmented" role="group" aria-label="Report grouping">
          {PERIODS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={period === option.value ? 'is-active' : ''}
              onClick={() => setPeriod(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="admin-range-select">
          <CalendarRange size={16} />
          <select value={days} onChange={(event) => setDays(event.target.value)} aria-label="Report range">
            {RANGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {data ? <span className="admin-report-window">From {formatDate(data.from)} to today</span> : null}
      </div>

      <AdminError message={error} onRetry={load} />

      <div className="admin-stats-grid">
        <article className="admin-stat admin-stat--leaf">
          <div className="admin-stat-top">
            <span className="admin-stat-icon">
              <IndianRupee size={19} />
            </span>
            <span className="admin-stat-label">Total sales</span>
          </div>
          <strong>{formatCurrency(summary.totalSales)}</strong>
          <p>{formatCurrency(summary.paidRevenue)} collected</p>
        </article>
        <article className="admin-stat admin-stat--olive">
          <div className="admin-stat-top">
            <span className="admin-stat-icon">
              <ShoppingBag size={19} />
            </span>
            <span className="admin-stat-label">Orders</span>
          </div>
          <strong>{formatNumber(summary.totalOrders)}</strong>
          <p>{formatNumber(summary.cancelledOrders)} cancelled</p>
        </article>
        <article className="admin-stat admin-stat--amber">
          <div className="admin-stat-top">
            <span className="admin-stat-icon">
              <TrendingUp size={19} />
            </span>
            <span className="admin-stat-label">Average order</span>
          </div>
          <strong>{formatCurrency(summary.averageOrderValue)}</strong>
          <p>Per non-cancelled order</p>
        </article>
        <article className="admin-stat admin-stat--brown">
          <div className="admin-stat-top">
            <span className="admin-stat-icon">
              <Wallet size={19} />
            </span>
            <span className="admin-stat-label">Paid revenue</span>
          </div>
          <strong>{formatCurrency(summary.paidRevenue)}</strong>
          <p>
            {summary.totalSales
              ? `${Math.round((summary.paidRevenue / summary.totalSales) * 100)}% of sales`
              : 'No sales in this period'}
          </p>
        </article>
      </div>

      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-panel--wide">
          <header className="admin-panel-head">
            <div>
              <h3>Revenue trend</h3>
              <p>
                {period === 'daily' ? 'Daily' : period === 'weekly' ? 'Weekly' : 'Monthly'} revenue
                excluding cancelled orders.
              </p>
            </div>
          </header>
          {series.length ? (
            <ReportChart rows={series} period={period} />
          ) : (
            <AdminEmptyState
              icon={BarChart3}
              title="No sales in this period"
              text="Try a wider date range or check back after the next order."
            />
          )}
        </section>

        <section className="admin-panel">
          <header className="admin-panel-head">
            <div>
              <h3>Payment mix</h3>
              <p>Transactions in this period.</p>
            </div>
          </header>
          {paymentBreakdown.length ? (
            <ul className="admin-payment-breakdown">
              {paymentBreakdown.map((row) => {
                const meta = paymentStatusMeta(row.status);
                return (
                  <li key={row.status}>
                    <div>
                      <AdminBadge tone={meta.tone}>{meta.label}</AdminBadge>
                      <small>{formatNumber(row.count)} transactions</small>
                    </div>
                    <strong>{formatCurrency(row.amount)}</strong>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="admin-muted">No payment activity in this period.</p>
          )}
        </section>
      </div>

      <section className="admin-panel">
        <header className="admin-panel-head">
          <div>
            <h3>Best-selling products</h3>
            <p>Ranked by revenue for the selected period.</p>
          </div>
        </header>
        {bestSellers.length ? (
          <div className="admin-best-sellers">
            {bestSellers.map((product, index) => (
              <div className="admin-best-row" key={product.productId || product.slug}>
                <span className="admin-rank-index">{index + 1}</span>
                <div className="admin-best-name">
                  <strong>{product.name}</strong>
                  <small>{product.slug}</small>
                </div>
                <span className="admin-best-bar">
                  <span style={{ width: `${Math.round((product.quantity / maxQty) * 100)}%` }} />
                </span>
                <span className="admin-best-units">{product.quantity} units</span>
                <strong>{formatCurrency(product.revenue)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            icon={ShoppingBag}
            title="No product sales yet"
            text="Best sellers will appear once orders are placed in this period."
          />
        )}
      </section>
    </div>
  );
}
