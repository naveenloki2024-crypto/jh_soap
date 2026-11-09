import { Leaf } from 'lucide-react';
import logo from '../assets/logo.png';
import '../styles/BrandLoader.css';

/**
 * Botanical brand loader. Used for the initial app load and session checks —
 * it reflects real loading state and is never shown indefinitely.
 */
export default function BrandLoader({ label = 'Preparing your experience', fullscreen = true }) {
  return (
    <div
      className={`brand-loader${fullscreen ? ' brand-loader--fullscreen' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="brand-loader-mark">
        <span className="brand-loader-ring" aria-hidden="true" />
        <Leaf className="brand-loader-leaf brand-loader-leaf--a" size={18} strokeWidth={1.5} aria-hidden="true" />
        <Leaf className="brand-loader-leaf brand-loader-leaf--b" size={14} strokeWidth={1.5} aria-hidden="true" />
        <img src={logo} alt="" className="brand-loader-logo" />
      </div>
      <span className="brand-loader-tagline">Handmade herbal care</span>
      <span className="brand-loader-label">{label}</span>
    </div>
  );
}
