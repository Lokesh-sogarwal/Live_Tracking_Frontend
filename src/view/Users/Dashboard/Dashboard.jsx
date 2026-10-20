import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import {
  FaBusAlt, FaRoute, FaUsers, FaIdCard, FaMapMarkedAlt, FaExclamationTriangle, FaClock, FaSatelliteDish,
} from "react-icons/fa";
import { MdSchedule, MdOutlineFileUpload, MdAdminPanelSettings } from "react-icons/md";
import { IoDocumentSharp } from "react-icons/io5";
import { IoIosNotifications } from "react-icons/io";
import { FiMessageSquare } from "react-icons/fi";
import { VscFeedback } from "react-icons/vsc";
import { RiFeedbackLine } from "react-icons/ri";
import { CgProfile } from "react-icons/cg";

import "./dashboard.css";
import { usePermissions } from "../../../context/PermissionsContext";
import { allowed, roleKey } from "../../../utils/access";
import { toLocalYYYYMMDD } from "../../../utils/dates";
import {
  byStart, formatAge, formatClock, isDelayed, isInProgress, locationAgeSeconds, summarizeTrips, trackingState, tripStatus,
  STALE_AFTER_SECONDS, tripLocation,
} from "../../../utils/trips";
import useResource from "../../../hooks/useResource";
import useBusLocations from "../../../hooks/useBusLocations";
import { KpiCard, Panel, QuickActions, StatusChip, TripBreakdown, TripRow } from "./components/DashboardUI";

const SCHEDULE_REFRESH_MS = 60_000;

