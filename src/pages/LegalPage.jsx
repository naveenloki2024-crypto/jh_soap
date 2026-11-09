import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

const CONTENT = {
  terms: {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    body: [
      'By creating an account and placing an order with JH Soap you agree to provide accurate contact and delivery details.',
      'All products are handmade in small batches. Colours, weight and fragrance may vary slightly between batches.',
      'Prices, including the any-3-soaps-for-₹285 offer, are calculated by our store and confirmed at checkout. Payment is collected on delivery.',
      'Orders may be cancelled before dispatch. Please contact us on WhatsApp for any change to an order.',
    ],
  },
  privacy: {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    body: [
      'We collect only the details needed to fulfil your order: your name, contact number, delivery address and, if you create an account, your email address.',
      'Your password is stored as a salted hash by our authentication service and is never stored by us in plain text.',
      'We never sell your data. It is shared only with the delivery partners needed to complete your order.',
      'You can update your profile details at any time from your account, or contact us to have your account removed.',
    ],
  },
};

export default function LegalPage({ kind = 'terms' }) {
  const content = CONTENT[kind] || CONTENT.terms;

  return (
    <main className="legal-page">
      <div className="legal-shell">
        <span className="legal-mark" aria-hidden="true">
          <Leaf size={26} strokeWidth={1.5} />
        </span>
        <span className="auth-eyebrow">{content.eyebrow}</span>
        <h1 className="legal-title">{content.title}</h1>
        <div className="legal-body">
          {content.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <Link className="auth-link" to="/register">
          Back to creating your account
        </Link>
      </div>
    </main>
  );
}
