import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import "./show_feedback.css";
import useResource from "../../../hooks/useResource";
import { PageHeader, Panel, Pagination, usePagination } from "../../../Components/ui";
import { CATEGORY_LABEL, STATUS_LABEL, StatusBadge, fmt } from "./Conversation";

// Staff inbox (GET /feedback: operator+ with the "Feedbacks" permission, enforced server-side).
const TABS = ["all", "new", "in_review", "replied", "resolved"];

const ShowFeedback = () => {
  const [tab, setTab] = useState("new");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const params = new URLSearchParams(Object.entries({ category, priority, from, to }).filter(([, v]) => v)).toString();
  const res = useResource(`/feedback${params ? `?${params}` : ""}`);
  const all = useMemo(() => (Array.isArray(res.data) ? res.data : []), [res.data]);

  const counts = useMemo(() => TABS.reduce((m, t) => ({ ...m, [t]: t === "all" ? all.length : all.filter((f) => f.status === t).length }), {}), [all]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (f) => (tab === "all" || f.status === tab) && (!q || [f.reference, f.subject, f.message, f.submitter_name, f.submitter_email].some((v) => (v || "").toLowerCase().includes(q)))
    );
  }, [all, tab, query]);
  const pager = usePagination(visible, 12, `${tab}|${query}|${params}`);

  return (
    <div className="ui-page">
      <PageHeader title="Feedbacks & complaints" description="Read what passengers and staff send, reply from here, and track each conversation to resolution." />

      <div className="ui-tabs" role="tablist" aria-label="Feedback status">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" className="ui-tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === "all" ? "All" : STATUS_LABEL[t]} <span className="ui-tab-count">{counts[t]}</span>
          </button>
        ))}
      </div>

      <Panel
        title={tab === "all" ? "All feedback" : STATUS_LABEL[tab]}
        subtitle={res.status === "ok" ? `${visible.length} shown` : undefined}
        status={res.status === "idle" ? "loading" : res.status}
        onRetry={res.reload}
        isEmpty={visible.length === 0}
        empty={query || params ? "No feedback matches these filters." : "Nothing here."}
        flush
        action={
          <div className="ui-toolbar fb-filters">
            <label className="ui-search">
              <FiSearch aria-hidden="true" />
              <input type="search" className="ui-input" placeholder="Search reference, name or text" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search feedback" />
            </label>
            <select className="ui-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Topic">
              <option value="">All topics</option>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="ui-select" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
              <option value="">Any priority</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <input type="date" className="ui-input fb-date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
            <input type="date" className="ui-input fb-date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          </div>
        }
        footer={<Pagination {...pager} label="feedback" />}
      >
        <div className="ui-table-wrap">
          <table className="ui-table ui-table-stack">
            <thead>
              <tr>
                <th scope="col">Feedback</th>
                <th scope="col">From</th>
                <th scope="col">Received</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map((f) => (
                <tr key={f.id} className={f.priority === "high" ? "fb-high" : undefined}>
                  <td data-label="Feedback">
                    <span className="ui-cell-main">{f.subject || f.message.slice(0, 80)}</span>
                    <span className="ui-cell-sub">
                      {f.reference} · {CATEGORY_LABEL[f.category]}
                      {f.priority !== "normal" && ` · ${f.priority} priority`}
                      {f.reply_count > 0 && ` · ${f.reply_count} ${f.reply_count === 1 ? "reply" : "replies"}`}
                    </span>
                  </td>
                  <td data-label="From">
                    <span className="ui-cell-main">{f.submitter_name}</span>
                    <span className="ui-cell-sub">{f.submitter_email}</span>
                  </td>
                  <td data-label="Received">{fmt(f.created_at)}</td>
                  <td data-label="Status"><StatusBadge status={f.status} /></td>
                  <td className="ui-cell-actions">
                    <Link to={`/Feedbacks/${f.id}`} className="ui-btn ui-btn-secondary ui-btn-sm">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};

export default ShowFeedback;
