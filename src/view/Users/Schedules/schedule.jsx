import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FiChevronLeft, FiChevronRight, FiSearch, FiPlus, FiChevronDown, FiChevronUp } from "react-icons/fi";
import "./ShowSchedules.css";
import API_BASE_URL from "../../../utils/config";
import useResource from "../../../hooks/useResource";
import { usePermissions } from "../../../context/PermissionsContext";
import { allowed } from "../../../utils/access";
import { toLocalYYYYMMDD } from "../../../utils/dates";
import { byStart, formatClock, isDelayed, trackingState, lifecycleOf } from "../../../utils/trips";
import { PageHeader, Panel, Field, Dialog, Pagination, usePagination } from "../../../Components/ui";

// Schedule status for a timetable view (no live position needed).
// Labels for the shared trip lifecycle (utils/trips.js lifecycleOf = server tripLifecycle).
const STATUS = {
  running: { label: "Running", chip: "live" },
  upcoming: { label: "Upcoming", chip: "not_started" },
  awaiting: { label: "Awaiting first location", chip: "awaiting" },
  missed: { label: "Did not depart", chip: "missed" },
  delayed: { label: "Delayed", chip: "delayed" },
  completed: { label: "Completed", chip: "completed" },
  delayed_completed: { label: "Completed late", chip: "delayed_completed" },
  cancelled: { label: "Cancelled", chip: "error" },
};
const LIFECYCLE_TO_STATUS = {
  upcoming: "upcoming",
  not_started: "awaiting", // due, not departed yet
  running: "running",
  delayed: "delayed",
  did_not_depart: "missed",
  completed: "completed",
  delayed_completed: "delayed_completed",
  cancelled: "cancelled",
  invalid: "cancelled",
};
const scheduleStatus = (r, now) => {
  const s = LIFECYCLE_TO_STATUS[lifecycleOf(r, now)];
  // An operator-set "delayed" shows as Delayed until the trip finishes.
  return (s === "awaiting" || s === "running") && isDelayed(r) ? "delayed" : s;
};

