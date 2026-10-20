import React, { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

// Labelled password input with an accessible show/hide toggle (styles: Login.css .si-*).
const PasswordField = ({ id, label, hint, error, autoComplete = "current-password", ...inputProps }) => {
  const [visible, setVisible] = useState(false);
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="si-field">
      <label htmlFor={id}>{label}</label>
      <div className="si-password">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...inputProps}
        />
        <button
          type="button"
          className="si-reveal"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          aria-controls={id}
        >
          {visible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
        </button>
      </div>
      {error && <p id={`${id}-error`} className="si-field-error">{error}</p>}
      {hint && <p id={`${id}-hint`} className="si-hint">{hint}</p>}
    </div>
  );
};

export default PasswordField;
