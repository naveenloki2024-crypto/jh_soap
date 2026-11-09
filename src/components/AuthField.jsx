import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Accessible labelled input used across the auth forms. Shows inline validation
 * once the field has been touched and wires up aria-invalid/aria-describedby.
 */
export function AuthField({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched,
  hint,
  required = true,
  ...inputProps
}) {
  const showError = Boolean(touched && error);

  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>
        {label}
        {required ? (
          <span className="auth-required" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="auth-optional">optional</span>
        )}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`auth-input${showError ? ' has-error' : ''}`}
        aria-invalid={showError || undefined}
        aria-describedby={showError ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...inputProps}
      />
      {showError ? (
        <span className="auth-error" id={`${id}-error`}>
          {error}
        </span>
      ) : hint ? (
        <span className="auth-hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** Password input with an accessible show/hide toggle. */
export function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  touched,
  hint,
  autoComplete = 'current-password',
  required = true,
  ...inputProps
}) {
  const [visible, setVisible] = useState(false);
  const showError = Boolean(touched && error);

  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>
        {label}
        {required ? (
          <span className="auth-required" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="auth-optional">optional</span>
        )}
      </label>
      <div className={`auth-input-wrap${showError ? ' has-error' : ''}`}>
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={autoComplete}
          className="auth-input"
          aria-invalid={showError || undefined}
          aria-describedby={showError ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...inputProps}
        />
        <button
          type="button"
          className="auth-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
        </button>
      </div>
      {showError ? (
        <span className="auth-error" id={`${id}-error`}>
          {error}
        </span>
      ) : hint ? (
        <span className="auth-hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
