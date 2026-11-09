const STATUS_META = {
  received: { label: 'Order received', tone: 'pending' },
  confirmed: { label: 'Confirmed', tone: 'pending' },
  packed: { label: 'Packed', tone: 'progress' },
  shipped: { label: 'Shipped', tone: 'progress' },
  delivered: { label: 'Delivered', tone: 'done' },
  cancelled: { label: 'Cancelled', tone: 'cancelled' },
};

export const orderStatusMeta = (status) =>
  STATUS_META[status] || { label: status || 'Unknown', tone: 'pending' };

export const PAYMENT_LABEL = {
  pending: 'Payment on delivery',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
};

export const formatOrderDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export const formatOrderDay = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};
