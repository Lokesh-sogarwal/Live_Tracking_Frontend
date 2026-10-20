import React, { cloneElement, isValidElement, useId } from "react";

// Label + control + hint/error, wired with id / aria-describedby / aria-invalid.
// Pass a single input/select/textarea as the child.
export default function Field({ label, hint, error, optional = false, full = false, children }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id || id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? "true" : undefined,
      })
    : children;
  return (
    <div className={`ui-field ${full ? "ui-field-full" : ""}`}>
      <label className="ui-label" htmlFor={isValidElement(children) ? children.props.id || id : undefined}>
        {label} {optional && <span className="ui-label-optional">(optional)</span>}
      </label>
      {control}
      {hint && !error && <span id={hintId} className="ui-hint">{hint}</span>}
      {error && <span id={errorId} className="ui-error-text" role="alert">{error}</span>}
    </div>
  );
}