const ACTIONS = {
  createRoute: { rule: "createRoute", to: "/create_routes", label: "Create route", hint: "Add a route with stops", icon: <FaRoute /> },
  registerBus: { rule: "registerBus", to: "/register_bus", label: "Register bus", hint: "Add a vehicle to the fleet", icon: <FaBusAlt /> },
  liveTracking: { rule: "liveTracking", to: "/live_tracking", label: "Live tracking", hint: "See buses on the map", icon: <FaMapMarkedAlt /> },
  busSchedule: { rule: "busSchedule", to: "/bus_schedule", label: "Bus schedule", hint: "Trips by date", icon: <MdSchedule /> },
  reviewDocuments: { rule: "reviewDocuments", to: "/Uploded_documents", label: "Review documents", hint: "Verify driver documents", icon: <IoDocumentSharp /> },
  users: { rule: "users", to: "/users", label: "Manage users", icon: <FaUsers /> },
  drivers: { rule: "drivers", to: "/drivers", label: "Manage drivers", icon: <FaIdCard /> },
  feedbackInbox: { rule: "feedbackInbox", to: "/Feedbacks", label: "Feedback inbox", icon: <VscFeedback /> },
  permissions: { rule: "permissions", to: "/permissions", label: "Permissions", hint: "Role access matrix", icon: <MdAdminPanelSettings /> },
  uploadDocument: { rule: "uploadDocument", to: "/upload", label: "Upload document", hint: "Licence, permits", icon: <MdOutlineFileUpload /> },
  chat: { rule: "chat", to: "/chat", label: "Chat", icon: <FiMessageSquare /> },
  notifications: { rule: "notifications", to: "/notifications", label: "Notifications", icon: <IoIosNotifications /> },
  giveFeedback: { rule: "giveFeedback", to: "/Feedback", label: "Give feedback", icon: <RiFeedbackLine /> },
  profile: { rule: "profile", to: "/profile", label: "My profile", icon: <CgProfile /> },
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const tokenClaims = () => {
  try {
    return jwtDecode(localStorage.getItem("token") || "");
  } catch {
    return {};
  }
};

// Re-render every `ms` so time-based statuses (started, stale) stay current.
const useNow = (ms = 30_000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
};

const Dashboard = () => {
  const { can, role, ready } = usePermissions();
  const claims = useMemo(tokenClaims, []);

  // Client-side expiry check kept from the previous dashboard; the permissions context
  // also ends the session when the server rejects the token.
  useEffect(() => {
    if (!claims.exp || claims.exp < Date.now() / 1000) {
      toast.error("Session expired");
      const t = setTimeout(() => {
        localStorage.removeItem("token");
        window.location.href = "/";
      }, 2000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [claims.exp]);

  if (!ready) {
    return (
      <div className="dash" aria-busy="true">
        <div className="dash-kpis">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="kpi-card">
              <span className="ui-skeleton kpi-skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const key = roleKey(role);
  const firstName = (claims.fullname || "").split(/\s+/)[0] || "there";
  const props = { can, role, userId: claims.user_id, firstName };

  if (["superadmin", "admin", "operator"].includes(key)) return <OperationsDashboard {...props} />;
  if (key === "driver") return <DriverDashboard {...props} />;
  // Passengers, and any role this UI does not know, get the minimal traveller view.
  return <PassengerDashboard {...props} />;
};

function DashHeader({ firstName, subtitle, children }) {
  const today = new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="dash-header">
      <div>
        <h2 className="dash-greeting">
          {greeting()}, {firstName}
        </h2>
        <p className="dash-subtitle">
          {subtitle} <span className="dash-date">{today}</span>
        </p>
      </div>
      {children && <div className="dash-header-actions">{children}</div>}
    </div>
  );
}

function useTodaySchedules(enabled) {
  const today = toLocalYYYYMMDD();
  const res = useResource(`/bus/schedules?date=${today}`, enabled);
  const { reload } = res;
  useEffect(() => {
    if (!enabled) return undefined;
    const t = setInterval(reload, SCHEDULE_REFRESH_MS);
    return () => clearInterval(t);
  }, [enabled, reload]);
  const rows = useMemo(() => (Array.isArray(res.data) ? [...res.data].sort(byStart) : []), [res.data]);
  return { ...res, rows };
}

function RecentNotifications({ can, role }) {
  const enabled = allowed("notifications", can, role);
  const res = useResource("/view/notifications?limit=5", enabled);
  if (!enabled) return null;
  const list = Array.isArray(res.data) ? res.data : [];
  return (
    <Panel
      title="Recent activity"
      subtitle="Your latest notifications"
      action={<Link className="ui-btn ui-btn-ghost" to="/notifications">View all</Link>}
      status={res.status}
      onRetry={res.reload}
      isEmpty={list.length === 0}
      empty="No notifications yet."
    >
      <ul className="activity-list">
        {list.map((n) => (
          <li key={n.id} className={n.is_read ? "" : "unread"}>
            <span className="activity-dot" aria-hidden="true" />
            <span className="activity-text">{n.message}</span>
            <time className="activity-time">{n.timestamp}</time>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Superadmin / Admin / Operator
// ---------------------------------------------------------------------------
function OperationsDashboard({ can, role, firstName }) {
  const now = useNow();
  const canSchedules = allowed("readSchedules", can, role);
  const canTrack = allowed("busTracking", can, role);
  const schedules = useTodaySchedules(canSchedules);
  const counts = useResource("/data/get_data?limit=1&active_limit=1", can("dashboard") || can("active_users"));
  const buses = useResource("/bus/get_all_buses", can("dashboard") || can("register_bus"));
  const routes = useResource("/data/get_routes", can("dashboard"));
  const canDocs = allowed("reviewDocuments", can, role);
  const docs = useResource("/data/get_documents?limit=1000", canDocs);

  const summary = useMemo(() => summarizeTrips(schedules.rows, now), [schedules.rows, now]);
  const running = schedules.rows.filter((r) => isInProgress(r, now));
  const locations = useBusLocations(running.map((r) => r.bus_id), { enabled: canTrack });
  const pendingDocs = Array.isArray(docs.data?.documents) ? docs.data.documents.filter((d) => !d.is_verified && !d.is_rejected).length : 0;

  const delayed = schedules.rows.filter((r) => !r.is_reached && isDelayed(r));
  // A missing signal is a property of the bus, so one alert per bus (a bus can have
  // overlapping in-progress trips).
  const silent = canTrack
    ? running.filter((r, i) => {
        if (running.findIndex((x) => x.bus_id === r.bus_id) !== i) return false;
        const age = locationAgeSeconds(tripLocation(locations, r), now);
        return age === null || age > STALE_AFTER_SECONDS;
      })
    : [];
  const nextUp = schedules.rows.filter((r) => !r.is_reached).slice(0, 6);
  const alertsCount = delayed.length + silent.length + (pendingDocs > 0 ? 1 : 0);

  const c = counts.data || {};
  return (
    <div className="dash">
      <DashHeader firstName={firstName} subtitle="Here is how the network is running today.">
        {allowed("liveTracking", can, role) && (
          <Link to="/live_tracking" className="ui-btn ui-btn-primary">
            <FaMapMarkedAlt aria-hidden="true" /> Open live map
          </Link>
        )}
      </DashHeader>

      <div className="dash-kpis">
        {canSchedules && (
          <KpiCard
            label="Trips today"
            value={summary.total}
            hint={`${summary.running} running · ${summary.completed} completed`}
            icon={<MdSchedule />}
            to={allowed("busSchedule", can, role) ? "/bus_schedule" : undefined}
            status={schedules.status}
          />
        )}
        {canSchedules && (
          <KpiCard
            label="Delayed"
            value={summary.delayed}
            hint={summary.delayed ? "Needs attention" : "All trips on schedule"}
            icon={<FaExclamationTriangle />}
            tone={summary.delayed ? "amber" : "plum"}
            status={schedules.status}
          />
        )}
        {(can("dashboard") || can("register_bus")) && (
          <KpiCard
            label="Buses"
            value={Array.isArray(buses.data) ? buses.data.length : 0}
            hint={`${new Set(running.map((r) => r.bus_id)).size} on the road now`}
            icon={<FaBusAlt />}
            to={allowed("registerBus", can, role) ? "/register_bus" : undefined}
            status={buses.status}
          />
        )}
        {can("dashboard") && (
          <KpiCard
            label="Routes"
            value={Array.isArray(routes.data) ? routes.data.length : 0}
            icon={<FaRoute />}
            to={allowed("createRoute", can, role) ? "/create_routes" : undefined}
            status={routes.status}
            tone="plum"
          />
        )}
        {allowed("drivers", can, role) && (
          <KpiCard label="Drivers" value={c.total_drivers ?? c.total_driver ?? 0} icon={<FaIdCard />} to="/drivers" status={counts.status} />
        )}
        {allowed("users", can, role) && (
          <KpiCard
            label="Users"
            value={c.total_users ?? 0}
            hint={allowed("activeUsers", can, role) ? `${c.total_active_users ?? 0} signed in now` : undefined}
            icon={<FaUsers />}
            to="/users"
            status={counts.status}
            tone="plum"
          />
        )}
        {canDocs && (
          <KpiCard
            label="Documents to review"
            value={pendingDocs}
            icon={<IoDocumentSharp />}
            to="/Uploded_documents"
            status={docs.status}
            tone={pendingDocs ? "amber" : "plum"}
          />
        )}
      </div>

      <div className="dash-grid">
        <div className="dash-col-main">
          {canSchedules && (
            <Panel
              title="Today's operations"
              subtitle={`${summary.total} trips scheduled`}
              action={allowed("busSchedule", can, role) && <Link className="ui-btn ui-btn-ghost" to="/bus_schedule">Full schedule</Link>}
              status={schedules.status}
              onRetry={schedules.reload}
              isEmpty={summary.total === 0}
              empty="No trips are scheduled for today."
            >
              <TripBreakdown summary={summary} />
              {nextUp.length > 0 && (
                <>
                  <h3 className="panel-subheading">Running and next departures</h3>
                  <ul className="trip-list">
                    {nextUp.map((r) => (
                      <TripRow key={r.schedule_id} row={r} status={tripStatus(r, tripLocation(locations, r), now)} canTrack={canTrack} />
                    ))}
                  </ul>
                </>
              )}
            </Panel>
          )}
          <RecentNotifications can={can} role={role} />
        </div>

        <div className="dash-col-side">
          {(canSchedules || canDocs) && (
            <Panel
              title="Alerts"
              subtitle={alertsCount ? `${alertsCount} item${alertsCount > 1 ? "s" : ""} need attention` : "Nothing needs attention"}
              status={canSchedules ? schedules.status : docs.status}
              onRetry={schedules.reload}
              isEmpty={alertsCount === 0}
              empty="No delays, signal gaps or pending documents."
            >
              <ul className="alert-list">
                {delayed.map((r) => (
                  <li key={`d${r.schedule_id}`} className="alert alert-amber">
                    <FaClock aria-hidden="true" />
                    <span>
                      <strong>{r.route_name}</strong> is delayed
                      <span className="alert-meta">Bus {r.bus_number} · starts {formatClock(r.arrival_time)}</span>
                    </span>
                  </li>
                ))}
                {silent.map((r) => (
                  <li key={`s${r.schedule_id}`} className="alert alert-gray">
                    <FaSatelliteDish aria-hidden="true" />
                    <span>
                      <strong>Bus {r.bus_number}</strong> has no recent location
                      <span className="alert-meta">
                        {r.route_name} · {formatAge(locationAgeSeconds(tripLocation(locations, r), now))}
                      </span>
                    </span>
                  </li>
                ))}
                {pendingDocs > 0 && (
                  <li className="alert alert-plum">
                    <IoDocumentSharp aria-hidden="true" />
                    <span>
                      <strong>{pendingDocs} driver document{pendingDocs > 1 ? "s" : ""}</strong> awaiting review
                      <Link to="/Uploded_documents" className="alert-link">Review</Link>
                    </span>
                  </li>
                )}
              </ul>
            </Panel>
          )}
          <QuickActions
            can={can}
            role={role}
            actions={[ACTIONS.createRoute, ACTIONS.registerBus, ACTIONS.busSchedule, ACTIONS.reviewDocuments, ACTIONS.users, ACTIONS.drivers, ACTIONS.feedbackInbox, ACTIONS.permissions]}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------
function DriverDashboard({ can, role, userId, firstName }) {
  const now = useNow();
  const canSchedules = allowed("readSchedules", can, role);
  const canTrack = allowed("busTracking", can, role);
  const schedules = useTodaySchedules(canSchedules);
  const mine = schedules.rows.filter((r) => r.driver_id && r.driver_id === userId);
  const current = mine.find((r) => isInProgress(r, now)) || mine.find((r) => !r.is_reached) || mine[mine.length - 1];
  const locations = useBusLocations(current ? [current.bus_id] : [], { enabled: canTrack });
  const loc = tripLocation(locations, current);
  const age = locationAgeSeconds(loc, now);
  const done = mine.filter((r) => r.is_reached).length;
  const next = mine.find((r) => !r.is_reached && !isInProgress(r, now));

  return (
    <div className="dash">
      <DashHeader firstName={firstName} subtitle="Your trips and bus status for today." />

      {canSchedules && (
        <div className="dash-kpis">
          <KpiCard label="My trips today" value={mine.length} icon={<MdSchedule />} status={schedules.status} />
          <KpiCard label="Completed" value={done} hint={`${mine.length - done} remaining`} icon={<FaRoute />} status={schedules.status} tone="plum" />
          <KpiCard label="Next departure" value={next ? formatClock(next.arrival_time) : "—"} hint={next ? next.route_name : "No more trips today"} icon={<FaClock />} status={schedules.status} />
          {canTrack && (
            <KpiCard
              label="Bus location"
              value={current ? formatAge(age) : "—"}
              hint={current ? `Bus ${current.bus_number}` : "No bus assigned today"}
              icon={<FaSatelliteDish />}
              status={schedules.status}
              tone={age !== null && age <= STALE_AFTER_SECONDS ? "green" : "amber"}
            />
          )}
        </div>
      )}

      <div className="dash-grid">
        <div className="dash-col-main">
          {canSchedules && (
            <Panel
              title={current && isInProgress(current, now) ? "Current trip" : "Your next trip"}
              status={schedules.status}
              onRetry={schedules.reload}
              isEmpty={!current}
              empty="You have no trips assigned today."
            >
              {current && (
                <div className="current-trip">
                  <div className="current-trip-head">
                    <div>
                      <h3 className="current-trip-route">{current.route_name}</h3>
                      <p className="current-trip-path">
                        {current.start_point} → {current.end_point}
                      </p>
                    </div>
                    <StatusChip status={tripStatus(current, loc, now)} />
                  </div>
                  <dl className="current-trip-facts">
                    <div><dt>Bus</dt><dd>{current.bus_number}</dd></div>
                    <div><dt>Departs</dt><dd>{formatClock(current.arrival_time)}</dd></div>
                    <div><dt>Arrives</dt><dd>{formatClock(current.departure_time)}</dd></div>
                    {canTrack && <div><dt>Last location update</dt><dd>{formatAge(age)}</dd></div>}
                  </dl>
                  {canTrack && !current.is_reached && (
                    <Link to="/bus_tracking" state={trackingState(current)} className="ui-btn ui-btn-primary">
                      <FaMapMarkedAlt aria-hidden="true" /> View trip on map
                    </Link>
                  )}
                </div>
              )}
            </Panel>
          )}
          {canSchedules && mine.length > 0 && (
            <Panel title="My schedule today" subtitle={`${mine.length} trips`}>
              <ul className="trip-list">
                {mine.map((r) => (
                  <TripRow key={r.schedule_id} row={r} status={tripStatus(r, r.bus_id === current?.bus_id ? loc : null, now)} showDriver={false} canTrack={canTrack} />
                ))}
              </ul>
            </Panel>
          )}
          <RecentNotifications can={can} role={role} />
        </div>
        <div className="dash-col-side">
          <QuickActions can={can} role={role} actions={[ACTIONS.uploadDocument, ACTIONS.busSchedule, ACTIONS.chat, ACTIONS.notifications, ACTIONS.profile]} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Passenger (and unknown roles)
// ---------------------------------------------------------------------------
function PassengerDashboard({ can, role, firstName }) {
  const now = useNow();
  const canSchedules = allowed("readSchedules", can, role);
  const canTrack = allowed("busTracking", can, role);
  const schedules = useTodaySchedules(canSchedules);
  const running = schedules.rows.filter((r) => isInProgress(r, now));
  const upcoming = schedules.rows.filter((r) => !r.is_reached && !isInProgress(r, now)).slice(0, 5);
  const locations = useBusLocations(running.map((r) => r.bus_id), { enabled: canTrack });
  const summary = useMemo(() => summarizeTrips(schedules.rows, now), [schedules.rows, now]);

  return (
    <div className="dash">
      <DashHeader firstName={firstName} subtitle="Buses running now and upcoming departures.">
        {allowed("liveTracking", can, role) && (
          <Link to="/live_tracking" className="ui-btn ui-btn-primary">
            <FaMapMarkedAlt aria-hidden="true" /> Find a bus
          </Link>
        )}
      </DashHeader>

      {canSchedules && (
        <div className="dash-kpis">
          <KpiCard label="Running now" value={summary.running} icon={<FaBusAlt />} status={schedules.status} />
          <KpiCard label="Departures left today" value={summary.upcoming} icon={<FaClock />} status={schedules.status} tone="plum" />
          <KpiCard label="Delayed" value={summary.delayed} icon={<FaExclamationTriangle />} status={schedules.status} tone={summary.delayed ? "amber" : "plum"} />
        </div>
      )}

      <div className="dash-grid">
        <div className="dash-col-main">
          {canSchedules && (
            <Panel
              title="Running now"
              subtitle="Live position where available"
              status={schedules.status}
              onRetry={schedules.reload}
              isEmpty={running.length === 0}
              empty="No buses are running right now."
            >
              <ul className="trip-list">
                {running.map((r) => (
                  <TripRow key={r.schedule_id} row={r} status={tripStatus(r, tripLocation(locations, r), now)} showDriver={false} canTrack={canTrack} />
                ))}
              </ul>
            </Panel>
          )}
          {canSchedules && (
            <Panel
              title="Upcoming departures"
              status={schedules.status}
              onRetry={schedules.reload}
              isEmpty={upcoming.length === 0}
              empty="No more departures today."
            >
              <ul className="trip-list">
                {upcoming.map((r) => (
                  <TripRow key={r.schedule_id} row={r} status="not_started" showDriver={false} canTrack={false} />
                ))}
              </ul>
            </Panel>
          )}
          <RecentNotifications can={can} role={role} />
        </div>
        <div className="dash-col-side">
          <QuickActions can={can} role={role} actions={[ACTIONS.liveTracking, ACTIONS.giveFeedback, ACTIONS.chat, ACTIONS.notifications]} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
