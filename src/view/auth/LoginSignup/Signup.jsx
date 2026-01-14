import React, { useState } from "react";
import "./LoginSignup.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebook, faGoogle, faTwitter } from "@fortawesome/free-brands-svg-icons";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import API_BASE_URL from "../../../utils/config";

const Signup = () => {
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    password: "",
    role: "Passenger",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const GoogleSignup = () => {
    toast.info("Google signup is disabled right now!");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          is_password_change: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        toast.error(data.error || "Something went wrong");
        return;
      }

      toast.success("User registered successfully");
      navigate("/login");
    } catch (err) {
      setError("Server error. Please try again later.");
      toast.error("Server error. Please try again later.");
    }
  };

  const goToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="login-main">
      <div className="login-orbit login-orbit-1" />
      <div className="login-orbit login-orbit-2" />
      <div className="auth-shell">
        {/* LEFT: SIGNUP FORM PANEL */}
        <div className="auth-left-panel">
          <div className="auth-top-row">
            <button
              type="button"
              className="auth-back-pill"
              onClick={() => navigate("/")}
            >
              ←
            </button>
            <div className="auth-top-link">
              <span>Already member?</span>
              <button type="button" onClick={goToLogin} className="auth-inline-link">
                Sign in
              </button>
            </div>
          </div>

          <h1 className="auth-title">Sign up</h1>
          <p className="auth-subtitle-text">
            Create your RouteMaster account to configure buses, routes,
            schedules and users in one place.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-input-row">
              <span className="auth-input-label">Full name</span>
              <input
                type="text"
                name="fullname"
                value={formData.fullname}
                onChange={handleChange}
                placeholder="Full name"
                required
              />
            </div>
            <div className="auth-input-row">
              <span className="auth-input-label">Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="auth-input-row">
              <span className="auth-input-label">Password</span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                required
              />
            </div>

            <div className="password-hints">
              <span>• At least 8 characters</span>
              <span>• One number or symbol</span>
              <span>• Upper & lower case letters</span>
            </div>

            {/* <div className="role-select">
              <label>
                <input
                  type="radio"
                  name="role"
                  value="Passenger"
                  checked={formData.role === "Passenger"}
                  onChange={handleChange}
                />
                Passenger
              </label>
              <label>
                <input
                  type="radio"
                  name="role"
                  value="Driver"
                  checked={formData.role === "Driver"}
                  onChange={handleChange}
                />
                Driver
              </label>
            </div> */}

            <button type="submit" className="auth-primary-btn">
              Sign up
            </button>

            <div className="auth-or-row">
              <span />
              <p>or sign up with</p>
              <span />
            </div>

            <div className="social-signup">
              <button type="button" onClick={GoogleSignup}>
                <FontAwesomeIcon icon={faGoogle} size="lg" />
              </button>
              <button type="button">
                <FontAwesomeIcon icon={faFacebook} size="lg" />
              </button>
              <button type="button">
                <FontAwesomeIcon icon={faTwitter} size="lg" />
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT: DEVICE ILLUSTRATION PANEL (DESKTOP + MOBILE) */}
        <div className="auth-right-panel">
          <div className="auth-right-gradient" />
          <div className="auth-right-content">
            <div className="auth-device-stack" aria-hidden="true">
              <div className="auth-device auth-device-main">
                <div className="auth-device-header">
                  <span className="auth-device-title">Configure your fleet</span>
                  <span className="auth-device-status">Step 1 · Create account</span>
                </div>
                <div className="auth-device-map">
                  <span className="auth-device-line auth-device-line-1" />
                  <span className="auth-device-line auth-device-line-2" />
                  <span className="auth-device-line auth-device-line-3" />
                  <span className="auth-device-stop stop-1" />
                  <span className="auth-device-stop stop-2" />
                  <span className="auth-device-stop stop-3" />
                </div>
                <div className="auth-device-footer">
                  <div>
                    <p className="auth-device-label">Routes</p>
                    <p className="auth-device-value">18</p>
                  </div>
                  <div>
                    <p className="auth-device-label">Drivers</p>
                    <p className="auth-device-value">54</p>
                  </div>
                  <div>
                    <p className="auth-device-label">Users</p>
                    <p className="auth-device-value">1.2k</p>
                  </div>
                </div>
              </div>

              <div className="auth-device auth-device-secondary">
                <div className="auth-device-secondary-header">
                  <span className="auth-device-badge">Getting started</span>
                  <span className="auth-device-time">Under 2 mins</span>
                </div>
                <div className="auth-device-secondary-body">
                  <p className="auth-device-secondary-title">Invite your team</p>
                  <p className="auth-device-secondary-sub">
                    Add dispatchers, admins and drivers in one place.
                  </p>
                  <div className="auth-device-progress">
                    <span className="auth-device-progress-fill" />
                  </div>
                  <div className="auth-device-tags">
                    <span>Secure access</span>
                    <span>Role-based</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default Signup;
