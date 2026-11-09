import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

/** Inline status message for auth and account forms. */
export default function FormAlert({ variant = 'info', children }) {
  const Icon = variant === 'error' ? AlertCircle : variant === 'success' ? CheckCircle2 : Info;

  return (
    <div
      className={`auth-alert auth-alert--${variant}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
