import crypto from 'node:crypto';
import env from '../config/env.js';
import { ApiError, serviceUnavailable } from '../lib/http.js';

export function isRazorpayConfigured() {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

function authHeader() {
  return `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;
}

export async function createRazorpayOrder({ amount, receipt, notes = {} }) {
  if (!isRazorpayConfigured()) {
    throw serviceUnavailable('Razorpay is not configured on this server.');
  }

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(Number(amount) * 100),
      currency: 'INR',
      receipt,
      notes,
      payment_capture: 1,
    }),
  });

  if (!response.ok) {
    throw new ApiError(502, 'Could not create the payment order right now.');
  }

  return response.json();
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature }) {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return safeEqual(expected, signature || '');
}

export function verifyWebhookSignature({ rawBody, signature }) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return safeEqual(expected, signature || '');
}
