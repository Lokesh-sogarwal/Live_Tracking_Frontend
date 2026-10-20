import React from "react";
import { Link } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import { Panel, StatusChip } from "../../../../Components/ui";
import { allowed } from "../../../../utils/access";
import { formatClock, trackingState } from "../../../../utils/trips";

// KPI tile. `to` makes the whole tile a link; `status` drives the loading/error rendering.
export function KpiCard({ label, value, hint, icon, to, status = "ok", tone = "rose" }) {
  const body = (
    <>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {icon && (
          <span className={`kpi-icon kpi-icon-${tone}`} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      {status === "loading" ? (
        <span className="ui-skeleton kpi-skeleton" />
      ) : status === "error" || status === "forbidden" ? (
        <span className="kpi-value kpi-value-muted" title="Could not load">—</span>
      ) : (
        <span className="kpi-value">{value}</span>
      )}
      {hint && status === "ok" && <span className="kpi-hint">{hint}</span>}
    </>
  );
  return to ? (
    <Link to={to} className="kpi-card kpi-card-link">
      {body}
    </Link>
  ) : (
    <div className="kpi-card">{body}</div>
  );
}

// Panel and StatusChip are shared app-wide (Components/ui); re-exported for the dashboard.
export { Panel, StatusChip };

// Shortcuts to existing pages; only those the role may use are rendered.
export function QuickActions({ actions, can, role }) {
  const visible = actions.filter((a) => allowed(a.rule, can, role));
  if (!visible.length) return null;
  return (
    <section className="ui-card panel">
      <header className="ui-card-header">
        <h2 className="ui-card-title">Quick actions</h2>
      </header>
      <div className="ui-card-body quick-actions">
        {visible.map((a) => (
          <Link key={a.to} to={a.to} className="quick-action">
            <span className="quick-action-icon" aria-hidden="true">
              {a.icon}
            </span>
            <span className="quick-action-text">
              <span className="quick-action-title">{a.label}</span>
              {a.hint && <span className="quick-action-hint">{a.hint}</span>}
            </span>
            <FiChevronRight className="quick-action-arrow" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

// Horizontal breakdown of today's trips (counts only; every segment is real data).
export function TripBreakdown({ summary }) {
  const parts = [
    { key: "running", label: "Running", value: summary.running, cls: "live" },
    { key: "upcoming", label: "Upcoming", value: summary.upcoming, cls: "not_started" },
    { key: "completed", label: "Completed", value: summary.completed, cls: "completed" },
    { key: "cancelled", label: "Cancelled", value: summary.cancelled, cls: "error" },
  ].filter((p) => p.value > 0 || p.key !== "cancelled");
  const total = summary.total || 1;
  return (
    <div className="breakdown">
      <div className="breakdown-bar" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {parts.map((p) =>
          p.value > 0 ? <span key={p.key} className={`breakdown-seg seg-${p.cls}`} style={{ width: `${(p.value / total) * 100}%` }} /> : null
        )}
      </div>
      <ul className="breakdown-legend">
        {parts.map((p) => (
          <li key={p.key}>
            <span className={`legend-swatch seg-${p.cls}`} aria-hidden="true" />
            {p.label} <strong>{p.value}</strong>
          </li>
        ))}
        {summary.delayed > 0 && (
          <li>
            <span className="legend-swatch seg-delayed" aria-hidden="true" />
            Delayed <strong>{summary.delayed}</strong>
          </li>
        )}
      </ul>
    </div>
  );
}

// One trip line: time window, route, bus/driver, status, and a "Track" link when allowed.
export function TripRow({ row, status, showDriver = true, canTrack }) {
  return (
    <li className="trip-row">
      <span className="trip-time">
        {formatClock(row.arrival_time)}
        <span className="trip-time-end">{formatClock(row.departure_time)}</span>
      </span>
      <span className="trip-main">
        <span className="trip-route">{row.route_name}</span>
        <span className="trip-meta">
          Bus {row.bus_number}
          {showDriver && row.driver_name ? ` · ${row.driver_name}` : ""}
        </span>
      </span>
      <StatusChip status={status} />
      {canTrack && !row.is_reached && (
        <Link to="/bus_tracking" state={trackingState(row)} className="ui-btn ui-btn-ghost trip-track">
          Track
        </Link>
      )}
    </li>
  );
}
