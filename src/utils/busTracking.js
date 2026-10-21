// Helpers for the Bus Tracking page. Pure functions, unit-tested in busTracking.test.js.
import { STALE_AFTER_SECONDS } from "./trips";

const valid = (d) => d instanceof Date && !Number.isNaN(d.getTime());

// Schedule rows come in two shapes, both with the legacy start/end naming inverted:
//  - GET /bus/schedules rows: arrival_time = trip START ("HH:MM"), departure_time = END;
//  - GET /bus/get_routes schedules: end_time = START, start_time = END ("YYYY-MM-DD HH:MM:SS").
export function parseWhen(date, value) {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.replace(" ", "T"));
    return valid(d) ? d : null;
  }
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m && date) {
    const d = new Date(`${date}T${m[1].padStart(2, "0")}:${m[2]}:${m[3] || "00"}`);
    return valid(d) ? d : null;
  }
  return null;
}

const point = (name, lat, lng) => {
  const la = Number(lat);
  const ln = Number(lng);
  const ok = Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180 && !(la === 0 && ln === 0);
  return { name: name || "", lat: ok ? la : null, lng: ok ? ln : null, valid: ok };
};

// One normalised trip from the navigation state ({ route, schedule }). Reverse trips run the
// route backwards, so origin/destination swap.
export function normalizeTrip(route, schedule) {
  if (!route || !schedule) return null;
  const date = schedule.date || route.date || null;
  const a = point(route.start_point, route.start_lat, route.start_lng);
  const b = point(route.end_point, route.end_lat, route.end_lng);
  const reverse = (schedule.direction || route.direction) === "reverse";
  return {
    scheduleId: schedule.schedule_id ?? null,
    busId: schedule.bus_id ?? null,
    busNumber: schedule.bus_number || "",
    routeName: route.route_name || schedule.route_name || "",
    date,
    reverse,
    origin: reverse ? b : a,
    destination: reverse ? a : b,
    // Exact instants from the server when present (no browser-timezone guessing).
    startAt: (schedule.start_at && new Date(schedule.start_at)) || parseWhen(date, schedule.arrival_time) || parseWhen(date, schedule.end_time),
    endAt: (schedule.end_at && new Date(schedule.end_at)) || parseWhen(date, schedule.departure_time) || parseWhen(date, schedule.start_time),
    started: schedule.started === true,
    status: String(schedule.status || "").toLowerCase(),
    isReached: Boolean(schedule.is_reached),
  };
}

// The page's status for one trip. `location` is a position produced by THIS trip (or null);
// `server` is the trip's own state when it has no position yet ({ started, completed, status })
// or { notFound: true }.
//   not_found > cancelled > completed > not_started > missed (window passed, never departed) >
//   unavailable (started, no position yet) > delayed > stale > live
export function trackingStatus(trip, location, now = new Date(), server = null) {
  if (!trip) return "unavailable";
  if (server?.notFound) return "not_found";
  const status = String(server?.status || trip.status || "").toLowerCase();
  if (/cancel/.test(status)) return "cancelled";
  if (trip.isReached || location?.trip_completed || server?.completed) {
    return /delayed_completed/.test(location?.trip_status || status) ? "completed_late" : "completed";
  }
  const started = trip.startAt ? trip.startAt <= now : Boolean(location);
  if (!started && !location) return "not_started";
  // The simulation never starts a trip after its window; one that hasn't departed by then won't.
  if (!location && !server?.started && !trip.started && trip.endAt && trip.endAt <= now) return "missed";
  if (!location) return /delay/.test(status) ? "delayed_waiting" : "unavailable";
  if (/delay/.test(trip.status)) return "delayed";
  return isStale(location, now) ? "stale" : "live";
}

export const ageSeconds = (location, now = new Date()) =>
  location?.timestamp ? Math.max(0, Math.round((now - new Date(location.timestamp)) / 1000)) : null;
export const isStale = (location, now = new Date()) => {
  const age = ageSeconds(location, now);
  return age !== null && age > STALE_AFTER_SECONDS;
};

