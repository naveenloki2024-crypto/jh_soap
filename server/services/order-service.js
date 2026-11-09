import crypto from 'node:crypto';
import Coupon from '../models/Coupon.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { ApiError, badRequest, conflict, notFound } from '../lib/http.js';
import { PAYMENT_METHODS } from '../lib/constants.js';
import { clean, normalizePhone, validateOrderPayload } from '../lib/validation.js';
import { priceOrder } from './order-pricing.js';
import {
  decrementInventory,
  ensureInventory,
  incrementInventory,
} from './inventory-service.js';

function buildOrderNumber() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  const suffix = crypto.randomInt(0, 0xffff).toString(16).padStart(4, '0').toUpperCase();
  return `JH-${stamp}-${suffix}`;
}

async function rollbackStock(decremented) {
  for (const entry of decremented) {
    await Product.updateOne(
      { _id: entry.productId },
      { $inc: { stockQuantity: entry.quantity } },
    ).catch(() => {});
    await incrementInventory({
      productId: entry.productId,
      quantity: entry.quantity,
      type: 'return',
      reference: 'rollback',
      note: 'Order creation rolled back',
    }).catch(() => {});
  }
}

async function resolveCustomer({ customerId, shipping }) {
  if (customerId) {
    const existing = await Customer.findById(customerId);
    if (existing) {
      if (!existing.name && shipping.fullName) existing.name = shipping.fullName;
      if (!existing.phone && shipping.mobile) existing.phone = shipping.mobile;
      await existing.save().catch(() => {});
      return existing;
    }
  }

  const queries = [{ phone: shipping.mobile }];
  if (shipping.email) queries.push({ email: shipping.email.toLowerCase() });
  let customer = await Customer.findOne({ $or: queries });
  if (customer) {
    if (!customer.name && shipping.fullName) customer.name = shipping.fullName;
    await customer.save().catch(() => {});
    return customer;
  }

  customer = await Customer.create({
    name: shipping.fullName,
    email: shipping.email || undefined,
    phone: shipping.mobile,
    emailVerified: false,
    phoneVerified: false,
  });
  return customer;
}

async function findCoupon(code) {
  const normalized = clean(code).toUpperCase();
  if (!normalized) return null;
  const coupon = await Coupon.findOne({ code: normalized });
  if (!coupon) throw badRequest('Coupon code is not valid.');
  return coupon;
}

/**
 * Creates an order from trusted product prices, decrements product and
 * inventory stock, and links the order to a customer account when possible.
 */
