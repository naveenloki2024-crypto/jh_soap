import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import FormAlert from '../components/FormAlert';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/auth';

/** Post-signup verification notice, also reachable directly with ?email=. */
const VerifyEmailPage = () => {
  const { resendVerification } = useAuth();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [state, setState] = useState('idle');

  const handleResend = async () => {
    if (!email || state === 'sending') return;
    setState('sending');
    try {
      await resendVerification(email);
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <AuthLayout
      eyebrow="Email verification"
      title="Verify your email"
      subtitle={email ? `We sent a verification link to ${email}.` : 'Check your inbox for the verification link.'}
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
          Open the link in your verification email to activate your account. Didn&apos;t get it?
          Check spam, or request another below.
        </p>

        {state === 'sent' && <FormAlert variant="success">Verification email sent again.</FormAlert>}
        {state === 'error' && (
          <FormAlert variant="error">Could not resend right now. Please try again shortly.</FormAlert>
        )}

        <button
          type="button"
          className="auth-submit auth-submit--outline"
          onClick={handleResend}
          disabled={!email || state === 'sending'}
        >
          {state === 'sending' ? (
            <>
              <Spinner />
              Sending…
            </>
          ) : (
            'Resend verification email'
          )}
        </button>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmailPage;
