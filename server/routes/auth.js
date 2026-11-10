import crypto from 'node:crypto';
import { Router } from 'express';
import env from '../config/env.js';
import Admin from '../models/Admin.js';
import Customer from '../models/Customer.js';
import {
  clearSessionCookie,
  createSessionToken,
  durationToMs,
  extractSessionToken,
  sessionUserFromAdmin,
  sessionUserFromCustomer,
  setSessionCookie,
  verifySessionToken,
} from '../lib/auth-session.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  badRequest,
  conflict,
  unauthorized,
  notFound,
  asyncHandler,
} from '../lib/http.js';
import {
  validateLoginPayload,
  validateOtpVerify,
  validatePasswordChange,
  validatePasswordReset,
  validatePasswordResetRequest,
  validatePhoneRequest,
  validateRegisterPayload,
} from '../lib/validation.js';
import { sendOtpSms } from '../services/sms.js';
import { sendPasswordResetEmail } from '../services/mailer.js';

const router = Router();

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

async function issueSession(res, user, role, remember = false) {
  const token = await createSessionToken(user, role);
  setSessionCookie(res, token, { remember });
  const sessionUser =
    role === 'customer' ? sessionUserFromCustomer(user) : sessionUserFromAdmin(user);
  return {
    session: {
      user: sessionUser,
      expiresAt: new Date(Date.now() + durationToMs(process.env.JWT_EXPIRES_IN || '7d')).toISOString(),
    },
  };
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { errors, values } = validateRegisterPayload(req.body);
    if (Object.keys(errors).length > 0) throw badRequest('Please check your details.', errors);

    const collision = await Customer.findOne({
      $or: values.phone
        ? [{ email: values.email }, { phone: values.phone }]
        : [{ email: values.email }],
    });
    if (collision) {
      throw conflict('An account with this email or phone already exists.', 'ACCOUNT_EXISTS');
    }

    const customer = await Customer.create({
      name: values.name,
      email: values.email,
      phone: values.phone,
      passwordHash: await hashPassword(values.password),
      emailVerified: true,
      phoneVerified: Boolean(values.phone),
      lastLoginAt: new Date(),
    });

    res.status(201).json(await issueSession(res, customer, 'customer'));
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { errors, values } = validateLoginPayload(req.body);
    if (Object.keys(errors).length > 0) throw badRequest('Please check your details.', errors);

    const customer = await Customer.findByEmail(values.email);
    const valid = customer ? await verifyPassword(values.password, customer.passwordHash) : false;
    if (!valid) throw unauthorized('Invalid login credentials.');

    customer.lastLoginAt = new Date();
    await customer.save();

    res.json(await issueSession(res, customer, 'customer', values.remember));
  }),
);

router.post(
  '/admin/login',
  asyncHandler(async (req, res) => {
    const { errors, values } = validateLoginPayload(req.body);
    if (Object.keys(errors).length > 0) throw badRequest('Please check your details.', errors);

    const admin = await Admin.findByEmail(values.email);
    const valid = admin ? await verifyPassword(values.password, admin.passwordHash) : false;
    if (!valid) throw unauthorized('Invalid login credentials.');

    admin.lastLoginAt = new Date();
    await admin.save();

    res.json(await issueSession(res, admin, admin.role, values.remember));
  }),
);

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

router.get(
  '/session',
  asyncHandler(async (req, res) => {
    const token = extractSessionToken(req);
    const payload = await verifySessionToken(token);
    if (!payload) return res.json({ session: null, user: null });

    const user =
      payload.role === 'admin' || payload.role === 'super_admin'
        ? await Admin.findById(payload.sub)
        : await Customer.findById(payload.sub);

    if (!user) {
      clearSessionCookie(res);
      return res.json({ session: null, user: null });
    }

    const sessionUser =
      payload.role === 'admin' || payload.role === 'super_admin'
        ? sessionUserFromAdmin(user)
        : sessionUserFromCustomer(user);

    res.json({
      session: {
        user: sessionUser,
        expiresAt: new Date(Number(payload.exp) * 1000).toISOString(),
      },
    });
  }),
);

