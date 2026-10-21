// Trip timing and status for rows from GET /bus/schedules (and route search).
//
// The server sends exact instants (`start_at`, `end_at`), whether the bus has departed
// (`started`) and the trip's `lifecycle` (backend-node/src/services/tripLifecycle.js).
// lifecycleOf() below applies the SAME rules, so every screen agrees and stays current between
// refreshes. Older payloads without start_at fall back to `date` + "HH:MM" (legacy naming:
// `arrival_time` is the START, `departure_time` the END) in the browser's timezone.

// Mirrors the server's LOCATION_STALE_SECONDS default.
export const STALE_AFTER_SECONDS = 120;

export const STATUS_LABELS = {
  upcoming: "Upcoming",
  // Due (or departed) but no position has been received for this trip yet.
  awaiting: "Awaiting first location",
  live: "Live",
  delayed: "Delayed",
  stale: "Stale",
  // Its scheduled window passed and the bus never departed (it is not started late).
  missed: "Did not depart",
  completed: "Completed",
  // Reached the destination after its scheduled arrival (server status "delayed_completed").
  delayed_completed: "Completed late",
  cancelled: "Cancelled",
  invalid: "Invalid schedule",
  not_started: "Not started", // kept for older callers
};

const toDate = (date, hhmm) => {
  if (!date || !hhmm) return null;
  const d = new Date(`${date}T${hhmm}`);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const tripStart = (row) => (row.start_at ? new Date(row.start_at) : toDate(row.date, row.arrival_time));
export const tripEnd = (row) => (row.end_at ? new Date(row.end_at) : toDate(row.date, row.departure_time));

export const isDelayed = (row) => /delay/i.test(row.status || "") && !/delayed_completed/i.test(row.status || "");
export const isCancelled = (row) => /cancel/i.test(row.status || "");
export const hasStarted = (row, now = new Date()) => {
  const start = tripStart(row);
  return Boolean(start && start <= now);
};

// Same rules as the server's tripLifecycle(). A position produced by this trip counts as departed.
//   upcoming | not_started (due, not departed) | running | delayed | did_not_depart |
//   completed | delayed_completed | cancelled | invalid
export function lifecycleOf(row, now = new Date(), hasPosition = false) {
  const status = String(row.status || "").toLowerCase();
  if (/cancel/.test(status)) return "cancelled";
  if (row.is_reached) return status === "delayed_completed" ? "delayed_completed" : "completed";
  const start = tripStart(row);
  const end = tripEnd(row);
  if (!start || !end) return row.lifecycle || "upcoming";
  if (!(start < end)) return "invalid";
  if (row.started === true || hasPosition) return status === "delayed" || now > end ? "delayed" : "running";
  if (now < start) return "upcoming";
  if (now < end) return "not_started";
  return "did_not_depart";
}
export const ACTIVE_LIFECYCLES = new Set(["not_started", "running", "delayed"]);
// "In progress": due or under way right now (never a missed, finished or future trip).
export const isInProgress = (row, now = new Date(), hasPosition = false) => ACTIVE_LIFECYCLES.has(lifecycleOf(row, now, hasPosition));

// The position of a bus counts for a trip only if that trip produced it (schedule_id on every
// location payload). A bus keeps its last position after a trip; without this check the next
// trip, not yet started, showed the bus at the previous trip's destination.
export const tripLocation = (locations, row) => {
  const loc = row ? locations?.[row.bus_id] : null;
  return loc && loc.schedule_id === row.schedule_id ? loc : null;
};

// location: { timestamp } from GET /view/get_location or a "bus:location" event (or null).
export const locationAgeSeconds = (location, now = new Date()) =>
  location?.timestamp ? Math.max(0, Math.round((now - new Date(location.timestamp)) / 1000)) : null;

// The label a screen shows: the lifecycle, refined by this trip's position for active trips.
//   active + no position -> awaiting ("Awaiting first location"); old position -> stale;
//   fresh position -> live (or delayed). Never stale for a trip that hasn't departed.
const LIFECYCLE_STATUS = { upcoming: "upcoming", did_not_depart: "missed", completed: "completed", delayed_completed: "delayed_completed", cancelled: "cancelled", invalid: "invalid" };
export function tripStatus(row, location, now = new Date()) {
  const lc = lifecycleOf(row, now, Boolean(location));
  if (LIFECYCLE_STATUS[lc]) return LIFECYCLE_STATUS[lc];
  const age = locationAgeSeconds(location, now);
  if (age === null) return isDelayed(row) ? "delayed" : "awaiting";
  if (age > STALE_AFTER_SECONDS) return "stale";
  return lc === "delayed" ? "delayed" : "live";
}

export function summarizeTrips(rows, now = new Date()) {
  const s = { total: rows.length, running: 0, completed: 0, delayed: 0, upcoming: 0, cancelled: 0, missed: 0 };
  for (const r of rows) {
    const lc = lifecycleOf(r, now);
    if (lc === "completed" || lc === "delayed_completed") s.completed += 1;
    else if (lc === "cancelled" || lc === "invalid") s.cancelled += 1;
    else if (lc === "did_not_depart") s.missed += 1;
    else if (lc === "upcoming") s.upcoming += 1;
    else s.running += 1; // not_started, running, delayed: active now
    if (lc === "delayed" || (ACTIVE_LIFECYCLES.has(lc) && isDelayed(r))) s.delayed += 1;
  }
  return s;
}

export const byStart = (a, b) => (tripStart(a)?.getTime() ?? 0) - (tripStart(b)?.getTime() ?? 0);

export const formatClock = (hhmm) => {
  if (!hhmm) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const formatAge = (seconds) => {
  if (seconds === null || seconds === undefined) return "No updates yet";
  if (seconds < 60) return `${seconds}s ago`;
  // Floor, not round: 98 s must read "1 min ago", not "2 min ago".
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  return `${Math.floor(seconds / 3600)} h ago`;
};

// Navigation state expected by the existing Bus Tracking page (route + schedule objects).
// Schedule rows carry both the route fields and the trip fields.
export const trackingState = (row) => ({ route: row, schedule: row });
