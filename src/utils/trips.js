// Trip timing and status for rows from GET /bus/schedules.
//
// Legacy field naming (kept by the API): `arrival_time` is when the trip STARTS (shown as
// "Departure" on All Routes) and `departure_time` is when it ENDS. Times are "HH:MM" on the
// row's `date`, in the app timezone, which is assumed to be the browser's timezone (the
// tracking page makes the same assumption).

// Mirrors the server's LOCATION_STALE_SECONDS default.
export const STALE_AFTER_SECONDS = 120;

export const STATUS_LABELS = {
  live: "Live",
  delayed: "Delayed",
  stale: "Stale",
  not_started: "Not started",
  // Started by the timetable, but no position has been received for this trip.
  awaiting: "Awaiting location",
  // Its scheduled window passed and the bus never departed (the simulation won't start it late).
  missed: "Did not depart",
  completed: "Completed",
  // Reached the destination after its scheduled arrival (server status "delayed_completed").
  delayed_completed: "Completed late",
};

const toDate = (date, hhmm) => {
  if (!date || !hhmm) return null;
  const d = new Date(`${date}T${hhmm}`);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const tripStart = (row) => toDate(row.date, row.arrival_time);
export const tripEnd = (row) => toDate(row.date, row.departure_time);

export const isDelayed = (row) => /delay/i.test(row.status || "");
export const isCancelled = (row) => /cancel/i.test(row.status || "");
export const hasStarted = (row, now = new Date()) => {
  const start = tripStart(row);
  return Boolean(start && start <= now);
};
export const isInProgress = (row, now = new Date()) => !row.is_reached && hasStarted(row, now);

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

// One status per trip: completed > not started (future) > delayed > live / stale / awaiting.
// "awaiting" (started by the timetable, no position for this trip) is kept apart from
// "not started" (start time still ahead) and "stale" (positions arrived, then stopped).
export function tripStatus(row, location, now = new Date()) {
  if (row.is_reached) return /delayed_completed/i.test(row.status || "") ? "delayed_completed" : "completed";
  if (!hasStarted(row, now)) return "not_started";
  if (isDelayed(row)) return "delayed";
  const age = locationAgeSeconds(location, now);
  // `started` (from GET /bus/schedules) says whether the bus actually departed.
  if (age === null && row.started === false && tripEnd(row) && tripEnd(row) <= now) return "missed";
  if (age === null) return "awaiting";
  return age > STALE_AFTER_SECONDS ? "stale" : "live";
}

export function summarizeTrips(rows, now = new Date()) {
  const s = { total: rows.length, running: 0, completed: 0, delayed: 0, upcoming: 0, cancelled: 0 };
  for (const r of rows) {
    if (r.is_reached) s.completed += 1;
    else if (isCancelled(r)) s.cancelled += 1;
    else if (hasStarted(r, now)) s.running += 1;
    else s.upcoming += 1;
    if (!r.is_reached && isDelayed(r)) s.delayed += 1;
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
