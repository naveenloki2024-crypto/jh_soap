import { OFFER_GROUP_SIZE } from './constants.js';

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toPlain = (row) => (row && typeof row.toObject === 'function' ? row.toObject() : row);
const toId = (row) => (row?._id ? String(row._id) : row?.id ? String(row.id) : null);
const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** Maps a Product document to the camelCase shape the frontend expects. */
export function mapProduct(doc) {
  const row = toPlain(doc);
  if (!row) return null;
  const images = Array.isArray(row.images) ? row.images.filter(Boolean) : [];
  const price = row.offerPrice ?? row.regularPrice;
  return {
    id: row.slug,
    slug: row.slug,
    productId: toId(row),
    name: row.name,
    description: row.description ?? '',
    price: toNumber(price),
    regularPrice: toNumber(row.regularPrice),
    offerPrice: row.offerPrice === undefined || row.offerPrice === null ? null : toNumber(row.offerPrice),
    imageUrl: images[0] ?? null,
    images,
    category: row.category ?? 'Herbal',
    stockQuantity: toNumber(row.stockQuantity),
    sku: row.sku ?? null,
    isActive: Boolean(row.isActive),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

/** Maps a Customer document (optionally backed by the JWT payload) to the client shape. */
export function mapProfile(doc, user = null) {
  const row = toPlain(doc);
  return {
    id: toId(row) ?? user?.id ?? null,
    fullName: row?.name ?? user?.name ?? '',
    email: row?.email ?? user?.email ?? '',
    phone: row?.phone ?? user?.phone ?? null,
    avatarUrl: row?.avatarUrl ?? null,
    createdAt: toDate(row?.createdAt),
    updatedAt: toDate(row?.updatedAt),
  };
}

/** Maps an embedded order item. */
export function mapOrderItem(item) {
  const row = toPlain(item) || {};
  const rawProduct = row.productId;
  const product =
    rawProduct && typeof rawProduct === 'object' && !rawProduct.toHexString
      ? toPlain(rawProduct)
      : null;
  const productId = product ? toId(product) : rawProduct ? String(rawProduct) : null;
  const slug = row.slug ?? product?.slug ?? null;
  return {
    id: slug,
    slug,
    productId,
    name: row.name ?? product?.name ?? '',
    qty: row.quantity ?? 0,
    quantity: row.quantity ?? 0,
    unitPrice: toNumber(row.unitPrice),
    lineTotal: toNumber(row.lineTotal),
  };
}

/** Maps an Order document to the frontend order shape. */
export function mapOrder(doc) {
  const row = toPlain(doc);
  if (!row) return null;
  const address = row.shippingAddress && typeof row.shippingAddress === 'object'
    ? toPlain(row.shippingAddress)
    : {};
  const mappedItems = (row.items || []).map(mapOrderItem);
  const unitCount = mappedItems.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = toNumber(row.subtotal);
  const discount = toNumber(row.discount);

  return {
    id: toId(row),
    orderNumber: row.orderNumber,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
    status: row.orderStatus,
    orderStatus: row.orderStatus,
    paymentStatus: row.paymentStatus,
    paymentMethod: row.paymentMethod,
    paymentReference: row.paymentReference ?? null,
    razorpayOrderId: row.razorpayOrderId ?? null,
    razorpayPaymentId: row.razorpayPaymentId ?? null,
    stripeCheckoutSessionId: row.stripeCheckoutSessionId ?? null,
    stripePaymentIntentId: row.stripePaymentIntentId ?? null,
    stripePaymentMethodType: row.stripePaymentMethodType ?? null,
    paymentCompletedAt: toDate(row.paymentCompletedAt),
    customer: {
      ...address,
      fullName: address.fullName || row.customerName || '',
      mobile: address.mobile || row.phone || '',
      email: address.email || row.email || '',
    },
    items: mappedItems,
    couponCode: row.couponCode ?? null,
    statusHistory: (row.statusHistory || []).map((entry) => ({
      status: entry.status,
      changedAt: toDate(entry.changedAt),
      note: entry.note || '',
      changedBy: entry.changedBy || '',
    })),
    pricing: {
      unitCount,
      subtotal,
      offerDiscount: toNumber(row.offerDiscount),
      couponDiscount: toNumber(row.couponDiscount),
      discount,
      offerGroups: Math.floor(unitCount / OFFER_GROUP_SIZE),
      total: toNumber(row.totalAmount),
    },
  };
}

export function mapAdmin(doc) {
  const row = toPlain(doc);
  if (!row) return null;
  return {
    id: toId(row),
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: Boolean(row.isActive),
    lastLoginAt: toDate(row.lastLoginAt),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

export function mapCustomer(doc) {
  const row = toPlain(doc);
  if (!row) return null;
  const orders = Array.isArray(row.orderIds) ? row.orderIds : [];
  return {
    id: toId(row),
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    emailVerified: Boolean(row.emailVerified),
    phoneVerified: Boolean(row.phoneVerified),
    avatarUrl: row.avatarUrl || null,
    addressCount: Array.isArray(row.addresses) ? row.addresses.length : 0,
    defaultAddress: Array.isArray(row.addresses)
      ? row.addresses.find((address) => address.isDefault) || null
      : null,
    orderCount: orders.length,
    lastLoginAt: toDate(row.lastLoginAt),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

export function mapCoupon(doc) {
  const row = toPlain(doc);
  if (!row) return null;
  return {
    id: toId(row),
    code: row.code,
    description: row.description || '',
    discountType: row.discountType,
    discountValue: toNumber(row.discountValue),
    minOrderAmount: toNumber(row.minOrderAmount),
    expiresAt: toDate(row.expiresAt),
    usageLimit: row.usageLimit ?? null,
    usedCount: toNumber(row.usedCount),
    isActive: Boolean(row.isActive),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

export function mapInventory(doc) {
  const row = toPlain(doc);
  if (!row) return null;
  const product = row.productId && typeof row.productId === 'object' ? toPlain(row.productId) : null;
  return {
    id: toId(row),
    productId: product ? toId(product) : row.productId ? String(row.productId) : null,
    productName: product?.name ?? null,
    productSlug: product?.slug ?? null,
    sku: row.sku || product?.sku || '',
    availableStock: toNumber(row.availableStock),
    reservedStock: toNumber(row.reservedStock),
    lowStockThreshold: toNumber(row.lowStockThreshold),
    isLowStock: toNumber(row.availableStock) <= toNumber(row.lowStockThreshold),
    movements: (row.movements || []).map((movement) => ({
      id: toId(movement),
      type: movement.type,
      quantity: toNumber(movement.quantity),
      balanceAfter: toNumber(movement.balanceAfter),
      reference: movement.reference || '',
      note: movement.note || '',
      createdAt: toDate(movement.createdAt),
    })),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

const LOCALIZED_HERO_FIELDS = [
  'heading',
  'headingHighlight',
  'subtitle',
  'description',
  'primaryButtonText',
  'secondaryButtonText',
];

const mapHeroLocale = (row, lang) => {
  const source =
    row.locales && typeof row.locales === 'object' && row.locales[lang] && typeof row.locales[lang] === 'object'
      ? row.locales[lang]
      : {};
  const legacy = lang === 'en' ? row : {};
  const valueFor = (field) => {
    const value = source[field];
    if (value !== undefined && value !== null) return value;
    return legacy[field] ?? '';
  };
  return Object.fromEntries(LOCALIZED_HERO_FIELDS.map((field) => [field, valueFor(field)]));
};

export function mapHero(doc) {
  const row = toPlain(doc);
  if (!row) return null;
  return {
    id: toId(row),
    locales: {
      en: mapHeroLocale(row, 'en'),
      ta: mapHeroLocale(row, 'ta'),
    },
    heading: row.heading || '',
    headingHighlight: row.headingHighlight || '',
    subtitle: row.subtitle || '',
    description: row.description || '',
    backgroundImage: row.backgroundImage || '',
    productImage: row.productImage || '',
    desktopBannerImage: row.desktopBannerImage || '',
    mobileBannerImage: row.mobileBannerImage || '',
    primaryButtonText: row.primaryButtonText || '',
    primaryButtonLink: row.primaryButtonLink || '',
    secondaryButtonText: row.secondaryButtonText || '',
    secondaryButtonLink: row.secondaryButtonLink || '',
    textAlign: ['left', 'center', 'right'].includes(row.textAlign) ? row.textAlign : 'left',
    isVisible: row.isVisible !== false,
    updatedAt: toDate(row.updatedAt),
    createdAt: toDate(row.createdAt),
  };
}

export function mapNotification(doc) {
  const row = toPlain(doc);
  if (!row) return null;
  return {
    id: toId(row),
    title: row.title || '',
    message: row.message || '',
    type: row.type || 'info',
    isRead: Boolean(row.isRead),
    createdAt: toDate(row.createdAt),
  };
}
