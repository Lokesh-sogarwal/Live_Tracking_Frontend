import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { toast, ToastContainer } from "react-toastify";
import { FiAlertCircle } from "react-icons/fi";
import API_BASE_URL from "../../../utils/config";
import { Logout, clearSession } from "../../../utils/logout";
import AuthLayout from "../AuthLayout";
import PasswordField from "../PasswordField";

const MIN = 8;

export const mustChangePassword = () => {
  try {
    return Boolean(jwtDecode(localStorage.getItem("token") || "").must_change_password);
  } catch {
    return false;
  }
};

// Signed-in password change. Required after an administrator issues a temporary password
// (the API refuses everything else until then); otherwise reached from Settings.
const ChangePassword = () => {
  const navigate = useNavigate();
  const forced = useMemo(mustChangePassword, []);
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const next = {};
    if (!form.current) next.current = forced ? "Enter the temporary password." : "Enter your current password.";
    if (form.next.length < MIN) next.next = `Use at least ${MIN} characters.`;
    else if (form.next === form.current) next.next = "Choose a password different from the current one.";
    if (form.confirm !== form.next) next.confirm = "The passwords don't match.";
    setErrors(next);
    setError("");
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/change_password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ current_password: form.current, new_password: form.next }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearSession("/login");
        return;
      }
      if (!res.ok) {
        setError(res.status === 429 ? "Too many attempts. Wait a few minutes and try again." : data.error || "Something went wrong");
        return;
      }
      // Every session was ended server-side; continue with the fresh token.
      localStorage.setItem("token", data.token);
      toast.success("Password changed");
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Server error. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AuthLayout
        heading={forced ? "One more step." : "Keep your account secure."}
        intro={forced ? "You signed in with a temporary password. Choose your own to continue." : "Changing your password signs you out on every other device."}
        back={forced ? null : { to: "/profile_settings", label: "Back to settings" }}
      >
        <h2 className="si-title">{forced ? "Choose a new password" : "Change password"}</h2>
        <p className="si-subtitle">
          {forced ? "An administrator reset your password. Set a new one before you continue." : "Enter your current password, then the new one."}
        </p>
        <form className="si-form" onSubmit={submit} noValidate aria-busy={submitting}>
          <PasswordField id="cp-current" label={forced ? "Temporary password" : "Current password"} value={form.current} onChange={set("current")} error={errors.current} />
          <PasswordField id="cp-new" label="New password" autoComplete="new-password" value={form.next} onChange={set("next")} error={errors.next} hint={`At least ${MIN} characters.`} />
          <PasswordField id="cp-confirm" label="Confirm new password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} error={errors.confirm} />
          {error && (
            <p className="si-error" role="alert">
              <FiAlertCircle aria-hidden="true" /> {error}
            </p>
          )}
          <button type="submit" className="si-submit" disabled={submitting}>
            {submitting && <span className="si-spinner" aria-hidden="true" />}
            {submitting ? "Saving…" : "Save new password"}
          </button>
        </form>
        {forced && (
          <p className="si-alt">
            Not you? <button type="button" className="si-link-btn" onClick={() => Logout(localStorage.getItem("token"))}>Sign out</button>
          </p>
        )}
      </AuthLayout>
      <ToastContainer />
    </>
  );
};

export default ChangePassword;
