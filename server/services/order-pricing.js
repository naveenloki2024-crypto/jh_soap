import { OFFER_GROUP_PRICE, OFFER_GROUP_SIZE } from '../lib/constants.js';

const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

/**
 * Prices an order from trusted Product documents (never browser prices) and
 * applies the "any 3 soaps for ₹285" offer to each complete group of 3 units.
 */
export function priceOrder({ items, products, coupon = null }) {
  const productMap = new Map();
  for (const product of products) {
    productMap.set(String(product._id), product);
    productMap.set(product.slug, product);
  }
  const lineItems = [];
  const unitPrices = [];

  for (const item of items) {
    const product = productMap.get(String(item.id));
    if (!product) continue;
    const unitPrice = money(product.offerPrice ?? product.regularPrice);
    const lineTotal = money(unitPrice * item.qty);
    lineItems.push({
      productId: product._id,
      slug: product.slug,
      name: product.name,
      quantity: item.qty,
      unitPrice,
      lineTotal,
    });
    for (let index = 0; index < item.qty; index += 1) unitPrices.push(unitPrice);
  }

  const unitCount = unitPrices.length;
  const subtotal = money(lineItems.reduce((sum, item) => sum + item.lineTotal, 0));
  const sortedPrices = [...unitPrices].sort((a, b) => b - a);

  let offerDiscount = 0;
  const offerGroups = Math.floor(unitCount / OFFER_GROUP_SIZE);
  for (let group = 0; group < offerGroups; group += 1) {
    const groupStart = group * OFFER_GROUP_SIZE;
    const groupSum = sortedPrices
      .slice(groupStart, groupStart + OFFER_GROUP_SIZE)
      .reduce((sum, price) => sum + price, 0);
    offerDiscount += Math.max(groupSum - OFFER_GROUP_PRICE, 0);
  }
  offerDiscount = money(Math.min(offerDiscount, subtotal));

  const afterOffer = money(subtotal - offerDiscount);
  let couponDiscount = 0;
  let couponError = null;
  if (coupon) {
    const evaluation = coupon.evaluate(afterOffer);
    if (evaluation.valid) couponDiscount = money(Math.min(evaluation.discount, afterOffer));
    else couponError = evaluation.message || 'This coupon is not valid for this order.';
  }

  const discount = money(offerDiscount + couponDiscount);
  const totalAmount = money(Math.max(subtotal - discount, 0));

  return {
    lineItems,
    unitCount,
    subtotal,
    offerDiscount,
    couponDiscount,
    discount,
    totalAmount,
    offerGroups,
    couponError,
  };
}
