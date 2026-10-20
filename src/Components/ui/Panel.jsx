import React from "react";
import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { STATUS_LABELS } from "../../utils/trips";

// Loading / error / empty states shared by panels and pages.
export function LoadingState({ rows = 3 }) {
  return (
    <div className="panel-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="ui-skeleton" />
      ))}
    </div>
  );
}

export function ErrorState({ forbidden = false, message, onRetry }) {
  return (
    <div className="ui-state ui-state-error" role="alert">
      <FiAlertCircle aria-hidden="true" />
      <span>{message || (forbidden ? "You do not have access to this information." : "Could not load this section.")}</span>
      {onRetry && !forbidden && (
        <button type="button" className="ui-btn ui-btn-secondary" onClick={onRetry}>
          <FiRefreshCw aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, children }) {
  return (
    <div className="ui-state">
      {icon && <span className="ui-state-icon" aria-hidden="true">{icon}</span>}
      {title && <strong className="ui-state-title">{title}</strong>}
      {children}
    </div>
  );
}

// Card with title, optional action, and the standard loading / error / empty states.
// `flush` removes body padding (tables run edge to edge).
export function Panel({ title, subtitle, action, status = "ok", onRetry, empty, isEmpty, children, className = "", flush = false, footer }) {
  let content = children;
  if (status === "loading") content = <LoadingState />;
  else if (status === "error" || status === "forbidden") content = <ErrorState forbidden={status === "forbidden"} onRetry={onRetry} />;
  else if (isEmpty) content = <EmptyState>{empty}</EmptyState>;
  const plainState = status !== "ok" || isEmpty;
  return (
    <section className={`ui-card panel ${className}`}>
      {(title || action) && (
        <header className="ui-card-header">
          <div>
            {title && <h2 className="ui-card-title">{title}</h2>}
            {subtitle && <p className="ui-card-subtitle">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={flush && !plainState ? "" : "ui-card-body"}>{content}</div>
      {footer && !plainState && footer}
    </section>
  );
}

export const StatusChip = ({ status, children }) => (
  <span className={`ui-chip ui-chip-${status}`}>{children || STATUS_LABELS[status]}</span>
);

// Role label; colour is decorative, the text carries the meaning.
const ROLE_TONE = { superadmin: "charcoal", admin: "plum", operator: "rose" };
export const RoleBadge = ({ role }) => {
  const key = String(role || "").toLowerCase();
  return <span className={`ui-badge ${ROLE_TONE[key] ? `ui-badge-${ROLE_TONE[key]}` : ""}`}>{role || "—"}</span>;
};
