import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mapCoupon,
  mapInventory,
  mapOrder,
  mapOrderItem,
  mapProduct,
  mapProfile,
} from '../lib/serialize.js';
import { isObjectId } from '../lib/ids.js';
import { normalizePhone } from '../lib/validation.js';

test('mapProduct converts a Product document to the frontend shape', () => {
  const mapped = mapProduct({
    _id: '111111111111111111111111',
    slug: 'vetiver',
    name: 'Vettiver',
    description: 'Earthy',
    regularPrice: 110,
    offerPrice: 99,
    images: ['/soaps/vetiver.png'],
    category: 'Herbal',
    stockQuantity: 42,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });
  assert.equal(mapped.id, 'vetiver');
  assert.equal(mapped.productId, '111111111111111111111111');
  assert.equal(mapped.price, 99);
  assert.equal(mapped.regularPrice, 110);
  assert.equal(mapped.imageUrl, '/soaps/vetiver.png');
  assert.equal(mapped.stockQuantity, 42);
  assert.equal(mapped.isActive, true);
  assert.equal(mapped.createdAt, '2026-01-01T00:00:00.000Z');
});

test('mapProduct uses the regular price when no offer price exists', () => {
  const mapped = mapProduct({ slug: 'aloevera', regularPrice: 110, images: [] });
  assert.equal(mapped.price, 110);
  assert.equal(mapped.offerPrice, null);
  assert.equal(mapped.imageUrl, null);
});

test('mapOrderItem maps an embedded order item', () => {
  const item = mapOrderItem({
    productId: '111111111111111111111111',
    slug: 'vetiver',
    name: 'Vettiver',
    quantity: 3,
    unitPrice: 110,
    lineTotal: 330,
  });
  assert.equal(item.id, 'vetiver');
  assert.equal(item.productId, '111111111111111111111111');
  assert.equal(item.qty, 3);
  assert.equal(item.lineTotal, 330);
});

test('mapOrder builds pricing, status history and customer object', () => {
  const order = mapOrder({
    _id: '222222222222222222222222',
    orderNumber: 'JH-20260101-ABCD',
    customerName: 'Janani',
    email: 'j@example.com',
    phone: '9876543210',
    shippingAddress: { address: '12 Green St', mobile: '9876543210' },
    items: [
      {
        productId: '111111111111111111111111',
        slug: 'vetiver',
        name: 'Vettiver',
        quantity: 3,
        unitPrice: 110,
        lineTotal: 330,
      },
    ],
    subtotal: 330,
    offerDiscount: 45,
    couponDiscount: 0,
    discount: 45,
    totalAmount: 285,
    paymentStatus: 'pending',
    paymentMethod: 'cod',
    orderStatus: 'received',
    paymentReference: null,
    statusHistory: [{ status: 'received', changedAt: new Date('2026-01-01T10:00:00Z') }],
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
  });

  assert.equal(order.pricing.unitCount, 3);
  assert.equal(order.pricing.subtotal, 330);
  assert.equal(order.pricing.offerDiscount, 45);
  assert.equal(order.pricing.couponDiscount, 0);
  assert.equal(order.pricing.discount, 45);
  assert.equal(order.pricing.total, 285);
  assert.equal(order.pricing.offerGroups, 1);
  assert.equal(order.customer.fullName, 'Janani');
  assert.equal(order.customer.mobile, '9876543210');
  assert.equal(order.status, 'received');
  assert.equal(order.statusHistory.length, 1);
});

test('mapProfile uses the customer display name', () => {
  const profile = mapProfile({
    _id: '333333333333333333333333',
    name: 'Janani Hariharan',
    email: 'j@example.com',
    phone: '9876543210',
  });
  assert.equal(profile.id, '333333333333333333333333');
  assert.equal(profile.fullName, 'Janani Hariharan');
});

test('mapCoupon and mapInventory normalise values', () => {
  const coupon = mapCoupon({
    _id: '444444444444444444444444',
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    isActive: true,
  });
  assert.equal(coupon.discountValue, 10);
  assert.equal(coupon.isActive, true);

  const inventory = mapInventory({
    _id: '555555555555555555555555',
    productId: { _id: '111111111111111111111111', name: 'Vettiver', slug: 'vetiver' },
    availableStock: 8,
    lowStockThreshold: 10,
  });
  assert.equal(inventory.isLowStock, true);
  assert.equal(inventory.productName, 'Vettiver');
});

test('isObjectId recognises MongoDB ids only', () => {
  assert.equal(isObjectId('111111111111111111111111'), true);
  assert.equal(isObjectId('vetiver'), false);
  assert.equal(isObjectId('JH-20260101-ABCD'), false);
});

test('normalizePhone strips Indian country and trunk prefixes', () => {
  assert.equal(normalizePhone('+91 98765 43210'), '9876543210');
  assert.equal(normalizePhone('09876543210'), '9876543210');
  assert.equal(normalizePhone('9876543210'), '9876543210');
});
