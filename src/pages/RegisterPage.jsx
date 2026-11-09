import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, MailCheck } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { AuthField, PasswordField } from '../components/AuthField';
import FormAlert from '../components/FormAlert';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/auth';
import { friendlyAuthError } from '../utils/authErrors';
import { isValidEmail, passwordStrength, MIN_PASSWORD_LENGTH } from '../utils/authValidation';
import { getRedirectTarget } from '../utils/redirect';

const INITIAL = { fullName: '', email: '', password: '', confirmPassword: '' };

function validate(values, terms) {
  const errors = {};
  if (values.fullName.trim().length < 2) errors.fullName = 'Please enter your full name.';
  if (!values.email.trim()) errors.email = 'Please enter your email address.';
  else if (!isValidEmail(values.email)) errors.email = 'Please enter a valid email address.';
  if (!values.password) errors.password = 'Please choose a password.';
  else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!values.confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  if (!terms) errors.terms = 'Please accept the terms to continue.';
  return errors;
}

const RegisterPage = () => {
  const { signUp, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = getRedirectTarget(location.search);

  const [values, setValues] = useState(INITIAL);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [resendState, setResendState] = useState('idle');

  const strength = passwordStrength(values.password);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setFormError('');
    if (touched[name]) setErrors(validate({ ...values, [name]: value }, terms));
  };

  const handleBlur = (event) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors(validate(values, terms));
  };

  const handleTerms = (event) => {
    const checked = event.target.checked;
    setTerms(checked);
    if (touched.terms) setErrors(validate(values, checked));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validate(values, terms);
    setErrors(nextErrors);
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true, terms: true });
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError('');

    try {
      const data = await signUp({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
      });

      if (data?.session) {
        navigate(redirectTo, { replace: true });
        return;
      }
      setSentTo(values.email.trim());
    } catch (error) {
      setFormError(friendlyAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendState === 'sending') return;
    setResendState('sending');
    try {
      await resendVerification(sentTo);
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  };

  if (sentTo) {
    return (
      <AuthLayout
        eyebrow="Almost there"
        title="Verify your email"
        subtitle={`We've sent a verification link to ${sentTo}.`}
        footer={
          <p>
            Already verified?{' '}
            <Link className="auth-link" to="/login">
              Sign in
            </Link>
          </p>
        }
      >
        <div className="auth-success">
          <span className="auth-success-icon" aria-hidden="true">
            <MailCheck size={34} strokeWidth={1.5} />
          </span>
          <p className="auth-success-text">
            Click the link in that email to activate your account. If you don&apos;t see it, check
            your spam folder.
          </p>

          {resendState === 'sent' ? (
            <FormAlert variant="success">Verification email sent again.</FormAlert>
          ) : (
            <button
              type="button"
              className="auth-submit auth-submit--outline"
              onClick={handleResend}
              disabled={resendState === 'sending'}
            >
              {resendState === 'sending' ? (
                <>
                  <Spinner />
                  Sending…
                </>
              ) : (
                'Resend verification email'
              )}
            </button>
          )}
          {resendState === 'error' && (
            <FormAlert variant="error">Could not resend right now. Please try again shortly.</FormAlert>
          )}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Join JH Soap"
      title="Create your account"
      subtitle="Save your details, track orders and check out faster."
      footer={
        <p>
          Already have an account?{' '}
          <Link className="auth-link" to="/login">
            Sign in
          </Link>
        </p>
      }
    >
      {formError && <FormAlert variant="error">{formError}</FormAlert>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <AuthField
          id="register-name"
          name="fullName"
          label="Full name"
          value={values.fullName}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.fullName}
          touched={touched.fullName}
          autoComplete="name"
          placeholder="e.g. Janani Hariharan"
        />

        <AuthField
          id="register-email"
          name="email"
          label="Email address"
          type="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.email}
          touched={touched.email}
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
        />

        <PasswordField
          id="register-password"
          name="password"
          label="Password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.password}
          touched={touched.password}
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        />

        {values.password && (
          <div className="auth-strength" aria-hidden="true">
            <span className="auth-strength-track">
              <span
                className={`auth-strength-fill auth-strength-fill--${strength.score}`}
                style={{ width: `${(strength.score / 4) * 100}%` }}
              />
            </span>
            <span className="auth-strength-label">{strength.label}</span>
          </div>
        )}

        <PasswordField
          id="register-confirm"
          name="confirmPassword"
          label="Confirm password"
          value={values.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.confirmPassword}
          touched={touched.confirmPassword}
          autoComplete="new-password"
          placeholder="Re-enter your password"
        />

        <label className={`auth-checkbox${touched.terms && errors.terms ? ' has-error' : ''}`} htmlFor="register-terms">
          <input id="register-terms" type="checkbox" checked={terms} onChange={handleTerms} />
          <span>
            I agree to the <Link className="auth-link" to="/terms">Terms of Service</Link> and{' '}
            <Link className="auth-link" to="/privacy">Privacy Policy</Link>.
          </span>
        </label>
        {touched.terms && errors.terms && <span className="auth-error">{errors.terms}</span>}

        <button type="submit" className="auth-submit" disabled={submitting} aria-busy={submitting}>
          {submitting ? (
            <>
              <Spinner />
              Creating your account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight size={17} strokeWidth={1.75} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
