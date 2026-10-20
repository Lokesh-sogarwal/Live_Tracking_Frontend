import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import API_BASE_URL from "../../../utils/config";
import AuthLayout from "../AuthLayout";
import PasswordField from "../PasswordField";

const MIN = 8;

// Opened from the emailed link: /reset-password#token=… (the fragment never reaches a server).
const ResetPassword = () => {
  const token = useMemo(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || "", []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const next = {};
    if (password.length < MIN) next.password = `Use at least ${MIN} characters.`;
    if (confirm !== password) next.confirm = "The passwords don't match.";
    setErrors(next);
    setError("");
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset_password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 429 ? "Too many attempts. Wait a few minutes and try again." : data.error || "Something went wrong");
        return;
      }
      // Drop the token from the address bar and history.
      window.history.replaceState(null, "", window.location.pathname);
      setDone(true);
    } catch {
      setError("Server error. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout heading="Choose a new password." intro="Pick something you haven't used here before. Once it's saved, every device signed in to your account is signed out." back={{ to: "/login", label: "Back to sign in" }}>
      {done ? (
        <div className="si-done" role="status">
          <span className="si-done-icon" aria-hidden="true"><FiCheckCircle /></span>
          <h2 className="si-title">Password changed</h2>
          <p className="si-subtitle">Sign in with your new password.</p>
          <Link to="/login" className="si-submit si-submit-link">Sign in</Link>
        </div>
      ) : !token ? (
        <div className="si-done" role="alert">
          <span className="si-done-icon is-error" aria-hidden="true"><FiAlertCircle /></span>
          <h2 className="si-title">Link incomplete</h2>
          <p className="si-subtitle">This reset link is missing its code. Open the link from your email again, or request a new one.</p>
          <Link to="/forgot-password" className="si-submit si-submit-link">Request a new link</Link>
        </div>
      ) : (
        <>
          <h2 className="si-title">Set a new password</h2>
          <p className="si-subtitle">This link works once and expires soon.</p>
          <form className="si-form" onSubmit={submit} noValidate aria-busy={submitting}>
            <PasswordField
              id="reset-password"
              label="New password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              hint={`At least ${MIN} characters.`}
            />
            <PasswordField
              id="reset-confirm"
              label="Confirm new password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={errors.confirm}
            />
            {error && (
              <p className="si-error" role="alert">
                <FiAlertCircle aria-hidden="true" /> {error}
                {/expired|invalid/i.test(error) && <> <Link to="/forgot-password">Request a new link</Link></>}
              </p>
            )}
            <button type="submit" className="si-submit" disabled={submitting}>
              {submitting && <span className="si-spinner" aria-hidden="true" />}
              {submitting ? "Saving…" : "Save new password"}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
