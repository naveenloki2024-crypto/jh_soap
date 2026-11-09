import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

export function AdminBadge({ tone = 'muted', children }) {
  return <span className={`admin-badge admin-badge--${tone}`}>{children}</span>;
}

export function AdminSpinner({ label = 'Loading' }) {
  return (
    <div className="admin-loading">
      <Loader2 size={22} className="admin-spin" />
      <span>{label}</span>
    </div>
  );
}

export function AdminEmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="admin-empty">
      {Icon ? (
        <span className="admin-empty-icon">
          <Icon size={26} strokeWidth={1.5} />
        </span>
      ) : null}
      <h3>{title}</h3>
      {text ? <p>{text}</p> : null}
      {action}
    </div>
  );
}

export function AdminError({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="admin-error" role="alert">
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function AdminModal({ title, subtitle, onClose, children, footer, size = 'md' }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="admin-modal-overlay" onMouseDown={onClose} role="presentation">
      <div
        className={`admin-modal admin-modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="admin-modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="admin-icon-btn" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </header>
        <div className="admin-modal-body">{children}</div>
        {footer ? <footer className="admin-modal-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function AdminPagination({ page, totalPages, total, onPageChange }) {
  if (!total) return null;
  const pages = Math.max(1, totalPages || 1);
  return (
    <div className="admin-pagination">
      <span>
        Page {page} of {pages} · {total} records
      </span>
      <div className="admin-pagination-actions">
        <button
          type="button"
          className="admin-icon-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          className="admin-icon-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

export function AdminField({ label, hint, error, children, className = '' }) {
  return (
    <label className={`admin-field ${className}`.trim()}>
      <span className="admin-field-label">{label}</span>
      {children}
      {error ? <span className="admin-field-error">{error}</span> : hint ? <span className="admin-field-hint">{hint}</span> : null}
    </label>
  );
}
