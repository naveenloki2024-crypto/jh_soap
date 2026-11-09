import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <main className="notfound-page">
      <span className="notfound-mark" aria-hidden="true">
        <Leaf size={30} strokeWidth={1.5} />
      </span>
      <span className="auth-eyebrow">Page not found</span>
      <h1 className="notfound-title">This page has wandered off</h1>
      <p className="notfound-text">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link className="auth-submit" to="/">
        Back to home
      </Link>
    </main>
  );
}
