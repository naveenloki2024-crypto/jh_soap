export const ORDER_STATUS_OPTIONS = [
  { value: 'received', label: 'Pending', tone: 'pending' },
  { value: 'confirmed', label: 'Confirmed', tone: 'progress' },
  { value: 'packed', label: 'Processing', tone: 'progress' },
  { value: 'shipped', label: 'Shipped', tone: 'progress' },
  { value: 'delivered', label: 'Delivered', tone: 'done' },
  { value: 'cancelled', label: 'Cancelled', tone: 'cancelled' },
];

const ORDER_STATUS_MAP = Object.fromEntries(
  ORDER_STATUS_OPTIONS.map((option) => [option.value, option]),
);

export const orderStatusMeta = (value) =>
  ORDER_STATUS_MAP[value] || {
    value,
    label: value || 'Unknown',
    tone: 'muted',
  };

export const orderStatusLabel = (value) => orderStatusMeta(value).label;
export const orderStatusTone = (value) => orderStatusMeta(value).tone;

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', tone: 'pending' },
  { value: 'paid', label: 'Paid', tone: 'done' },
  { value: 'failed', label: 'Failed', tone: 'cancelled' },
  { value: 'refunded', label: 'Refunded', tone: 'muted' },
];

const PAYMENT_STATUS_MAP = Object.fromEntries(
  PAYMENT_STATUS_OPTIONS.map((option) => [option.value, option]),
);

export const paymentStatusMeta = (value) =>
  PAYMENT_STATUS_MAP[value] || { value, label: value || 'Unknown', tone: 'muted' };

export const paymentMethodLabel = (value) =>
  value === 'razorpay' ? 'Razorpay' : value === 'cod' ? 'Cash on delivery' : value || '—';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);
export const formatCompactCurrency = (value) => `₹${compactFormatter.format(Number(value) || 0)}`;
export const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);

export function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export const shortOrderId = (id) =>
  id ? `${String(id).slice(-6).toUpperCase()}` : '—';

export const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export function buildCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell === null || cell === undefined ? '' : String(cell);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(','),
    )
    .join('\r\n');
}

export function downloadCsv(filename, rows) {
  const blob = new Blob([`\uFEFF${buildCsv(rows)}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
