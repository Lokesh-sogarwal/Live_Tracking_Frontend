import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiAlertCircle, FiArrowLeft, FiCheckCircle, FiMail, FiUser, FiTruck, FiBriefcase } from "react-icons/fi";
import API_BASE_URL from "../../../utils/config";
import AuthLayout from "../AuthLayout";
import PasswordField from "../PasswordField";
import "./Signup.css";

// Step-by-step signup: 1) details, 2) email code (when the server can send mail), 3) account
// type. Passengers get an account straight away; drivers and operators start an application
// that an authorised reviewer must approve. Progress (never passwords) survives a reload.
const MIN = 8;
const PROGRESS_KEY = "signup_progress";
const TYPES = [
  { key: "passenger", icon: FiUser, title: "Passenger", text: "Find routes, follow buses on the live map and get trip updates. Ready straight away." },
  { key: "driver", icon: FiTruck, title: "Driver", text: "Apply to drive for the fleet. Upload your documents; you can drive once a reviewer approves them." },
  { key: "operator", icon: FiBriefcase, title: "Operator", text: "Apply to run day-to-day transport operations. Needs your ID and offer letter, and an administrator's approval." },
];

const loadProgress = () => {
  try {
    return JSON.parse(sessionStorage.getItem(PROGRESS_KEY) || "null");
  } catch {
    return null;
  }
};
const saveProgress = (p) => {
  try {
    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // Private mode: progress just isn't kept.
  }
};

