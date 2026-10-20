import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FiCheckCircle, FiAlertCircle, FiMessageCircle } from "react-icons/fi";
import "./feedback.css";
import API_BASE_URL from "../../../utils/config";
import useResource from "../../../hooks/useResource";
import { PageHeader, Field, Panel } from "../../../Components/ui";
import { CATEGORY_LABEL, StatusBadge, fmt } from "./Conversation";

const MAX = 5000; // server limit

const FeedbackForm = () => {
  const [feedback, setFeedback] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { ok, message, id, reference }
  const mine = useResource("/feedback/mine");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    if (!feedback.trim()) {
      setError("Write your feedback before sending.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/view/submit_feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ feedback: feedback.trim(), subject: subject.trim() || undefined, category }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult({ ok: true, message: data.reference ? `Thanks — your feedback was sent. Reference ${data.reference}.` : data.message || "Thanks, your feedback was sent.", id: data.id });
        setFeedback("");
        setSubject("");
        setCategory("general");
        mine.reload();
      } else {
        setResult({ ok: false, message: data.error || "Your feedback could not be sent." });
      }
    } catch {
      setResult({ ok: false, message: "Could not reach the server. Try again." });
    } finally {
      setSending(false);
    }
  };

  const list = Array.isArray(mine.data) ? mine.data : [];

  return (
    <div className="ui-page ui-page-narrow">
      <PageHeader title="Send feedback" description="Tell us what works and what doesn't. Operators and administrators read every message and can reply here." />
      <form className="ui-card ui-card-body ui-form" onSubmit={handleSubmit} noValidate>
        <div className="ui-form-grid">
          <Field label="Subject" optional>
            <input className="ui-input" maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Late bus on Route 12" disabled={sending} />
          </Field>
          <Field label="Topic">
            <select className="ui-select" value={category} onChange={(e) => setCategory(e.target.value)} disabled={sending}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Your feedback" error={error} hint={`${feedback.length} / ${MAX} characters`}>
          <textarea
            className="ui-textarea"
            rows={6}
            maxLength={MAX}
            placeholder="e.g. The 8:10 bus from Main Bus Stand was 15 minutes late today."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={sending}
          />
        </Field>
        {result && (
          <div className={`ui-banner ${result.ok ? "ui-banner-success" : "ui-banner-error"}`} role={result.ok ? "status" : "alert"}>
            {result.ok ? <FiCheckCircle aria-hidden="true" /> : <FiAlertCircle aria-hidden="true" />}
            <span>
              {result.message} {result.ok && result.id && <Link to={`/my_feedback/${result.id}`}>View conversation</Link>}
            </span>
          </div>
        )}
        <div className="ui-form-actions">
          <button type="submit" className="ui-btn ui-btn-primary" disabled={sending}>
            {sending && <span className="ui-spinner" aria-hidden="true" />} {sending ? "Sending…" : "Send feedback"}
          </button>
        </div>
      </form>

      <Panel
        title="Your feedback"
        subtitle={mine.status === "ok" ? `${list.length} sent` : undefined}
        status={mine.status === "idle" ? "loading" : mine.status}
        onRetry={mine.reload}
        isEmpty={list.length === 0}
        empty="Nothing sent yet. Replies to your feedback will appear here."
        flush
      >
        <ul className="fb-mine">
          {list.map((f) => (
            <li key={f.id}>
              <Link to={`/my_feedback/${f.id}`} className="fb-mine-row">
                <span className="fb-mine-main">
                  <strong>{f.subject || f.message.slice(0, 70)}</strong>
                  <span className="ui-cell-sub">
                    {f.reference} · {CATEGORY_LABEL[f.category]} · {fmt(f.created_at)}
                  </span>
                </span>
                {f.reply_count > 0 && (
                  <span className="fb-mine-replies">
                    <FiMessageCircle aria-hidden="true" /> {f.reply_count}
                    <span className="sr-only"> {f.reply_count === 1 ? "reply" : "replies"}</span>
                  </span>
                )}
                <StatusBadge status={f.status} />
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
};

export default FeedbackForm;
