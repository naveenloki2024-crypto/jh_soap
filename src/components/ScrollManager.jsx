import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Restores scroll on navigation: scrolls to a #hash target when present,
 * otherwise returns to the top. React Router does not do this automatically.
 */
export default function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
}
