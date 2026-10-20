import React from "react";
import { FiCheckCircle, FiClock, FiMail, FiAlertTriangle, FiSlash } from "react-icons/fi";
import { StatusChip } from "../../../Components/ui";

// Shared by "My feedback" and the staff inbox: the original message, then replies in order.
export const STATUS_LABEL = { new: "New", in_review: "In review", replied: "Replied", resolved: "Resolved" };
export const STATUS_CHIP = { new: "not_started", in_review: "delayed", replied: "live", resolved: "completed" };
export const CATEGORY_LABEL = { general: "General", service: "Bus service", safety: "Safety", app: "App", other: "Other" };
export const fmt = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "");

export const StatusBadge = ({ status }) => <StatusChip status={STATUS_CHIP[status] || "stale"}>{STATUS_LABEL[status] || status}</StatusChip>;

const EMAIL = {
  sent: { icon: FiCheckCircle, cls: "is-sent", text: (e) => `Emailed ${fmt(e.sent_at)}` },
  pending: { icon: FiClock, cls: "is-pending", text: () => "Sending email…" },
  failed: { icon: FiAlertTriangle, cls: "is-failed", text: (e) => `Email failed${e.error ? ` (${e.error})` : ""}` },
  skipped: {
    icon: FiSlash,
    cls: "is-skipped",
    text: (e) =>
      ({ not_configured: "Not emailed — email isn't set up on this server", unverified_email: "Not emailed — the address isn't verified", no_account: "Not emailed — account deleted" }[e.skip_reason] || "Not emailed"),
  },
};

export function EmailStatus({ email, onRetry, retrying }) {
  if (!email) return null;
  const e = EMAIL[email.status];
  return (
    <span className={`fb-email ${e.cls}`}>
      <FiMail aria-hidden="true" /> <e.icon aria-hidden="true" /> {e.text(email)}
      {email.status === "failed" && onRetry && (
        <button type="button" className="fb-email-retry" onClick={onRetry} disabled={retrying}>
          {retrying ? "Retrying…" : "Retry email"}
        </button>
      )}
    </span>
  );
}

export default function Conversation({ feedback, submitterLabel = "You", onRetry, retrying }) {
  return (
    <ol className="fb-convo" aria-label="Conversation">
      <li className="fb-bubble is-original">
        <div className="fb-bubble-meta">
          <strong>{submitterLabel}</strong>
          <time dateTime={feedback.created_at}>{fmt(feedback.created_at)}</time>
        </div>
        {feedback.subject && <p className="fb-bubble-subject">{feedback.subject}</p>}
        <p className="fb-bubble-text">{feedback.message}</p>
      </li>
      {feedback.replies.map((r) => (
        <li key={r.id} className="fb-bubble is-reply">
          <div className="fb-bubble-meta">
            <strong>
              {r.author_name} <span className="fb-role">{r.author_role}</span>
            </strong>
            <time dateTime={r.created_at}>{fmt(r.created_at)}</time>
          </div>
          <p className="fb-bubble-text">{r.message}</p>
          {r.email && <EmailStatus email={r.email} onRetry={onRetry && (() => onRetry(r.id))} retrying={retrying === r.id} />}
        </li>
      ))}
    </ol>
  );
}
