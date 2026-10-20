import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiAlertCircle, FiCheckCircle, FiClock, FiExternalLink, FiFileText, FiLogOut, FiUploadCloud, FiXCircle,
} from "react-icons/fi";
import { MdDirectionsBus } from "react-icons/md";
import API_BASE_URL from "../../utils/config";
import "./onboarding.css";

// Restricted dashboard for driver/operator applicants. It talks only to /onboarding/me with
// the scoped application token; the server refuses that token everywhere else.
export const APPLICATION_TOKEN_KEY = "application_token";
const ALLOWED = ["pdf", "png", "jpg", "jpeg", "docx"];
const MAX_BYTES = 5 * 1024 * 1024;

const STATUS = {
  DOCUMENTS_PENDING: { label: "Documents needed", tone: "info", text: "Upload each required document, then submit your application for review." },
  UNDER_REVIEW: { label: "Under review", tone: "info", text: "A reviewer is checking your documents. You'll be notified by email when something changes." },
  ACTION_REQUIRED: { label: "Action required", tone: "warning", text: "A reviewer asked for changes. Replace the documents marked below, then resubmit." },
  APPROVED: { label: "Approved", tone: "success", text: "Your account is active. Sign in again to open your dashboard." },
  REJECTED: { label: "Not approved", tone: "error", text: "This application was not approved." },
};
const DOC_STATUS = {
  missing: { label: "Not uploaded", icon: FiFileText, cls: "is-missing" },
  pending: { label: "Waiting for review", icon: FiClock, cls: "is-pending" },
  approved: { label: "Approved", icon: FiCheckCircle, cls: "is-approved" },
  rejected: { label: "Needs a new file", icon: FiXCircle, cls: "is-rejected" },
};
const fmt = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "");
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem(APPLICATION_TOKEN_KEY)}` });

const ApplicationDashboard = () => {
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [status, setStatus] = useState("loading");
  const [uploading, setUploading] = useState({}); // type -> percent
  const [docErrors, setDocErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputs = useRef({});

  const endSession = useCallback(
    (message) => {
      localStorage.removeItem(APPLICATION_TOKEN_KEY);
      navigate("/login", { replace: true, state: { notice: message } });
    },
    [navigate]
  );

  const load = useCallback(async () => {
    setStatus((s) => (s === "ok" ? s : "loading"));
    try {
      const res = await fetch(`${API_BASE_URL}/onboarding/me`, { headers: authHeader() });
      if (res.status === 401) return endSession("Your application session ended. Sign in to continue.");
      if (!res.ok) throw new Error();
      setApp(await res.json());
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, [endSession]);

  useEffect(() => {
    load();
  }, [load]);

  const editable = app && ["DOCUMENTS_PENDING", "ACTION_REQUIRED"].includes(app.status);

  const upload = async (type, file) => {
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const problem = !ALLOWED.includes(ext) ? "Choose a PDF, PNG, JPG or DOCX file." : file.size > MAX_BYTES ? "That file is over 5 MB." : "";
    setDocErrors((e) => ({ ...e, [type]: problem }));
    if (problem) return;
    const body = new FormData();
    body.append("document_type", type);
    body.append("file", file);
    setUploading((u) => ({ ...u, [type]: 0 }));
    try {
      const res = await axios.post(`${API_BASE_URL}/onboarding/me/documents`, body, {
        headers: authHeader(),
        onUploadProgress: (ev) => ev.total && setUploading((u) => ({ ...u, [type]: Math.round((ev.loaded / ev.total) * 100) })),
      });
      setApp(res.data.application);
    } catch (err) {
      if (err.response?.status === 401) return endSession("Your application session ended. Sign in to continue.");
      setDocErrors((e) => ({ ...e, [type]: err.response?.data?.error || "Upload failed. Check your connection and try again." }));
    } finally {
      setUploading((u) => {
        const next = { ...u };
        delete next[type];
        return next;
      });
      if (inputs.current[type]) inputs.current[type].value = "";
    }
  };

  const view = async (type) => {
    // Fetched with the application token, then shown from memory: no shareable file URL exists.
    const win = window.open("", "_blank");
    try {
      const res = await fetch(`${API_BASE_URL}/onboarding/me/documents/${type}/file`, { headers: authHeader() });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      if (win) win.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      win?.close();
      setDocErrors((e) => ({ ...e, [type]: "Could not open the file." }));
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`${API_BASE_URL}/onboarding/me/submit`, { method: "POST", headers: authHeader() });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return endSession("Your application session ended. Sign in to continue.");
      if (!res.ok) return setSubmitError(data.error || "Could not submit");
      setApp(data.application);
    } catch {
      setSubmitError("Server error. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem(APPLICATION_TOKEN_KEY);
    navigate("/", { replace: true });
  };

  const missing = app ? app.documents.filter((d) => d.required && !["pending", "approved"].includes(d.status)) : [];
  const st = app ? STATUS[app.status] : null;
  const steps = app && [
    { label: "Email verified", done: Boolean(app.email_verified_at) },
    { label: "Documents uploaded", done: missing.length === 0 || ["UNDER_REVIEW", "APPROVED"].includes(app.status) },
    { label: "Review", done: ["APPROVED", "REJECTED"].includes(app.status), current: ["UNDER_REVIEW", "ACTION_REQUIRED"].includes(app.status) },
    { label: app.status === "REJECTED" ? "Not approved" : "Account active", done: app.status === "APPROVED", failed: app.status === "REJECTED" },
  ];

  return (
    <div className="ob">
      <header className="ob-header">
        <Link to="/" className="ob-brand">
          <span className="ob-brand-mark" aria-hidden="true"><MdDirectionsBus /></span>
          <strong>Live Tracking</strong>
        </Link>
        <button type="button" className="ob-signout" onClick={signOut}>
          <FiLogOut aria-hidden="true" /> Sign out
        </button>
      </header>

      <main className="ob-main">
        {status === "loading" && <p className="ob-muted" role="status">Loading your application…</p>}
        {status === "error" && (
          <div className="ob-card ob-error" role="alert">
            <FiAlertCircle aria-hidden="true" /> Could not load your application.
            <button type="button" className="ob-btn ob-btn-secondary" onClick={load}>Retry</button>
          </div>
        )}

        {app && (
          <>
            <section className="ob-card ob-summary" aria-labelledby="ob-title">
              <div className="ob-summary-head">
                <div>
                  <p className="ob-eyebrow">{app.role} application</p>
                  <h1 id="ob-title">Hello, {app.fullname.split(" ")[0]}</h1>
                  <p className="ob-muted">
                    Application ID <code className="ob-id">{app.application_id}</code>
                  </p>
                </div>
                <span className={`ob-chip ob-chip-${st.tone}`}>{st.label}</span>
              </div>
              <p className={`ob-banner ob-banner-${st.tone}`} role="status">
                {st.text}
                {app.status === "REJECTED" && app.decision_reason && <> Reason: {app.decision_reason}</>}
                {app.status === "APPROVED" && <> <Link to="/login">Sign in</Link></>}
              </p>
              <ol className="ob-steps" aria-label="Application progress">
                {steps.map((s) => (
                  <li key={s.label} className={s.failed ? "is-failed" : s.done ? "is-done" : s.current ? "is-current" : ""}>
                    <span className="ob-step-dot" aria-hidden="true" />
                    <span>{s.label}</span>
                    <span className="sr-only">{s.failed ? " (not approved)" : s.done ? " (done)" : s.current ? " (in progress)" : " (to do)"}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="ob-card" aria-labelledby="ob-docs">
              <h2 id="ob-docs">Documents</h2>
              <p className="ob-muted">PDF, PNG, JPG or DOCX, up to 5 MB each. Files are stored privately and only reviewers can open them.</p>
              <ul className="ob-docs">
                {app.documents.map((d) => {
                  const ds = DOC_STATUS[d.status];
                  const pct = uploading[d.type];
                  const canUpload = editable && d.status !== "approved";
                  return (
                    <li key={d.type} className={`ob-doc ${ds.cls}`}>
                      <div className="ob-doc-main">
                        <span className="ob-doc-icon" aria-hidden="true"><ds.icon /></span>
                        <div className="ob-doc-text">
                          <strong>
                            {d.label} {!d.required && <span className="ob-muted">(optional)</span>}
                          </strong>
                          <span className="ob-muted">{d.why}</span>
                          <span className="ob-doc-status">
                            {ds.label}
                            {d.uploaded_at && ` · uploaded ${fmt(d.uploaded_at)}`}
                          </span>
                          {d.status === "rejected" && d.reason && <span className="ob-doc-reason">Reviewer: {d.reason}</span>}
                          {docErrors[d.type] && <span className="ob-doc-error" role="alert">{docErrors[d.type]}</span>}
                        </div>
                      </div>
                      <div className="ob-doc-actions">
                        {d.file_name && (
                          <button type="button" className="ob-btn ob-btn-ghost" onClick={() => view(d.type)}>
                            <FiExternalLink aria-hidden="true" /> View
                          </button>
                        )}
                        {canUpload && (
                          <>
                            <input
                              ref={(el) => (inputs.current[d.type] = el)}
                              id={`ob-file-${d.type}`}
                              className="sr-only"
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,.docx"
                              onChange={(e) => upload(d.type, e.target.files[0])}
                              disabled={pct !== undefined}
                            />
                            <label htmlFor={`ob-file-${d.type}`} className={`ob-btn ob-btn-secondary${pct !== undefined ? " is-busy" : ""}`}>
                              <FiUploadCloud aria-hidden="true" /> {pct !== undefined ? `Uploading ${pct}%` : d.file_name ? "Replace" : "Upload"}
                              <span className="sr-only"> {d.label}</span>
                            </label>
                          </>
                        )}
                      </div>
                      {pct !== undefined && (
                        <div className="ob-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`Uploading ${d.label}`}>
                          <span style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {editable && (
                <div className="ob-submit">
                  {submitError && <p className="ob-doc-error" role="alert">{submitError}</p>}
                  {missing.length > 0 && <p className="ob-muted">Still needed: {missing.map((d) => d.label).join(", ")}</p>}
                  <button type="button" className="ob-btn ob-btn-primary" onClick={submit} disabled={submitting || missing.length > 0}>
                    {submitting ? "Submitting…" : app.status === "ACTION_REQUIRED" ? "Resubmit for review" : "Submit for review"}
                  </button>
                </div>
              )}
            </section>

            <section className="ob-card" aria-labelledby="ob-history">
              <h2 id="ob-history">History</h2>
              <ol className="ob-history">
                {[...app.history].reverse().map((h, i) => (
                  <li key={`${h.at}-${i}`}>
                    <time dateTime={h.at}>{fmt(h.at)}</time>
                    <span>
                      <strong>{h.action}</strong> · {h.actor}
                      {h.detail && <span className="ob-muted"> — {h.detail}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default ApplicationDashboard;
