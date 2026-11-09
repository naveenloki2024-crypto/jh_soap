import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateOrderPayload,
  validateProductPayload,
  validateStatusUpdate,
  validateRegisterPayload,
  validatePasswordReset,
  parsePagination,
  slugify,
} from '../lib/validation.js';

const validCustomer = {
  fullName: 'Janani Hariharan',
  mobile: '9876543210',
  address: '12, Green Street',
  area: 'Gandhi Nagar',
  city: 'Coimbatore',
  district: 'Coimbatore',
  state: 'Tamil Nadu',
  pincode: '641001',
};

test('validateOrderPayload accepts a valid payload', () => {
  const { errors, items, customer } = validateOrderPayload({
    customer: validCustomer,
    items: [{ id: 'vetiver', qty: 2 }],
  });
  assert.deepEqual(errors, {});
  assert.equal(items.length, 1);
  assert.equal(items[0].qty, 2);
  assert.equal(customer.state, 'Tamil Nadu');
});

test('validateOrderPayload rejects bad phone, pincode and empty cart', () => {
  const { errors } = validateOrderPayload({
    customer: { ...validCustomer, mobile: '12345', pincode: '000' },
    items: [],
  });
  assert.ok(errors.mobile);
  assert.ok(errors.pincode);
  assert.ok(errors.items);
});

test('validateOrderPayload drops invalid and negative quantities', () => {
  const { items, errors } = validateOrderPayload({
    customer: validCustomer,
    items: [
      { id: 'vetiver', qty: -3 },
      { id: 'aloevera', qty: 0 },
      { id: 'charcoal', qty: 2.5 },
      { id: 'redwine', qty: 1 },
    ],
  });
  assert.deepEqual(items, [{ id: 'redwine', qty: 1 }]);
  assert.equal(errors.items, undefined);
});

test('validateOrderPayload deduplicates repeated products', () => {
  const { items } = validateOrderPayload({
    customer: validCustomer,
    items: [
      { id: 'vetiver', qty: 1 },
      { id: 'vetiver', qty: 5 },
    ],
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].qty, 1);
});

test('validateProductPayload requires core fields and coerces price', () => {
  const bad = validateProductPayload({ name: '', price: 'abc' });
  assert.ok(bad.errors.name);
  assert.ok(bad.errors.price);

  const good = validateProductPayload({
    name: 'Neem Soap',
    price: '150.456',
    category: 'Herbal',
    stockQuantity: 10,
  });
  assert.deepEqual(good.errors, {});
  assert.equal(good.values.slug, 'neem-soap');
  assert.equal(good.values.regularPrice, 150.46);
  assert.equal(good.values.stockQuantity, 10);
});

test('validateProductPayload partial mode only validates provided fields', () => {
  const { errors, values } = validateProductPayload({ price: 120 }, { partial: true });
  assert.deepEqual(errors, {});
  assert.deepEqual(values, { regularPrice: 120 });
});

test('validateProductPayload rejects negative stock and bad image url', () => {
  const { errors } = validateProductPayload({
    name: 'X',
    price: 10,
    stockQuantity: -1,
    imageUrl: 'javascript:alert(1)',
  });
  assert.ok(errors.stockQuantity);
  assert.ok(errors.images);
});

test('validateStatusUpdate enforces allowed values', () => {
  const bad = validateStatusUpdate({ orderStatus: 'flying' });
  assert.ok(bad.errors.orderStatus);

  const good = validateStatusUpdate({ orderStatus: 'shipped' });
  assert.deepEqual(good.errors, {});
  assert.equal(good.values.orderStatus, 'shipped');
});

test('validateStatusUpdate requires a reference when marking paid', () => {
  const missingRef = validateStatusUpdate({ paymentStatus: 'paid' });
  assert.ok(missingRef.errors.paymentReference);

  const withRef = validateStatusUpdate({ paymentStatus: 'paid', paymentReference: 'UPI-123' });
  assert.deepEqual(withRef.errors, {});
  assert.equal(withRef.values.paymentStatus, 'paid');
});

test('validateRegisterPayload normalises email and phone', () => {
  const { errors, values } = validateRegisterPayload({
    fullName: 'Janani',
    email: ' J@Example.COM ',
    phone: '+91 98765 43210',
    password: 'correct horse battery',
  });
  assert.deepEqual(errors, {});
  assert.equal(values.email, 'j@example.com');
  assert.equal(values.phone, '9876543210');
});

test('validatePasswordReset enforces token and password length', () => {
  const missing = validatePasswordReset({ password: 'short' });
  assert.ok(missing.errors.token);
  assert.ok(missing.errors.password);

  const good = validatePasswordReset({ token: 'abc', password: 'long enough password' });
  assert.deepEqual(good.errors, {});
});

test('parsePagination clamps limits and page', () => {
  assert.deepEqual(parsePagination({}), { page: 1, limit: 20, offset: 0 });
  assert.deepEqual(parsePagination({ page: '3', limit: '10' }), {
    page: 3,
    limit: 10,
    offset: 20,
  });
  assert.equal(parsePagination({ limit: '9999' }).limit, 100);
  assert.equal(parsePagination({ page: '-4' }).page, 1);
});

test('slugify normalises names', () => {
  assert.equal(slugify('  Aavaram Poo! '), 'aavaram-poo');
});
