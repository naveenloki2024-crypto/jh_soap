import env from '../config/env.js';
import { ApiError, serviceUnavailable } from '../lib/http.js';

export function isEmailConfigured() {
  return Boolean(env.RESEND_API_KEY && env.AUTH_FROM_EMAIL);
}

async function sendEmail({ to, subject, html }) {
  if (!isEmailConfigured()) {
    throw serviceUnavailable('Email delivery is not configured on this server.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.AUTH_FROM_EMAIL, to: [to], subject, html }),
  });

  if (!response.ok) {
    throw new ApiError(502, 'Could not send email right now. Please try again later.');
  }
}

export function sendPasswordResetEmail({ to, resetUrl }) {
  return sendEmail({
    to,
    subject: 'Reset your JH Soaps password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2>Reset your password</h2>
        <p>Use the link below to choose a new password. It expires in 30 minutes.</p>
        <p><a href="${resetUrl}">Reset password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
}

export function sendVerificationEmail({ to, verifyUrl }) {
  return sendEmail({
    to,
    subject: 'Verify your JH Soaps email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2>Verify your email</h2>
        <p><a href="${verifyUrl}">Verify email address</a></p>
      </div>
    `,
  });
}
