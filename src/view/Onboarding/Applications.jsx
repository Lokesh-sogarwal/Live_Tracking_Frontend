import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FiCheck, FiExternalLink, FiSearch, FiX } from "react-icons/fi";
import API_BASE_URL from "../../utils/config";
import { PageHeader, Panel, Dialog, Pagination, usePagination, StatusChip, Field } from "../../Components/ui";
import "./onboarding.css";

// Driver/operator application review. The list contains only applications this user may
// review, and each detail carries server-computed rights (review_documents, decide).
const TABS = [
  { key: "UNDER_REVIEW", label: "Ready for review" },
  { key: "ACTION_REQUIRED", label: "Waiting on applicant" },
  { key: "DOCUMENTS_PENDING", label: "Uploading documents" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];
const CHIP = { DOCUMENTS_PENDING: "not_started", UNDER_REVIEW: "delayed", ACTION_REQUIRED: "delayed", APPROVED: "completed", REJECTED: "error" };
const DOC_CHIP = { missing: "stale", pending: "not_started", approved: "completed", rejected: "error" };
const DOC_LABEL = { missing: "Not uploaded", pending: "To review", approved: "Approved", rejected: "Rejected" };
const fmt = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—");
const headers = (json = true) => ({ ...(json ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${localStorage.getItem("token")}` });

async function call(path, options) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}

export default function Applications() {
  const [all, setAll] = useState([]);
  const [status, setStatus] = useState("loading");
  const [tab, setTab] = useState("UNDER_REVIEW");
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null); // detail
  const [busy, setBusy] = useState(false);
  const [reasons, setReasons] = useState({}); // doc type -> reason text
  const [decision, setDecision] = useState(null); // { kind: "reject" | "changes", text }
  const [employment, setEmployment] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    try {
      setAll(await call("/onboarding/applications", { headers: headers() }));
      setStatus("ok");
    } catch (err) {
      setStatus(err.status === 403 ? "forbidden" : "error");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => TABS.reduce((m, t) => ({ ...m, [t.key]: all.filter((a) => a.status === t.key).length }), {}), [all]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (a) => a.status === tab && (!role || a.role.toLowerCase() === role) && (!q || [a.application_id, a.fullname, a.email].some((v) => v.toLowerCase().includes(q)))
    );
  }, [all, tab, role, query]);
  const pager = usePagination(visible, 10, `${tab}|${role}|${query}`);

  const openDetail = async (id) => {
    setActionError("");
    setReasons({});
    setDecision(null);
    setEmployment(false);
    try {
      setOpen(await call(`/onboarding/applications/${id}`, { headers: headers() }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const act = async (path, body, success) => {
    setBusy(true);
    setActionError("");
    try {
      const data = await call(`/onboarding/applications/${open.application_id}${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body || {}) });
      setOpen(data);
      setAll((list) => list.map((a) => (a.application_id === data.application_id ? { ...a, status: data.status, documents: data.documents } : a)));
      if (success) toast.success(success);
      return true;
    } catch (err) {
      setActionError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const viewFile = async (type) => {
    const win = window.open("", "_blank");
    try {
      const res = await fetch(`${API_BASE_URL}/onboarding/applications/${open.application_id}/documents/${type}/file`, { headers: headers(false) });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      if (win) win.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      win?.close();
      toast.error("Could not open the file");
    }
  };

  const rights = open?.permissions || {};
  const underReview = open?.status === "UNDER_REVIEW";
  const decided = ["APPROVED", "REJECTED"].includes(open?.status);
  const needsEmployment = open?.role === "Operator" && open?.documents.some((d) => d.type === "offer_letter" && d.required);
  const allApproved = open?.documents.filter((d) => d.required).every((d) => d.status === "approved");

  return (
    <div className="ui-page">
      <PageHeader title="Applications" description="Driver and operator applications. Accounts are created only when an application is approved." />

      <div className="ui-tabs" role="tablist" aria-label="Application status">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" className="ui-tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label} <span className="ui-tab-count">{counts[t.key] || 0}</span>
          </button>
        ))}
      </div>

      <Panel
        title={TABS.find((t) => t.key === tab).label}
        status={status}
        onRetry={load}
        isEmpty={visible.length === 0}
        empty={query || role ? "No applications match these filters." : "No applications here."}
        flush
        action={
          <div className="ui-toolbar">
            <label className="ui-search">
              <FiSearch aria-hidden="true" />
              <input type="search" className="ui-input" placeholder="Search ID, name or email" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search applications" />
            </label>
            <select className="ui-select" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
              <option value="">All roles</option>
              <option value="driver">Drivers</option>
              <option value="operator">Operators</option>
            </select>
          </div>
        }
        footer={<Pagination {...pager} label="applications" />}
      >
        <div className="ui-table-wrap">
          <table className="ui-table ui-table-stack">
            <thead>
              <tr>
                <th scope="col">Applicant</th>
                <th scope="col">Role</th>
                <th scope="col">Documents</th>
                <th scope="col">Submitted</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map((a) => {
                const req = a.documents.filter((d) => d.required);
                return (
                  <tr key={a.application_id}>
                    <td data-label="Applicant">
                      <span className="ui-cell-main">{a.fullname}</span>
                      <span className="ui-cell-sub">{a.application_id} · {a.email}</span>
                    </td>
                    <td data-label="Role">{a.role}</td>
                    <td data-label="Documents">
                      {req.filter((d) => d.status === "approved").length}/{req.length} approved
                    </td>
                    <td data-label="Submitted">{fmt(a.submitted_at)}</td>
                    <td className="ui-cell-actions">
                      <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => openDetail(a.application_id)}>
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog
        open={Boolean(open)}
        onClose={() => !busy && setOpen(null)}
        title={open ? `${open.fullname} — ${open.role}` : ""}
        description={open && `${open.application_id} · ${open.email} · ${open.phone_no}`}
        size="lg"
        closeDisabled={busy}
        footer={
          open &&
          !decided && (
            <>
              {(rights.review_documents || rights.decide) && underReview && (
                <button type="button" className="ui-btn ui-btn-secondary" disabled={busy} onClick={() => setDecision({ kind: "changes", text: "" })}>
                  Request changes
                </button>
              )}
              {rights.decide && (
                <button type="button" className="ui-btn ui-btn-danger-ghost" disabled={busy} onClick={() => setDecision({ kind: "reject", text: "" })}>
                  Reject application
                </button>
              )}
              {rights.decide && (
                <button
                  type="button"
                  className="ui-btn ui-btn-primary"
                  disabled={busy || !underReview || !allApproved || (needsEmployment && !employment)}
                  onClick={() => act("/approve", { employment_verified: needsEmployment ? employment : undefined }, "Application approved — account created")}
                >
                  {busy && <span className="ui-spinner" aria-hidden="true" />} Approve &amp; activate
                </button>
              )}
            </>
          )
        }
      >
        {open && (
          <>
            <div className="apr-section">
              <p>
                <StatusChip status={CHIP[open.status]}>{TABS.find((t) => t.key === open.status)?.label || open.status}</StatusChip>{" "}
                {open.status === "APPROVED" && open.user_id && <span className="ui-hint">Account ID {open.user_id}</span>}
                {open.decision_reason && <span className="ui-hint"> Reason: {open.decision_reason}</span>}
              </p>
              {!rights.review_documents && rights.decide && <p className="ui-hint">You can decide on this application but not review its individual documents.</p>}
              {rights.review_documents && !rights.decide && <p className="ui-hint">You can review documents. An administrator makes the final decision.</p>}
            </div>

            <div className="apr-section">
              <h3>Documents</h3>
              <ul className="apr-docs" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {open.documents.map((d) => (
                  <li key={d.type} className="apr-doc">
                    <div className="apr-doc-head">
                      <div className="apr-doc-title">
                        <span className="ui-cell-main">{d.label}{!d.required && " (optional)"}</span>
                        <span className="ui-cell-sub">{d.file_name ? `${d.file_name} · uploaded ${fmt(d.uploaded_at)}` : "Not uploaded"}</span>
                        {d.reason && <span className="ui-cell-sub">Rejection reason: {d.reason}</span>}
                      </div>
                      <StatusChip status={DOC_CHIP[d.status]}>{DOC_LABEL[d.status]}</StatusChip>
                    </div>
                    <div className="apr-doc-actions">
                      {d.file_name && (
                        <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => viewFile(d.type)}>
                          <FiExternalLink aria-hidden="true" /> Open file
                        </button>
                      )}
                      {rights.review_documents && underReview && d.file_name && d.status !== "approved" && (
                        <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" disabled={busy} onClick={() => act(`/documents/${d.type}/review`, { decision: "approve" })}>
                          <FiCheck aria-hidden="true" /> Approve
                        </button>
                      )}
                      {rights.review_documents && underReview && d.file_name && d.status !== "rejected" && (
                        <>
                          <input
                            className="ui-input"
                            style={{ flex: "1 1 200px" }}
                            placeholder="Reason for rejecting"
                            aria-label={`Reason for rejecting ${d.label}`}
                            value={reasons[d.type] || ""}
                            onChange={(e) => setReasons((r) => ({ ...r, [d.type]: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="ui-btn ui-btn-danger-ghost ui-btn-sm"
                            disabled={busy || (reasons[d.type] || "").trim().length < 3}
                            onClick={() => act(`/documents/${d.type}/review`, { decision: "reject", reason: reasons[d.type].trim() })}
                          >
                            <FiX aria-hidden="true" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {rights.decide && underReview && needsEmployment && (
              <div className="apr-section">
                <label className="apr-check">
                  <input type="checkbox" checked={employment} onChange={(e) => setEmployment(e.target.checked)} />
                  <span>I confirmed this person's employment with the employer named in the offer letter. (Required to approve an operator.)</span>
                </label>
              </div>
            )}

            {decision && (
              <div className="apr-section">
                <Field label={decision.kind === "reject" ? "Reason for rejecting the application" : "What should the applicant change?"}>
                  <textarea className="ui-textarea" rows={3} value={decision.text} onChange={(e) => setDecision((d) => ({ ...d, text: e.target.value }))} />
                </Field>
                <div className="ui-form-actions">
                  <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setDecision(null)} disabled={busy}>Cancel</button>
                  <button
                    type="button"
                    className={`ui-btn ${decision.kind === "reject" ? "ui-btn-danger-ghost" : "ui-btn-primary"}`}
                    disabled={busy || decision.text.trim().length < 3}
                    onClick={async () => {
                      const ok = await act(decision.kind === "reject" ? "/reject" : "/request_changes", decision.kind === "reject" ? { reason: decision.text.trim() } : { comment: decision.text.trim() }, decision.kind === "reject" ? "Application rejected" : "Sent back to the applicant");
                      if (ok) setDecision(null);
                    }}
                  >
                    {decision.kind === "reject" ? "Reject application" : "Send to applicant"}
                  </button>
                </div>
              </div>
            )}

            {actionError && <div className="ui-banner ui-banner-error" role="alert">{actionError}</div>}

            <div className="apr-section">
              <h3>History</h3>
              <ol className="apr-history">
                {open.history.map((h, i) => (
                  <li key={`${h.at}-${i}`}>
                    <time dateTime={h.at}>{fmt(h.at)}</time>
                    <span>
                      <strong>{h.action}</strong> · {h.actor}
                      {h.detail && ` — ${h.detail}`}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
