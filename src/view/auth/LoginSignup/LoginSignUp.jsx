import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { FiAlertCircle } from "react-icons/fi";
import API_BASE_URL from "../../../utils/config";
import AuthLayout from "../AuthLayout";
import PasswordField from "../PasswordField";

const Login = () => {
  const location = useLocation();
  // Where to continue after signing in (set by PrivateRoute), and any message to show.
  const from = typeof location.state?.from === "string" && location.state.from.startsWith("/") ? location.state.from : "/dashboard";
  const notice = location.state?.notice || (location.state?.from ? "Sign in to continue." : "");
  const [formData, setFormData] = useState({
    email: location.state?.email || "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Same request, token storage and redirect as before; only a guard against double submits
  // was added. Errors are shown inline next to the form.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      // Driver/operator applicants get a scoped token for their application only.
      if (data.application_token) {
        localStorage.setItem("application_token", data.application_token);
        navigate("/application");
        return;
      }

      if (data.token) {
        localStorage.removeItem("application_token");
        localStorage.setItem("token", data.token);
        // An administrator issued a temporary password: a new one must be chosen first.
        if (data.must_change_password) {
          navigate("/change-password");
          return;
        }
        toast.success("Login Successful");

        navigate(from, { replace: true });
      }
    } catch (err) {
      setError("Server error. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AuthLayout>
        <h2 className="si-title">Sign in</h2>
        <p className="si-subtitle">Enter the email and password for your account.</p>
        {notice && <p className="si-notice" role="status">{notice}</p>}

        <form className="si-form" onSubmit={handleSubmit} aria-busy={submitting}>
          <div className="si-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>

          <div>
            <PasswordField
              id="login-password"
              label="Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
            <p className="si-row-end">
              <Link to="/forgot-password" state={{ email: formData.email }}>Forgot password?</Link>
            </p>
          </div>

          {error && (
            <p id="login-error" className="si-error" role="alert">
              <FiAlertCircle aria-hidden="true" /> {error}
            </p>
          )}

          <button type="submit" className="si-submit" disabled={submitting}>
            {submitting && <span className="si-spinner" aria-hidden="true" />}
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="si-alt">
          New here? <Link to="/signup">Create a passenger account</Link>
        </p>
      </AuthLayout>
      <ToastContainer />
    </>
  );
};

export default Login;
