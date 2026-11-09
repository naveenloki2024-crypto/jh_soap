import { apiRequest } from './client';

export async function requestSession() {
  return apiRequest('/auth/session');
}

export async function signInWithPassword(payload) {
  return apiRequest('/auth/login', { method: 'POST', body: payload });
}

export async function signInAdminWithPassword(payload) {
  return apiRequest('/auth/admin/login', { method: 'POST', body: payload });
}

export async function signUpWithPassword(payload) {
  return apiRequest('/auth/register', { method: 'POST', body: payload });
}

export async function signOutSession() {
  return apiRequest('/auth/logout', { method: 'POST' });
}

export async function requestPhoneOtp(payload) {
  return apiRequest('/auth/otp/request', { method: 'POST', body: payload });
}

export async function verifyPhoneOtp(payload) {
  return apiRequest('/auth/otp/verify', { method: 'POST', body: payload });
}

export async function requestPasswordReset(email) {
  return apiRequest('/auth/password/forgot', { method: 'POST', body: { email } });
}

export async function resetPassword(payload) {
  return apiRequest('/auth/password/reset', { method: 'POST', body: payload });
}

export async function updatePassword(payload) {
  return apiRequest('/auth/password/update', { method: 'POST', body: payload });
}

export async function resendVerificationEmail(email) {
  return apiRequest('/auth/verify-email/resend', { method: 'POST', body: { email } });
}
