import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiAlertCircle, FiMail, FiUserCheck } from "react-icons/fi";
import API_BASE_URL from "../../../utils/config";
import AuthLayout from "../AuthLayout";

// POST /auth/forgot_password answers the same whether or not the account exists, and says
// how the reset will arrive: an emailed link, or an administrator (when email is not set up).
const ForgotPassword = () => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { delivery, message }

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot_password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 429 ? "Too many requests. Wait a few minutes and try again." : data.error || "Something went wrong");
        return;
      }
      setResult(data);
    } catch {
      setError("Server error. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout heading="Locked out?" intro="It happens. Request a reset and you'll be back to your trips and updates shortly." back={{ to: "/login", label: "Back to sign in" }}>
      {result ? (
        <div className="si-done" role="status">
          <span className="si-done-icon" aria-hidden="true">{result.delivery === "email" ? <FiMail /> : <FiUserCheck />}</span>
          <h2 className="si-title">{result.delivery === "email" ? "Check your email" : "Request sent"}</h2>
          <p className="si-subtitle">{result.message}</p>
          {result.delivery === "admin" && (
            <p className="si-hint si-done-note">When you sign in with the temporary password, you'll be asked to choose a new one.</p>
          )}
          <Link to="/login" className="si-submit si-submit-link">Back to sign in</Link>
        </div>
      ) : (
        <>
          <h2 className="si-title">Forgot password</h2>
          <p className="si-subtitle">Enter the email you sign in with and we'll help you reset your password.</p>
          <form className="si-form" onSubmit={submit} aria-busy={submitting}>
            <div className="si-field">
              <label htmlFor="forgot-email">Email address</label>
              <input
                id="forgot-email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "forgot-error" : undefined}
              />
            </div>
            {error && (
              <p id="forgot-error" className="si-error" role="alert">
                <FiAlertCircle aria-hidden="true" /> {error}
              </p>
            )}
            <button type="submit" className="si-submit" disabled={submitting}>
              {submitting && <span className="si-spinner" aria-hidden="true" />}
              {submitting ? "Sending…" : "Reset password"}
            </button>
          </form>
          <p className="si-alt">
            Remembered it? <Link to="/login">Sign in</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