async function post(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const Signup = () => {
  const navigate = useNavigate();
  const saved = useMemo(loadProgress, []);
  const [opts, setOpts] = useState(null);
  const [optsError, setOptsError] = useState(false);
  const [step, setStep] = useState("details");
  const [form, setForm] = useState({ fullname: saved?.fullname || "", email: saved?.email || "", phone_no: saved?.phone_no || "", password: "", confirm: "" });
  const [verified, setVerified] = useState(saved?.verified || null); // { email, token, until }
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [type, setType] = useState(saved?.type || "passenger");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/signup_options`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setOpts)
      .catch(() => setOptsError(true));
  }, []);

  useEffect(() => {
    if (!cooldown) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    saveProgress({ fullname: form.fullname, email: form.email, phone_no: form.phone_no, type, verified });
  }, [form.fullname, form.email, form.phone_no, type, verified]);

  const email = form.email.trim().toLowerCase();
  const verificationOn = Boolean(opts?.email_verification);
  const isVerified = verified && verified.email === email && verified.until > Date.now();
  const steps = verificationOn ? ["Your details", "Verify email", "Account type"] : ["Your details", "Account type"];
  const stepIndex = step === "details" ? 0 : step === "verify" ? 1 : verificationOn ? 2 : 1;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const sendCode = async () => {
    setBusy(true);
    setError("");
    const r = await post("/auth/signup/send_code", { email }).catch(() => null);
    setBusy(false);
    if (!r) return setError("Server error. Please try again later.");
    if (r.status === 409) {
      setStep("details");
      return setErrors({ email: r.data.error });
    }
    if (!r.ok) return setError(r.data.error || "Could not send the code");
    setNotice(r.data.message);
    setCooldown(60);
    setStep("verify");
  };

  const submitDetails = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.fullname.trim().length < 2) next.fullname = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address.";
    if (form.phone_no && !/^\+?[0-9 ()-]{7,20}$/.test(form.phone_no.trim())) next.phone_no = "Enter a valid mobile number.";
    if (form.password.length < MIN) next.password = `Use at least ${MIN} characters.`;
    if (form.confirm !== form.password) next.confirm = "The passwords don't match.";
    setErrors(next);
    setError("");
    if (Object.keys(next).length) return;
    if (!verificationOn || isVerified) return setStep("type");
    await sendCode();
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return setErrors({ code: "Enter the 6-digit code from the email." });
    setErrors({});
    setBusy(true);
    setError("");
    const r = await post("/auth/signup/verify_code", { email, code: code.trim() }).catch(() => null);
    setBusy(false);
    if (!r) return setError("Server error. Please try again later.");
    if (!r.ok) return setErrors({ code: r.data.error || "That code didn't work." });
    setVerified({ email, token: r.data.verification_token, until: Date.now() + (r.data.expires_in_minutes - 1) * 60_000 });
    setCode("");
    setStep("type");
  };

  const finish = async (e) => {
    e.preventDefault();
    setError("");
    const applying = type !== "passenger";
    if (applying && !form.phone_no.trim()) {
      setErrors({ phone_no: "Drivers and operators need a mobile number." });
      return setStep("details");
    }
    if (verificationOn && !isVerified) {
      setError("Your email verification expired. Verify your email again.");
      return setStep("details");
    }
    setBusy(true);
    try {
      const body = { fullname: form.fullname.trim(), email, password: form.password, phone_no: form.phone_no.trim() || undefined };
      const r = applying
        ? await post("/onboarding/applications", { ...body, role: type, verification_token: verified?.token })
        : await post("/auth/signup", { ...body, is_password_change: true, ...(verified?.token ? { verification_token: verified.token } : {}) });
      if (!r.ok) {
        if (/verif/i.test(r.data.error || "")) setVerified(null);
        return setError(r.data.error || "Something went wrong");
      }
      sessionStorage.removeItem(PROGRESS_KEY);
      if (applying) {
        localStorage.setItem("application_token", r.data.application_token);
        navigate("/application", { replace: true });
      } else {
        setStep("done");
      }
    } catch {
      setError("Server error. Please try again later.");
    } finally {
      setBusy(false);
    }
  };

  const ErrorBox = error ? (
    <p className="si-error" role="alert">
      <FiAlertCircle aria-hidden="true" /> {error}
    </p>
  ) : null;

  if (step === "done") {
    return (
      <AuthLayout heading="You're all set." intro="Your passenger account is ready.">
        <div className="si-done" role="status">
          <span className="si-done-icon" aria-hidden="true"><FiCheckCircle /></span>
          <h2 className="si-title">Account created</h2>
          <p className="si-subtitle">Sign in with {email} to start following your buses.</p>
          <Link to="/login" state={{ email }} className="si-submit si-submit-link">Sign in</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      heading="Join Live Tracking."
      intro="Passengers can explore routes and departures without an account. Create one to send feedback, get notifications and chat — or apply to drive or operate."
    >
      <ol className="su-steps" aria-label="Signup progress">
        {steps.map((label, i) => (
          <li key={label} className={i < stepIndex ? "is-done" : i === stepIndex ? "is-current" : ""} aria-current={i === stepIndex ? "step" : undefined}>
            <span className="su-step-num" aria-hidden="true">{i < stepIndex ? "✓" : i + 1}</span>
            <span className="su-step-label">{label}</span>
          </li>
        ))}
      </ol>

      {optsError && (
        <p className="si-error" role="alert"><FiAlertCircle aria-hidden="true" /> Could not reach the server. Try again shortly.</p>
      )}

      {step === "details" && (
        <>
          <h2 className="si-title">Create your account</h2>
          <p className="si-subtitle">
            {verificationOn ? "We'll email you a code to confirm the address." : "Tell us who you are."}
          </p>
          <form className="si-form" onSubmit={submitDetails} noValidate aria-busy={busy}>
            <div className="si-field">
              <label htmlFor="su-name">Full name</label>
              <input id="su-name" value={form.fullname} onChange={set("fullname")} autoComplete="name" aria-invalid={Boolean(errors.fullname)} aria-describedby={errors.fullname ? "su-name-error" : undefined} />
              {errors.fullname && <p id="su-name-error" className="si-field-error">{errors.fullname}</p>}
            </div>
            <div className="si-field">
              <label htmlFor="su-email">Email address</label>
              <input id="su-email" type="email" value={form.email} onChange={set("email")} autoComplete="email" placeholder="you@example.com" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "su-email-error" : isVerified ? "su-email-ok" : undefined} />
              {errors.email && (
                <p id="su-email-error" className="si-field-error">
                  {errors.email} {/exists|open/i.test(errors.email) && <Link to="/login" state={{ email }}>Sign in</Link>}
                </p>
              )}
              {isVerified && !errors.email && <p id="su-email-ok" className="si-hint su-ok"><FiCheckCircle aria-hidden="true" /> Verified</p>}
            </div>
            <div className="si-field">
              <label htmlFor="su-phone">Mobile number <span className="su-optional">(needed for drivers and operators)</span></label>
              <input id="su-phone" type="tel" inputMode="tel" value={form.phone_no} onChange={set("phone_no")} autoComplete="tel" placeholder="+91 98765 43210" aria-invalid={Boolean(errors.phone_no)} aria-describedby={errors.phone_no ? "su-phone-error" : undefined} />
              {errors.phone_no && <p id="su-phone-error" className="si-field-error">{errors.phone_no}</p>}
            </div>
            <PasswordField id="su-password" label="Password" autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} hint={`At least ${MIN} characters.`} />
            <PasswordField id="su-confirm" label="Confirm password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} error={errors.confirm} />
            {ErrorBox}
            <button type="submit" className="si-submit" disabled={busy || !opts}>
              {busy && <span className="si-spinner" aria-hidden="true" />}
              {verificationOn && !isVerified ? (busy ? "Sending code…" : "Continue — email me a code") : "Continue"}
            </button>
          </form>
        </>
      )}

      {step === "verify" && (
        <>
          <h2 className="si-title">Check your email</h2>
          <p className="si-subtitle" role="status">{notice || `Enter the code we sent to ${email}.`}</p>
          <form className="si-form" onSubmit={submitCode} noValidate aria-busy={busy}>
            <div className="si-field">
              <label htmlFor="su-code">6-digit code</label>
              <input
                id="su-code"
                className="su-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-invalid={Boolean(errors.code)}
                aria-describedby={errors.code ? "su-code-error" : undefined}
              />
              {errors.code && <p id="su-code-error" className="si-field-error">{errors.code}</p>}
            </div>
            {ErrorBox}
            <button type="submit" className="si-submit" disabled={busy}>
              {busy && <span className="si-spinner" aria-hidden="true" />}
              {busy ? "Checking…" : "Verify email"}
            </button>
          </form>
          <div className="su-row">
            <button type="button" className="si-link-btn" onClick={() => setStep("details")}>
              <FiArrowLeft aria-hidden="true" /> Change email
            </button>
            <button type="button" className="si-link-btn" onClick={sendCode} disabled={busy || cooldown > 0}>
              <FiMail aria-hidden="true" /> {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </>
      )}

      {step === "type" && (
        <>
          <h2 className="si-title">How will you use Live Tracking?</h2>
          <p className="si-subtitle">You can go back and change your details before you finish.</p>
          <form className="si-form" onSubmit={finish} aria-busy={busy}>
            <fieldset className="su-types">
              <legend className="sr-only">Account type</legend>
              {TYPES.map(({ key, icon: Icon, title, text }) => {
                const closed = key !== "passenger" && !opts?.applications_open;
                const docs = opts?.documents?.[key] || [];
                return (
                  <label key={key} className={`su-type${type === key ? " is-selected" : ""}${closed ? " is-disabled" : ""}`}>
                    <input type="radio" name="account-type" value={key} checked={type === key} onChange={() => setType(key)} disabled={closed} />
                    <span className="su-type-icon" aria-hidden="true"><Icon /></span>
                    <span className="su-type-body">
                      <strong>{title}</strong>
                      <span>{text}</span>
                      {docs.length > 0 && !closed && (
                        <span className="su-type-docs">You'll need: {docs.filter((d) => d.required).map((d) => d.label).join(", ")}</span>
                      )}
                      {closed && <span className="su-type-docs">Not available yet: this server can't verify email addresses.</span>}
                    </span>
                  </label>
                );
              })}
            </fieldset>
            {ErrorBox}
            <button type="submit" className="si-submit" disabled={busy}>
              {busy && <span className="si-spinner" aria-hidden="true" />}
              {busy ? "Saving…" : type === "passenger" ? "Create passenger account" : `Start ${type} application`}
            </button>
          </form>
          <div className="su-row">
            <button type="button" className="si-link-btn" onClick={() => setStep("details")}>
              <FiArrowLeft aria-hidden="true" /> Edit details
            </button>
          </div>
        </>
      )}

      <p className="si-alt">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
};

export default Signup;
