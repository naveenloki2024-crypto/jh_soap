import { SignJWT, jwtVerify } from 'jose';
import env from '../config/env.js';
import { clearCookie, parseCookies, setCookie } from './cookies.js';

const secretKey = new TextEncoder().encode(env.JWT_SECRET);

const UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function durationToMs(value) {
  const match = String(value).trim().match(/^(\d+)([smhd])$/i);
  if (!match) return UNIT_MS.d;
  return Number(match[1]) * UNIT_MS[match[2].toLowerCase()];
}

export async function createSessionToken(user, role) {
  return new SignJWT({ role, email: user.email || '' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(user._id || user.id))
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secretKey);
}

export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: ['HS256'],
    });
    if (!payload.sub || typeof payload.role !== 'string') return null;
    return payload;
  } catch {
    return null;
  }
}

export function extractSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  if (cookies[env.COOKIE_NAME]) return cookies[env.COOKIE_NAME];
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

export function setSessionCookie(res, token, { remember = false } = {}) {
  const maxAge = remember ? durationToMs(env.JWT_EXPIRES_IN) : undefined;
  setCookie(res, env.COOKIE_NAME, token, { secure: env.COOKIE_SECURE, maxAge });
}

export function clearSessionCookie(res) {
  clearCookie(res, env.COOKIE_NAME, { secure: env.COOKIE_SECURE });
}

export function sessionUserFromCustomer(customer) {
  const id = String(customer._id);
  return {
    id,
    email: customer.email || '',
    phone: customer.phone || '',
    fullName: customer.name || '',
    role: 'customer',
    email_confirmed_at: customer.emailVerified ? new Date().toISOString() : null,
    phone_confirmed_at: customer.phoneVerified ? new Date().toISOString() : null,
    user_metadata: { full_name: customer.name || '' },
  };
}

export function sessionUserFromAdmin(admin) {
  const id = String(admin._id);
  return {
    id,
    email: admin.email || '',
    phone: '',
    fullName: admin.name || '',
    role: admin.role,
    email_confirmed_at: new Date().toISOString(),
    phone_confirmed_at: null,
    user_metadata: { full_name: admin.name || '' },
  };
}

export function sessionPayload(user, expiresInSeconds) {
  return {
    user,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  };
}
