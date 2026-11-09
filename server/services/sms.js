import env from '../config/env.js';
import { ApiError, serviceUnavailable } from '../lib/http.js';

export function isSmsConfigured() {
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER);
}

export async function sendOtpSms({ to, code }) {
  if (!isSmsConfigured()) {
    throw serviceUnavailable('Phone OTP delivery is not configured on this server.');
  }

  const body = new URLSearchParams({
    To: `+91${to}`,
    From: env.TWILIO_FROM_NUMBER,
    Body: `${code} is your JH Soaps verification code. It expires in 5 minutes.`,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
  );

  if (!response.ok) {
    throw new ApiError(502, 'Could not send the verification code right now.');
  }
}