export const STATUS_TEXT = {
  live: "Live",
  delayed: "Delayed",
  delayed_waiting: "Delayed",
  stale: "Stale",
  not_started: "Upcoming",
  unavailable: "Awaiting first location",
  completed: "Completed",
  completed_late: "Completed late",
  cancelled: "Cancelled",
  missed: "Did not depart",
  not_found: "Trip not found",
};
export const STATUS_CHIP = {
  live: "live",
  delayed: "delayed",
  delayed_waiting: "delayed",
  stale: "stale",
  not_started: "not_started",
  unavailable: "stale",
  completed: "completed",
  completed_late: "delayed_completed",
  cancelled: "error",
  missed: "stale",
  not_found: "error",
};

// How long to wait before asking again. Fast only while moving; slower before departure or
// while waiting for a first position; never once the trip is over or unknown. Network/server
// failures back off exponentially (x2 each, max 60 s).
const POLL_BASE_MS = { live: 3000, delayed: 3000, stale: 3000, unavailable: 5000, delayed_waiting: 5000, not_started: 15000 };
export function nextPollDelay(status, failures = 0) {
  const base = POLL_BASE_MS[status];
  if (!base) return null;
  return failures > 0 ? Math.min(60_000, base * 2 ** failures) : base;
}

// Metres between [lat, lng] points.
export function distance([lat1, lng1], [lat2, lng2]) {
  const r = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

// Compass bearing (0 = north) from a to b, [lat, lng].
export function bearing([lat1, lng1], [lat2, lng2]) {
  const rad = Math.PI / 180;
  const y = Math.sin((lng2 - lng1) * rad) * Math.cos(lat2 * rad);
  const x = Math.cos(lat1 * rad) * Math.sin(lat2 * rad) - Math.sin(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lng2 - lng1) * rad);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Heading is shown only after a real movement (GPS jitter would spin the arrow).
export const MIN_HEADING_MOVE_M = 15;
export function headingBetween(prev, next) {
  if (!prev || !next) return null;
  return distance(prev, next) >= MIN_HEADING_MOVE_M ? bearing(prev, next) : null;
}

// Where a position sits on the route: the split point, distance covered and total, or null when
// the position is too far from the line to say (then no progress is shown rather than a guess).
export const MAX_OFF_ROUTE_M = 500;
export function progressAlong(coords, pos) {
  if (!Array.isArray(coords) || coords.length < 2 || !pos) return null;
  let total = 0;
  const cumulative = [0];
  for (let i = 1; i < coords.length; i++) {
    total += distance(coords[i - 1], coords[i]);
    cumulative.push(total);
  }
  if (total <= 0) return null;
  // Local planar projection is accurate enough at city scale.
  const k = Math.cos((pos[0] * Math.PI) / 180);
  let best = null;
  for (let i = 1; i < coords.length; i++) {
    const [ay, ax] = coords[i - 1];
    const [by, bx] = coords[i];
    const dx = (bx - ax) * k;
    const dy = by - ay;
    const px = (pos[1] - ax) * k;
    const py = pos[0] - ay;
    const len2 = dx * dx + dy * dy;
    const tt = len2 ? Math.max(0, Math.min(1, (px * dx + py * dy) / len2)) : 0;
    const proj = [ay + tt * (by - ay), ax + tt * (bx - ax)];
    const off = distance(pos, proj);
    if (!best || off < best.off) best = { off, index: i, proj, along: cumulative[i - 1] + distance(coords[i - 1], proj) };
  }
  if (best.off > MAX_OFF_ROUTE_M) return null;
  return {
    covered: best.along,
    total,
    fraction: Math.max(0, Math.min(1, best.along / total)),
    done: [...coords.slice(0, best.index), best.proj],
    remaining: [best.proj, ...coords.slice(best.index)],
  };
}

export const km = (m) => (m >= 10_000 ? `${Math.round(m / 1000)} km` : `${(m / 1000).toFixed(1)} km`);
export const clock = (d) => (d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");