export async function createOrder({
  payload,
  customerId = null,
  idempotencyKey = '',
  paymentMethod = null,
}) {
  const { errors, customer: shipping, items } = validateOrderPayload(payload);
  if (Object.keys(errors).length > 0) {
    throw badRequest('Please check the checkout details.', errors);
  }

  const method = PAYMENT_METHODS.includes(paymentMethod)
    ? paymentMethod
    : payload?.paymentMethod === 'razorpay'
      ? 'razorpay'
      : 'cod';

  const key = clean(idempotencyKey).slice(0, 120);
  if (key) {
    const existing = await Order.findOne({ idempotencyKey: key });
    if (existing) return { order: existing, duplicate: true };
  }

  const productQueries = items.map((item) =>
    /^[a-f0-9]{24}$/i.test(item.id) ? { _id: item.id } : { slug: item.id },
  );
  const products = await Product.find({ $or: productQueries, isActive: true });
  if (products.length !== items.length) {
    throw badRequest('One or more products are no longer available.');
  }

  const coupon = await findCoupon(payload?.couponCode);
  const pricing = priceOrder({ items, products, coupon });
  if (pricing.lineItems.length !== items.length) {
    throw badRequest('One or more products are no longer available.');
  }
  if (pricing.couponError) throw badRequest(pricing.couponError);

  const orderNumber = buildOrderNumber();
  const decremented = [];

  try {
    for (const item of pricing.lineItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.productId, isActive: true, stockQuantity: { $gte: item.quantity } },
        { $inc: { stockQuantity: -item.quantity } },
        { new: true },
      );
      if (!updated) {
        throw conflict(`${item.name} does not have enough stock available.`, 'OUT_OF_STOCK');
      }

      await ensureInventory(updated, updated.stockQuantity + item.quantity);
      const inventoryUpdated = await decrementInventory({
        productId: item.productId,
        quantity: item.quantity,
        reference: orderNumber,
        note: `Order ${orderNumber}`,
      });
      if (!inventoryUpdated) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { stockQuantity: item.quantity } },
        );
        throw conflict(`${item.name} does not have enough stock available.`, 'OUT_OF_STOCK');
      }

      decremented.push({ productId: item.productId, quantity: item.quantity });
    }

    const customer = await resolveCustomer({ customerId, shipping });

    let order = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        order = await Order.create({
          orderNumber: attempt === 0 ? orderNumber : buildOrderNumber(),
          customerId: customer._id,
          customerName: shipping.fullName,
          email: shipping.email,
          phone: shipping.mobile,
          shippingAddress: shipping,
          items: pricing.lineItems,
          subtotal: pricing.subtotal,
          offerDiscount: pricing.offerDiscount,
          couponDiscount: pricing.couponDiscount,
          discount: pricing.discount,
          totalAmount: pricing.totalAmount,
          couponCode: coupon?.code || null,
          paymentMethod: method,
          paymentStatus: 'pending',
          orderStatus: 'received',
          idempotencyKey: key || undefined,
          statusHistory: [
            {
              status: 'received',
              changedAt: new Date(),
              note: 'Order placed',
              changedBy: shipping.fullName,
            },
          ],
        });
        break;
      } catch (error) {
        if (error?.code === 11000 && error?.keyPattern?.idempotencyKey) {
          await rollbackStock(decremented);
          const existing = await Order.findOne({ idempotencyKey: key });
          if (existing) return { order: existing, duplicate: true };
        }
        if (error?.code === 11000 && error?.keyPattern?.orderNumber && attempt < 2) {
          continue;
        }
        throw error;
      }
    }

    if (!order) throw new ApiError(500, 'Could not allocate an order number.');

    const postCreate = [
      Customer.updateOne({ _id: customer._id }, { $addToSet: { orderIds: order._id } }),
    ];
    if (pricing.couponDiscount > 0 && coupon) {
      postCreate.push(Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } }));
    }
    await Promise.allSettled(postCreate);

    return { order, duplicate: false };
  } catch (error) {
    await rollbackStock(decremented);
    throw error;
  }
}

export async function findOrderByReference(reference) {
  const value = clean(reference);
  if (!value) return null;
  if (/^[a-f0-9]{24}$/i.test(value)) {
    return Order.findById(value);
  }
  return Order.findOne({ orderNumber: value });
}

export async function findAccessibleOrder(reference, { userId = null, phone = '', admin = false }) {
  const order = await findOrderByReference(reference);
  if (!order) throw notFound('Order not found.');
  if (admin) return order;
  if (userId && order.customerId && String(order.customerId) === String(userId)) return order;
  if (phone && normalizePhone(order.phone) === normalizePhone(phone)) return order;
  throw notFound('Order not found.');
}

export async function restoreOrderStock(order, reason = 'Order cancelled') {
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, stockRestored: false },
    { $set: { stockRestored: true } },
    { new: true },
  );
  if (!claimed) return false;

  for (const item of claimed.items) {
    await Product.updateOne(
      { _id: item.productId },
      { $inc: { stockQuantity: item.quantity } },
    );
    await incrementInventory({
      productId: item.productId,
      quantity: item.quantity,
      type: 'cancel',
      reference: claimed.orderNumber,
      note: reason,
    });
  }
  return true;
}

/**
 * Re-reserves stock for an order whose previous reservation was released
 * (for example after a Checkout Session expired and the customer retries).
 */
export async function reserveOrderStock(order) {
  const reserved = [];
  try {
    for (const item of order.items) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.productId, isActive: true, stockQuantity: { $gte: item.quantity } },
        { $inc: { stockQuantity: -item.quantity } },
        { new: true },
      );
      if (!updated) {
        throw conflict(`${item.name} does not have enough stock available.`, 'OUT_OF_STOCK');
      }

      await ensureInventory(updated, updated.stockQuantity + item.quantity);
      const inventoryUpdated = await decrementInventory({
        productId: item.productId,
        quantity: item.quantity,
        reference: order.orderNumber,
        note: `Order ${order.orderNumber} payment retry`,
      });
      if (!inventoryUpdated) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { stockQuantity: item.quantity } },
        );
        throw conflict(`${item.name} does not have enough stock available.`, 'OUT_OF_STOCK');
      }

      reserved.push({ productId: item.productId, quantity: item.quantity });
    }

    await Order.updateOne({ _id: order._id }, { $set: { stockRestored: false } });
    return true;
  } catch (error) {
    await rollbackStock(reserved);
    throw error;
  }
}
