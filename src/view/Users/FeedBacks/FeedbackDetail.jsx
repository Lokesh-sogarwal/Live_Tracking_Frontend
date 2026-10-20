import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiArrowLeft, FiSend } from "react-icons/fi";
import API_BASE_URL from "../../../utils/config";
import { PageHeader, Panel, Field } from "../../../Components/ui";
import Conversation, { CATEGORY_LABEL, STATUS_LABEL, StatusBadge, fmt } from "./Conversation";
import "./show_feedback.css";
import "./feedback.css";

// Staff view of one feedback conversation: reply (saved first, emailed after), status and
// priority, email delivery per reply, and the audit trail.
const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` });
const newKey = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export default function FeedbackDetail() {
  const { id } = useParams();
  const [fb, setFb] = useState(null);
  const [status, setStatus] = useState("loading");
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState("");
  const [resolve, setResolve] = useState(false);
  const [sending, setSending] = useState(false);
  const [retrying, setRetrying] = useState(null);
  const [saving, setSaving] = useState(false);
  // One key per reply being written: a double click or network retry reuses it, so the
  // server stores (and emails) the reply once.
  const keyRef = useRef(newKey());

  const call = useCallback(async (path = "", options = {}) => {
    const res = await fetch(`${API_BASE_URL}/feedback/${id}${path}`, { headers: headers(), ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
    return data;
  }, [id]);

  const load = useCallback(async () => {
    try {
      setFb(await call());
      setStatus("ok");
    } catch (err) {
      setStatus(err.status === 403 ? "forbidden" : "error");
    }
  }, [call]);

  useEffect(() => {
    load();
  }, [load]);

  // While an email is being sent, check back until it settles (the reply itself is saved).
  const pending = fb?.replies.some((r) => r.email?.status === "pending");
  useEffect(() => {
    if (!pending) return undefined;
    const t = setTimeout(load, 2000);
    return () => clearTimeout(t);
  }, [pending, fb, load]);

  const send = async (e) => {
    e.preventDefault();
    if (reply.trim().length < 2) return setReplyError("Write a reply first.");
    setReplyError("");
    setSending(true);
    try {
      const data = await call("/replies", { method: "POST", body: JSON.stringify({ message: reply.trim(), idempotency_key: keyRef.current, resolve }) });
      setFb(data);
      setReply("");
      setResolve(false);
      keyRef.current = newKey();
      toast.success(data.duplicate ? "This reply was already saved" : "Reply saved");
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setSending(false);
    }
  };

  const retry = async (replyId) => {
    setRetrying(replyId);
    try {
      setFb(await call(`/replies/${replyId}/retry_email`, { method: "POST" }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRetrying(null);
    }
  };

  const update = async (patch) => {
    setSaving(true);
    try {
      setFb(await call("", { method: "PATCH", body: JSON.stringify(patch) }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ui-page">
      <Link to="/Feedbacks" className="ui-btn ui-btn-ghost ui-btn-sm fb-back">
        <FiArrowLeft aria-hidden="true" /> All feedback
      </Link>
      <PageHeader
        title={fb ? fb.subject || `Feedback ${fb.reference}` : "Feedback"}
        description={fb ? `${fb.reference} · ${CATEGORY_LABEL[fb.category]} · received ${fmt(fb.created_at)}` : undefined}
        actions={fb && <StatusBadge status={fb.status} />}
      />

      {status !== "ok" ? (
        <Panel title="Feedback" status={status} onRetry={load} isEmpty={false} />
      ) : (
        <div className="fb-detail">
          <div className="fb-detail-main">
            <Panel title="Conversation">
              <Conversation feedback={fb} submitterLabel={fb.submitter.name} onRetry={retry} retrying={retrying} />
            </Panel>

            <form className="ui-card ui-card-body ui-form" onSubmit={send} noValidate>
              <Field label={`Reply to ${fb.submitter.name}`} error={replyError} hint={fb.email_enabled ? (fb.submitter.email_verified ? `Also emailed to ${fb.submitter.email}.` : "Shown in their dashboard. Not emailed: their address isn't verified.") : "Shown in their dashboard. Email isn't set up on this server."}>
                <textarea className="ui-textarea" rows={4} maxLength={5000} value={reply} onChange={(e) => setReply(e.target.value)} disabled={sending} placeholder="Write a reply the submitter will see…" />
              </Field>
              <div className="ui-form-actions fb-reply-actions">
                <label className="fb-check">
                  <input type="checkbox" checked={resolve} onChange={(e) => setResolve(e.target.checked)} disabled={sending} /> Mark as resolved
                </label>
                <button type="submit" className="ui-btn ui-btn-primary" disabled={sending}>
                  {sending ? <span className="ui-spinner" aria-hidden="true" /> : <FiSend aria-hidden="true" />} {sending ? "Sending…" : "Send reply"}
                </button>
              </div>
            </form>
          </div>

          <aside className="fb-detail-side">
            <Panel title="Details">
              <dl className="ui-dl">
                <div><dt>From</dt><dd>{fb.submitter.name}{fb.submitter.role && ` (${fb.submitter.role})`}</dd></div>
                <div><dt>Email</dt><dd>{fb.submitter.email}{!fb.submitter.email_verified && " · not verified"}</dd></div>
              </dl>
              <div className="ui-form fb-controls">
                <Field label="Status">
                  <select className="ui-select" value={fb.status} disabled={saving} onChange={(e) => update({ status: e.target.value })}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Priority">
                  <select className="ui-select" value={fb.priority} disabled={saving} onChange={(e) => update({ priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </Field>
              </div>
            </Panel>
            <Panel title="Activity">
              <ol className="fb-history">
                {[...fb.history].reverse().map((h, i) => (
                  <li key={`${h.at}-${i}`}>
                    <time dateTime={h.at}>{fmt(h.at)}</time>
                    <span><strong>{h.action}</strong> · {h.actor}{h.detail && ` — ${h.detail}`}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          </aside>
        </div>
      )}
    </div>
  );
}
