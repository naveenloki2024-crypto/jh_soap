export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Lightweight password strength used for the register meter. Returns a 0–4
 * score plus a human label; it never blocks submission on its own.
 */
export function passwordStrength(password) {
  const value = String(password || '');
  let score = 0;
  if (value.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  const level = Math.min(score, 4);
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score: level, label: labels[level] };
}
