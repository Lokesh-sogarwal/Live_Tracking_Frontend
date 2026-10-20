import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Accessible modal: labelled, Escape / backdrop to close, focus moved in and trapped, and
// restored to the opener on close. Renders as a bottom sheet on phones (components.css).
export default function Dialog({ open, onClose, title, description, children, footer, size = "md", closeDisabled = false }) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef(null);
  const openerRef = useRef(null);
  // Latest callbacks without re-running the open/close effect (callers pass inline
  // functions; re-running would steal focus from the field being typed in).
  const onCloseRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);
  onCloseRef.current = onClose;
  closeDisabledRef.current = closeDisabled;

  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    const panel = panelRef.current;
    const first = panel?.querySelector("[data-autofocus]") || panel?.querySelector(FOCUSABLE);
    (first || panel)?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape" && !closeDisabledRef.current) {
        e.stopPropagation();
        onCloseRef.current?.();
      } else if (e.key === "Tab" && panel) {
        const items = [...panel.querySelectorAll(FOCUSABLE)];
        if (!items.length) return;
        const firstItem = items[0];
        const lastItem = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstItem) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          e.preventDefault();
          firstItem.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      openerRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="ui-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !closeDisabled && onClose?.()}>
      <div
        ref={panelRef}
        className={`ui-dialog ui-dialog-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
      >
        <div className="ui-dialog-header">
          <div>
            <h2 id={titleId} className="ui-dialog-title">{title}</h2>
            {description && <p id={descId} className="ui-dialog-description">{description}</p>}
          </div>
          <button type="button" className="ui-icon-btn" onClick={onClose} disabled={closeDisabled} aria-label="Close dialog">
            <FiX />
          </button>
        </div>
        <div className="ui-dialog-body">{children}</div>
        {footer && <div className="ui-dialog-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// Confirmation for consequential actions. `tone="danger"` styles the confirm button as
// destructive; `busy` disables both buttons while the request runs.
export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "primary", busy = false, onConfirm, onCancel }) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      closeDisabled={busy}
      footer={
        <>
          <button type="button" className="ui-btn ui-btn-secondary" onClick={onCancel} disabled={busy} data-autofocus>
            {cancelLabel}
          </button>
          <button type="button" className={`ui-btn ${tone === "danger" ? "ui-btn-danger" : "ui-btn-primary"}`} onClick={onConfirm} disabled={busy}>
            {busy && <span className="ui-spinner" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="ui-dialog-message">{message}</p>
    </Dialog>
  );
}
