// Turns backend auth errors into short, friendly, actionable messages.
export function friendlyAuthError(error) {
  const message = String(error?.message || '').toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }
  if (message.includes('already exists') || message.includes('already been registered')) {
    return 'An account with this email or phone already exists. Try signing in instead.';
  }
  if (message.includes('password must be') || message.includes('password should be at least')) {
    return 'Your password is too short — use at least 8 characters.';
  }
  if (message.includes('valid email')) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (message.includes('not configured')) {
    return 'This option is not configured on the store yet. Please contact us for help.';
  }
  if (message.includes('verification code has expired') || message.includes('reset link')) {
    return 'This link or code has expired. Please request a new one.';
  }
  if (message.includes('verification code is incorrect')) {
    return 'The verification code is incorrect. Please check and try again.';
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Network error — please check your connection and try again.';
  }

  return error?.message || 'Something went wrong. Please try again.';
}

/** True when the error is specifically about an unverified email address. */
export function isUnverifiedEmailError(error) {
  return String(error?.message || '').toLowerCase().includes('email not confirmed');
}
