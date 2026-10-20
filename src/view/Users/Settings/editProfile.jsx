import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiAlertCircle, FiInfo } from "react-icons/fi";
import profilePlaceholder from "../../../Assets/male-avatar-boy-face-man-user-9-svgrepo-com.svg";
import "../Profile/profile.css";
import "./editProfile.css";
import API_BASE_URL from "../../../utils/config";
import useResource from "../../../hooks/useResource";
import { PageHeader, Panel, Field, RoleBadge } from "../../../Components/ui";

const FIELDS = ["fullname", "email", "dob", "fathername", "mothername"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EditProfile = () => {
  const navigate = useNavigate();
  const res = useResource("/view/profile");
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (res.status === "ok" && !form) setForm(Object.fromEntries(FIELDS.map((k) => [k, res.data?.[k] || ""])));
  }, [res.status, res.data, form]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.fullname.trim()) next.fullname = "Full name is required";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email address";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setServerError("");
    try {
      // Same multipart PUT as before; the server reads text fields only and ignores role.
      const body = new FormData();
      FIELDS.forEach((k) => body.append(k, form[k].trim()));
      const r = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: "PUT",
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        body,
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 409) setErrors({ email: data.error || "Email is already in use" });
        else setServerError(data.error || "Your changes could not be saved.");
        return;
      }
      toast.success("Profile updated");
      navigate("/profile");
    } catch {
      setServerError("Could not reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const status = res.status === "idle" ? "loading" : res.status === "ok" && !form ? "loading" : res.status;

  return (
    <div className="ui-page ui-page-narrow">
      <PageHeader title="Edit profile" description="Update your personal details." />
      <Panel status={status} onRetry={res.reload}>
        {form && (
          <form className="ui-form" onSubmit={handleSave} noValidate>
            <div className="profile-summary">
              <img src={profilePlaceholder} alt="" className="profile-avatar" />
              <div>
                <h2 className="profile-name">{form.fullname || "—"}</h2>
                {res.data?.role && <RoleBadge role={res.data.role} />}
              </div>
            </div>
            <div className="ui-banner ui-banner-info">
              <FiInfo aria-hidden="true" />
              <span>Profile photos can't be uploaded yet. Your role can only be changed by an administrator.</span>
            </div>

            <div className="ui-form-grid">
              <Field label="Full name" error={errors.fullname}>
                <input className="ui-input" value={form.fullname} onChange={set("fullname")} maxLength={150} autoComplete="name" />
              </Field>
              <Field label="Email" error={errors.email}>
                <input className="ui-input" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
              </Field>
              <Field label="Date of birth" optional>
                <input className="ui-input" type="date" value={form.dob} onChange={set("dob")} />
              </Field>
              <Field label="Father's name" optional>
                <input className="ui-input" value={form.fathername} onChange={set("fathername")} maxLength={150} />
              </Field>
              <Field label="Mother's name" optional>
                <input className="ui-input" value={form.mothername} onChange={set("mothername")} maxLength={150} />
              </Field>
            </div>

            {serverError && (
              <div className="ui-banner ui-banner-error" role="alert">
                <FiAlertCircle aria-hidden="true" />
                <span>{serverError}</span>
              </div>
            )}
            <div className="ui-form-actions">
              <button type="button" className="ui-btn ui-btn-secondary" onClick={() => navigate("/profile")} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>
                {saving && <span className="ui-spinner" aria-hidden="true" />} {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
};

export default EditProfile;
