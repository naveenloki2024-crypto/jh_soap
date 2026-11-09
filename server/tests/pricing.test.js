import test from 'node:test';
import assert from 'node:assert/strict';

import { priceOrder } from '../services/order-pricing.js';

const vetiver = { _id: 'p1', slug: 'vetiver', name: 'Vettiver', regularPrice: 110, offerPrice: null };
const redwine = { _id: 'p2', slug: 'redwine', name: 'Red Wine', regularPrice: 120, offerPrice: null };

test('three soaps are bundled at the offer price', () => {
  const priced = priceOrder({
    items: [{ id: 'vetiver', qty: 3 }],
    products: [vetiver],
  });
  assert.equal(priced.unitCount, 3);
  assert.equal(priced.subtotal, 330);
  assert.equal(priced.discount, 45);
  assert.equal(priced.totalAmount, 285);
  assert.equal(priced.offerGroups, 1);
});

test('the offer discounts the most expensive units first', () => {
  const priced = priceOrder({
    items: [
      { id: 'vetiver', qty: 2 },
      { id: 'redwine', qty: 1 },
    ],
    products: [vetiver, redwine],
  });
  assert.equal(priced.subtotal, 340);
  assert.equal(priced.discount, 55);
  assert.equal(priced.totalAmount, 285);
});

test('incomplete offer groups remain at regular prices', () => {
  const priced = priceOrder({
    items: [{ id: 'vetiver', qty: 4 }],
    products: [vetiver],
  });
  assert.equal(priced.subtotal, 440);
  assert.equal(priced.discount, 45);
  assert.equal(priced.totalAmount, 395);
  assert.equal(priced.offerGroups, 1);
});

test('coupon discounts apply after the soap offer', () => {
  const coupon = {
    evaluate: (amount) => ({ valid: true, discount: Math.round(amount * 0.1 * 100) / 100 }),
  };
  const priced = priceOrder({
    items: [{ id: 'vetiver', qty: 3 }],
    products: [vetiver],
    coupon,
  });
  assert.equal(priced.offerDiscount, 45);
  assert.equal(priced.couponDiscount, 28.5);
  assert.equal(priced.totalAmount, 256.5);
});

test('unknown products are ignored and never trusted from the browser', () => {
  const priced = priceOrder({
    items: [
      { id: 'missing', qty: 10 },
      { id: 'vetiver', qty: 1 },
    ],
    products: [vetiver],
  });
  assert.equal(priced.lineItems.length, 1);
  assert.equal(priced.lineItems[0].unitPrice, 110);
  assert.equal(priced.totalAmount, 110);
});