router.post(
  '/otp/request',
  asyncHandler(async (req, res) => {
    const { errors, phone } = validatePhoneRequest(req.body);
    if (Object.keys(errors).length > 0) throw badRequest('Enter a valid mobile number.', errors);

    const code = String(crypto.randomInt(100000, 1000000));
    await sendOtpSms({ to: phone, code });

    let customer = await Customer.findOne({ phone });
    if (!customer) {
      customer = await Customer.create({
        phone,
        name: '',
        emailVerified: false,
        phoneVerified: false,
      });
    }

    await Customer.updateOne(
      { _id: customer._id },
      {
        $set: {
          otpHash: sha256(code),
          otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
          otpAttempts: 0,
        },
      },
    );

    res.json({ message: 'Verification code sent.' });
  }),
);

router.post(
  '/otp/verify',
  asyncHandler(async (req, res) => {
    const { errors, values } = validateOtpVerify(req.body);
    if (Object.keys(errors).length > 0) throw badRequest('Enter a valid code.', errors);

    const customer = await Customer.findOne({ phone: values.phone }).select(
      '+otpHash +otpExpiresAt +otpAttempts',
    );
    if (!customer || !customer.otpHash || !customer.otpExpiresAt) {
      throw unauthorized('The verification code is invalid or has expired.');
    }
    if (customer.otpExpiresAt.getTime() <= Date.now()) {
      throw unauthorized('The verification code has expired. Request a new one.');
    }
    if (customer.otpAttempts >= 5) {
      throw unauthorized('Too many attempts. Request a new code.');
    }

    if (!safeEqual(sha256(values.token), customer.otpHash)) {
      await Customer.updateOne({ _id: customer._id }, { $inc: { otpAttempts: 1 } });
      throw unauthorized('The verification code is incorrect.');
    }

    await Customer.updateOne(
      { _id: customer._id },
      {
        $set: {
          phoneVerified: true,
          lastLoginAt: new Date(),
          otpHash: null,
          otpExpiresAt: null,
          otpAttempts: 0,
        },
      },
    );
    customer.phoneVerified = true;

    res.json(await issueSession(res, customer, 'customer', values.remember));
  }),
);

router.post(
  '/password/forgot',
  asyncHandler(async (req, res) => {
    const { errors, email } = validatePasswordResetRequest(req.body);
    if (Object.keys(errors).length > 0) throw badRequest('Enter a valid email address.', errors);

    const customer = await Customer.findOne({ email });
    if (customer) {
      const token = crypto.randomBytes(32).toString('hex');
      await Customer.updateOne(
        { _id: customer._id },
        {
          $set: {
            resetTokenHash: sha256(token),
            resetTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
          },
        },
      );

      const resetUrl = `${env.PUBLIC_APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail({ to: customer.email, resetUrl });
    }

    res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  }),
);

router.post(
  '/password/reset',
  asyncHandler(async (req, res) => {
    const { errors, values } = validatePasswordReset(req.body);
    if (Object.keys(errors).length > 0) throw badRequest('Please check your reset details.', errors);

    const customer = await Customer.findOne({
      resetTokenHash: sha256(values.token),
      resetTokenExpiresAt: { $gt: new Date() },
    }).select('+resetTokenHash +resetTokenExpiresAt');

    if (!customer) throw badRequest('This reset link is invalid or has expired.');

    customer.passwordHash = await hashPassword(values.password);
    customer.resetTokenHash = undefined;
    customer.resetTokenExpiresAt = undefined;
    customer.lastLoginAt = new Date();
    await customer.save();

    res.json(await issueSession(res, customer, 'customer'));
  }),
);

router.post(
  '/password/update',
  asyncHandler(async (req, res) => {
    const token = extractSessionToken(req);
    const payload = await verifySessionToken(token);
    if (!payload || payload.role !== 'customer') throw unauthorized();

    const { errors, values } = validatePasswordChange(req.body);
    if (Object.keys(errors).length > 0) throw badRequest('Please check your password.', errors);

    const customer = await Customer.findById(payload.sub);
    if (!customer) throw notFound('Account not found.');

    customer.passwordHash = await hashPassword(values.password);
    await customer.save();
    res.json({ message: 'Password updated.' });
  }),
);

router.post('/verify-email/resend', (req, res) => {
  res.json({ message: 'Email verification is not required for this account.' });
});

export default router;
