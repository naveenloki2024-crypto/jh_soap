import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { adjustAdminInventory, getAdminInventory } from '../../api/admin';
import { formatDateTime, formatNumber } from '../adminUtils';
import {
  AdminBadge,
  AdminEmptyState,
  AdminError,
  AdminField,
  AdminModal,
  AdminPagination,
  AdminSpinner,
} from '../components/AdminUI';

function AdjustStock({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    delta: '',
    lowStockThreshold: String(item.lowStockThreshold ?? 5),
    reference: '',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const delta = Number(form.delta);
    if (!Number.isInteger(delta) || delta === 0) {
      setError('Enter a non-zero whole number. Use a negative value to reduce stock.');
      return;
    }
    const threshold = Number(form.lowStockThreshold);
    if (!Number.isInteger(threshold) || threshold < 0) {
      setError('Low-stock threshold must be a non-negative whole number.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await adjustAdminInventory(item.productId, {
        delta,
        lowStockThreshold: threshold,
        reference: form.reference.trim(),
        note: form.note.trim(),
      });
      setNotice(
        `Stock ${delta > 0 ? 'increased' : 'reduced'} successfully. New balance: ${response.productStock}.`,
      );
      setForm((prev) => ({ ...prev, delta: '', reference: '', note: '' }));
      onSaved?.(response.inventory);
    } catch (requestError) {
      setError(requestError.message || 'Could not adjust stock.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      title={`Adjust stock · ${item.productName || item.productSlug}`}
      subtitle={`Current stock: ${formatNumber(item.availableStock)} units`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>
            Close
          </button>
          <button
            type="submit"
            form="admin-inventory-form"
            className="admin-btn admin-btn--primary"
            disabled={saving}
          >
            {saving ? <Loader2 size={15} className="admin-spin" /> : null}
            Apply adjustment
          </button>
        </>
      }
    >
      <form id="admin-inventory-form" className="admin-form-stack" onSubmit={handleSubmit}>
        <AdminError message={error} />
        {notice ? <p className="admin-success">{notice}</p> : null}

        <div className="admin-stock-summary">
          <div>
            <span>Available</span>
            <strong>{formatNumber(item.availableStock)}</strong>
          </div>
          <div>
            <span>Reserved</span>
            <strong>{formatNumber(item.reservedStock)}</strong>
          </div>
          <div>
            <span>Threshold</span>
            <strong>{formatNumber(item.lowStockThreshold)}</strong>
          </div>
        </div>

        <div className="admin-form-grid">
          <AdminField
            label="Quantity change"
            hint="Positive to add stock, negative to reduce. Example: 24 or -3."
          >
            <input
              type="number"
              step="1"
              value={form.delta}
              onChange={(event) => set('delta', event.target.value)}
              placeholder="24"
              autoFocus
            />
          </AdminField>
          <AdminField label="Low-stock threshold" hint="Alerts appear at or below this level.">
            <input
              type="number"
              min="0"
              step="1"
              value={form.lowStockThreshold}
              onChange={(event) => set('lowStockThreshold', event.target.value)}
            />
          </AdminField>
          <AdminField label="Reference" hint="Optional batch, invoice or supplier reference.">
            <input
              type="text"
              value={form.reference}
              onChange={(event) => set('reference', event.target.value)}
              placeholder="Batch JH-2401"
              maxLength={120}
            />
          </AdminField>
          <AdminField label="Note" hint="Optional internal note.">
            <input
              type="text"
              value={form.note}
              onChange={(event) => set('note', event.target.value)}
              placeholder="Restock received"
              maxLength={500}
            />
          </AdminField>
        </div>
      </form>

      {item.movements?.length ? (
        <section className="admin-detail-block">
          <h3>Recent stock activity</h3>
          <ul className="admin-movement-list">
            {item.movements
              .slice(-8)
              .reverse()
              .map((movement, index) => (
                <li key={movement.id || `${movement.createdAt}-${index}`}>
                  <span
                    className={`admin-movement-icon ${
                      movement.quantity >= 0 ? 'is-in' : 'is-out'
                    }`.trim()}
                  >
                    {movement.quantity >= 0 ? (
                      <ArrowDownToLine size={14} />
                    ) : (
                      <ArrowUpFromLine size={14} />
                    )}
                  </span>
                  <div>
                    <strong>
                      {movement.type || 'Adjustment'}
                      {movement.reference ? ` · ${movement.reference}` : ''}
                    </strong>
                    <small>{formatDateTime(movement.createdAt)}</small>
                    {movement.note ? <p>{movement.note}</p> : null}
                  </div>
                  <span className={movement.quantity >= 0 ? 'admin-stock-in' : 'admin-stock-change'}>
                    {movement.quantity >= 0 ? '+' : ''}
                    {movement.quantity}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </AdminModal>
  );
}

export default function AdminInventory() {
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminInventory({
        page,
        limit: 15,
        q: appliedQuery,
        lowStock: lowStock ? 'true' : '',
      });
      setItems(data.inventory || []);
      setPagination(data.pagination || null);
    } catch (requestError) {
      setError(requestError.message || 'Could not load inventory.');
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, lowStock, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = (updated) => {
    if (updated) {
      setSelected(updated);
      setItems((prev) =>
        prev.map((item) => (item.productId === updated.productId ? updated : item)),
      );
    }
    setNotice('Stock level updated.');
    load();
  };

  return (
    <div className="admin-page">
      <div className="admin-page-toolbar">
        <div>
          <span className="admin-section-kicker">Stock control</span>
          <h2>Inventory</h2>
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
            placeholder="Search product or SKU"
            aria-label="Search inventory"
          />
          <button type="submit" className="admin-btn admin-btn--primary admin-btn--sm">
            Search
          </button>
        </form>
        <label className="admin-switch">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(event) => {
              setLowStock(event.target.checked);
              setPage(1);
            }}
          />
          <span />
          Low stock only
        </label>
      </div>

      {notice ? <p className="admin-success">{notice}</p> : null}
      <AdminError message={error} onRetry={load} />

      <section className="admin-panel">
        {loading && !items.length ? (
          <AdminSpinner label="Loading inventory" />
        ) : items.length ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th className="is-right">Available</th>
                    <th className="is-right">Reserved</th>
                    <th>Threshold</th>
                    <th>Stock health</th>
                    <th className="is-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const out = item.availableStock <= 0;
                    const low = !out && item.isLowStock;
                    return (
                      <tr key={item.productId || item.id}>
                        <td>
                          <span className="admin-cell-strong">
                            {item.productName || item.productSlug || 'Unknown product'}
                          </span>
                          <small>/{item.productSlug}</small>
                        </td>
                        <td>{item.sku || '—'}</td>
                        <td className={`is-right ${out ? 'admin-stock-out' : 'admin-cell-strong'}`}>
                          {formatNumber(item.availableStock)}
                        </td>
                        <td className="is-right">{formatNumber(item.reservedStock)}</td>
                        <td>{formatNumber(item.lowStockThreshold)}</td>
                        <td>
                          <AdminBadge tone={out ? 'cancelled' : low ? 'pending' : 'done'}>
                            {out ? (
                              <>
                                <AlertTriangle size={12} /> Out of stock
                              </>
                            ) : low ? (
                              <>
                                <AlertTriangle size={12} /> Low stock
                              </>
                            ) : (
                              'Healthy'
                            )}
                          </AdminBadge>
                        </td>
                        <td className="is-right">
                          <button
                            type="button"
                            className="admin-btn admin-btn--ghost admin-btn--sm"
                            onClick={() => setSelected(item)}
                            disabled={!item.productId}
                          >
                            <SlidersHorizontal size={14} />
                            Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
            icon={Boxes}
            title={lowStock || appliedQuery ? 'No stock records match' : 'No inventory records'}
            text={
              lowStock
                ? 'Every product is above its low-stock threshold.'
                : appliedQuery
                  ? 'Try a different product name or SKU.'
                  : 'Inventory records are created automatically with each product.'
            }
          />
        )}
      </section>

      {selected ? (
        <AdjustStock
          item={selected}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
}