const shiftDate = (yyyyMmDd, days) => {
  const d = new Date(`${yyyyMmDd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalYYYYMMDD(d);
};

const ShowSchedules = () => {
  const { can, role } = usePermissions();
  const [date, setDate] = useState(toLocalYYYYMMDD());
  const res = useResource(date ? `/bus/schedules?date=${date}&include_route_details=1` : null, Boolean(date));
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [creating, setCreating] = useState(false);
  const now = new Date();

  const rows = useMemo(() => (Array.isArray(res.data) ? [...res.data].sort(byStart) : []), [res.data]);
  const withStatus = rows.map((r) => ({ ...r, _status: scheduleStatus(r, now) }));
  const counts = withStatus.reduce((c, r) => ({ ...c, [r._status]: (c[r._status] || 0) + 1 }), {});
  const routes = [...new Map(rows.map((r) => [r.route_id, r.route_name])).entries()];
  const q = query.trim().toLowerCase();
  const visible = withStatus.filter(
    (r) =>
      (tab === "all" || r._status === tab) &&
      (routeFilter === "all" || String(r.route_id) === routeFilter) &&
      (!q || [r.route_name, r.bus_number, r.driver_name, r.start_point, r.end_point].some((v) => (v || "").toLowerCase().includes(q)))
  );
  const pager = usePagination(visible, 20, `${date}|${tab}|${q}|${routeFilter}`);
  const canTrack = allowed("busTracking", can, role);
  const isToday = date === toLocalYYYYMMDD();

  const tabs = [["all", "All", rows.length], ...Object.entries(STATUS).filter(([k]) => k !== "cancelled" || counts.cancelled).map(([k, v]) => [k, v.label, counts[k] || 0])];

  return (
    <div className="ui-page">
      <PageHeader
        title="Bus schedule"
        description="Trips for a day, with their bus, driver and status."
        actions={
          allowed("createSchedule", can, role) && (
            <button type="button" className="ui-btn ui-btn-primary" onClick={() => setCreating(true)}>
              <FiPlus aria-hidden="true" /> Create trip
            </button>
          )
        }
      />

      <div className="ui-toolbar">
        <div className="sch-date" role="group" aria-label="Date">
          <button type="button" className="ui-icon-btn" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">
            <FiChevronLeft />
          </button>
          <input className="ui-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Schedule date" />
          <button type="button" className="ui-icon-btn" onClick={() => setDate(shiftDate(date, 1))} aria-label="Next day">
            <FiChevronRight />
          </button>
          {!isToday && (
            <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setDate(toLocalYYYYMMDD())}>
              Today
            </button>
          )}
        </div>
        <div className="ui-toolbar-spacer" />
        <div className="ui-search">
          <FiSearch aria-hidden="true" />
          <input className="ui-input" type="search" placeholder="Search route, bus or driver" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search trips" />
        </div>
        {routes.length > 1 && (
          <select className="ui-select" value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)} aria-label="Filter by route">
            <option value="all">All routes</option>
            {routes.map(([id, name]) => (
              <option key={id} value={String(id)}>{name}</option>
            ))}
          </select>
        )}
      </div>

      {res.status === "ok" && rows.length > 0 && (
        <div className="ui-tabs" role="tablist" aria-label="Filter by status">
          {tabs.map(([k, label, n]) => (
            <button key={k} type="button" role="tab" className="ui-tab" aria-selected={tab === k} onClick={() => setTab(k)}>
              {label}<span className="ui-tab-count">{n}</span>
            </button>
          ))}
        </div>
      )}

      <Panel
        flush
        status={res.status === "idle" ? "loading" : res.status}
        onRetry={res.reload}
        isEmpty={res.status === "ok" && visible.length === 0}
        empty={rows.length === 0 ? "No trips are scheduled for this date." : "No trips match these filters."}
        footer={<Pagination {...pager} label="trips" />}
      >
        <div className="ui-table-wrap">
          <table className="ui-table ui-table-stack">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Route</th>
                <th scope="col">Bus</th>
                <th scope="col">Driver</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map((r) => {
                const stops = Array.isArray(r.route_stops) ? [...r.route_stops].sort((a, b) => (a.sequence || 0) - (b.sequence || 0)) : [];
                const open = expanded === r.schedule_id;
                return (
                  <React.Fragment key={r.schedule_id}>
                    <tr>
                      <td data-label="Time">
                        <span className="ui-cell-main">{formatClock(r.arrival_time)}</span>
                        <span className="ui-cell-sub">until {formatClock(r.departure_time)}</span>
                      </td>
                      <td data-label="Route">
                        <span className="ui-cell-main">{r.route_name}</span>
                        <span className="ui-cell-sub">{r.start_point} → {r.end_point}</span>
                      </td>
                      <td data-label="Bus">{r.bus_number}</td>
                      <td data-label="Driver">{r.driver_name}</td>
                      <td data-label="Status"><span className={`ui-chip ui-chip-${STATUS[r._status].chip}`}>{STATUS[r._status].label}</span></td>
                      <td data-label="" className="ui-cell-actions">
                        {stops.length > 0 && (
                          <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" aria-expanded={open} onClick={() => setExpanded(open ? null : r.schedule_id)}>
                            {stops.length} stop{stops.length > 1 ? "s" : ""} {open ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
                          </button>
                        )}
                        {canTrack && !r.is_reached && (
                          <Link to="/bus_tracking" state={trackingState(r)} className="ui-btn ui-btn-ghost ui-btn-sm">Track</Link>
                        )}
                      </td>
                    </tr>
                    {open && (
                      <tr className="sch-stops-row">
                        <td colSpan={6} data-label="">
                          <ol className="sch-stops">
                            <li><strong>{r.start_point}</strong> <span>start</span></li>
                            {stops.map((s) => <li key={s.stop_id}>{s.stop_name}</li>)}
                            <li><strong>{r.end_point}</strong> <span>end</span></li>
                          </ol>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {creating && <CreateTripDialog defaultDate={date} onClose={() => setCreating(false)} onCreated={(d) => { setCreating(false); if (d === date) res.reload(); else setDate(d); }} />}
    </div>
  );
};

// POST /bus/schedules. Lists come from existing endpoints; times are in the app timezone.
function CreateTripDialog({ defaultDate, onClose, onCreated }) {
  const routes = useResource("/data/get_routes", true);
  const buses = useResource("/bus/get_all_buses", true);
  const drivers = useResource("/view/driver_details", true);
  const [f, setF] = useState({ route_id: "", bus_id: "", driver_uuid: "", date: defaultDate, start: "", end: "", status: "on_time" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const loading = [routes, buses, drivers].some((r) => r.status === "loading");
  const failed = [routes, buses, drivers].some((r) => r.status === "error" || r.status === "forbidden");

  useEffect(() => setErrors({}), [f.route_id, f.bus_id, f.driver_uuid]);

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!f.route_id) next.route_id = "Choose a route";
    if (!f.bus_id) next.bus_id = "Choose a bus";
    if (!f.driver_uuid) next.driver_uuid = "Choose a driver";
    if (!f.date) next.date = "Choose a date";
    if (!f.start) next.start = "Required";
    if (!f.end) next.end = "Required";
    if (f.start && f.end && f.end <= f.start) next.end = "Must be after the start time";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bus/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        // Legacy field naming: arrival_time is the trip start, departure_time the trip end.
        body: JSON.stringify({ route_id: Number(f.route_id), bus_id: Number(f.bus_id), driver_uuid: f.driver_uuid, date: f.date, arrival_time: f.start, departure_time: f.end, status: f.status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not create the trip");
        return;
      }
      toast.success("Trip created");
      onCreated(f.date);
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      closeDisabled={busy}
      size="lg"
      title="Create trip"
      description="Assign a bus and a driver to a route for one day."
      footer={
        <>
          <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="create-trip" className="ui-btn ui-btn-primary" disabled={busy || loading || failed}>
            {busy && <span className="ui-spinner" aria-hidden="true" />} Create trip
          </button>
        </>
      }
    >
      {failed ? (
        <div className="ui-banner ui-banner-error" role="alert">Could not load routes, buses or drivers.</div>
      ) : (
        <form id="create-trip" className="ui-form ui-form-grid" onSubmit={submit} noValidate>
          <Field label="Route" error={errors.route_id} full>
            <select className="ui-select" value={f.route_id} onChange={set("route_id")} disabled={loading} data-autofocus>
              <option value="">{loading ? "Loading…" : "Choose a route"}</option>
              {(routes.data || []).map((r) => <option key={r.route_id} value={r.route_id}>{r.route_name} ({r.start_point} → {r.end_point})</option>)}
            </select>
          </Field>
          <Field label="Bus" error={errors.bus_id}>
            <select className="ui-select" value={f.bus_id} onChange={set("bus_id")} disabled={loading}>
              <option value="">Choose a bus</option>
              {(buses.data || []).map((b) => <option key={b.bus_id} value={b.bus_id}>{b.bus_number}</option>)}
            </select>
          </Field>
          <Field label="Driver" error={errors.driver_uuid}>
            <select className="ui-select" value={f.driver_uuid} onChange={set("driver_uuid")} disabled={loading}>
              <option value="">Choose a driver</option>
              {(drivers.data || []).map((d) => <option key={d.user_uuid} value={d.user_uuid}>{d.fullname}</option>)}
            </select>
          </Field>
          <Field label="Date" error={errors.date}>
            <input className="ui-input" type="date" value={f.date} onChange={set("date")} />
          </Field>
          <Field label="Status">
            <select className="ui-select" value={f.status} onChange={set("status")}>
              <option value="on_time">On time</option>
              <option value="delayed">Delayed</option>
            </select>
          </Field>
          <Field label="Starts at" error={errors.start}>
            <input className="ui-input" type="time" value={f.start} onChange={set("start")} />
          </Field>
          <Field label="Ends at" error={errors.end}>
            <input className="ui-input" type="time" value={f.end} onChange={set("end")} />
          </Field>
        </form>
      )}
    </Dialog>
  );
}

export default ShowSchedules;
