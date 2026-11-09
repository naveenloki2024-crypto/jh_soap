import Admin from '../models/Admin.js';
import Customer from '../models/Customer.js';
import { unauthorized, forbidden } from '../lib/http.js';
import { extractSessionToken, verifySessionToken } from '../lib/auth-session.js';
import { ADMIN_ROLES } from '../lib/constants.js';
import { isObjectId } from '../lib/ids.js';

async function readAuth(req) {
  const token = extractSessionToken(req);
  const payload = await verifySessionToken(token);
  if (!payload || !isObjectId(payload.sub)) return null;

  const isAdmin = payload.role === 'admin' || payload.role === 'super_admin';
  const user = isAdmin
    ? await Admin.findById(payload.sub).select('role isActive').lean()
    : await Customer.findById(payload.sub).select('_id').lean();

  if (!user || (isAdmin && user.isActive === false)) return null;
  const role = isAdmin ? user.role : 'customer';
  return { userId: String(payload.sub), role, token };
}

export async function authenticate(req, _res, next) {
  try {
    const auth = await readAuth(req);
    if (!auth) throw unauthorized();
    req.auth = auth;
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    req.auth = await readAuth(req);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req, _res, next) {
  if (!req.auth) return next(unauthorized());
  if (!ADMIN_ROLES.includes(req.auth.role)) return next(forbidden('Admin access required.'));
  next();
}

export function requireSuperAdmin(req, _res, next) {
  if (!req.auth) return next(unauthorized());
  if (req.auth.role !== 'super_admin') return next(forbidden('Super admin access required.'));
  next();
}
