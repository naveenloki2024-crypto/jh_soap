import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MailCheck } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { AuthField } from '../components/AuthField';
import FormAlert from '../components/FormAlert';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/auth';
import { friendlyAuthError } from '../utils/authErrors';
import { isValidEmail } from '../utils/authValidation';

const ForgotPasswordPage = () => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState('');

  const validate = () => {
    if (!email.trim()) return 'Please enter your email address.';
    if (!isValidEmail(email)) return 'Please enter a valid email address.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setTouched(true);
    const nextError = validate();
    setError(nextError);
    if (nextError) return;

    setSubmitting(true);
    setFormError('');
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Reset password"
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a secure link to reset it."
      footer={
        <p>
          Remembered it?{' '}
          <Link className="auth-link" to="/login">
            Back to sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="auth-success">
          <span className="auth-success-icon" aria-hidden="true">
            <MailCheck size={34} strokeWidth={1.5} />
          </span>
          <p className="auth-success-text">
            If an account exists for <strong>{email}</strong>, a password reset link is on its way.
            Please check your inbox and spam folder.
          </p>
          <Link className="auth-submit auth-submit--outline" to="/login">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          {formError && <FormAlert variant="error">{formError}</FormAlert>}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <AuthField
              id="forgot-email"
              name="email"
              label="Email address"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFormError('');
                if (touched) setError(validate());
              }}
              onBlur={() => {
                setTouched(true);
                setError(validate());
              }}
              error={error}
              touched={touched}
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
            />

            <button type="submit" className="auth-submit" disabled={submitting} aria-busy={submitting}>
              {submitting ? (
                <>
                  <Spinner />
                  Sending reset link…
                </>
              ) : (
                <>
                  Send reset link
                  <ArrowRight size={17} strokeWidth={1.75} aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
