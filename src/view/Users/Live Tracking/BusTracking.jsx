import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Link, useLocation } from "react-router-dom";
import { FiAlertTriangle, FiArrowLeft, FiArrowRight, FiChevronDown, FiClock, FiMapPin, FiMaximize, FiRefreshCw } from "react-icons/fi";
import "leaflet/dist/leaflet.css";
import "./BusTracking.css";
import API_BASE_URL from "../../../utils/config";
import { StatusChip } from "../../../Components/ui";
import BusMarker from "./BusMarker";
import {
  STATUS_CHIP, STATUS_TEXT, ageSeconds, clock, headingBetween, km, normalizeTrip, progressAlong, trackingStatus,
} from "../../../utils/busTracking";
import { formatAge } from "../../../utils/trips";

// Tracks ONE trip. Positions are requested for this trip only (GET /view/get_location/:bus?
// schedule_id=…), so a bus parked at the end of its previous trip is never drawn on this one.
const POLL_MS = 3000;
const POLLING = new Set(["live", "delayed", "delayed_waiting", "stale", "unavailable", "not_started"]);

const pinIcon = (kind, label) =>
  L.divIcon({
    className: "bt-pin-icon",
    html: `<div class="bt-pin is-${kind}"><span>${label}</span></div>`,
    iconSize: [30, 40],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
  });
const ORIGIN_ICON = pinIcon("origin", "A");
const DEST_ICON = pinIcon("dest", "B");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Fit the route once per trip (not on every position update), and on demand.
function FitRoute({ bounds, fitKey, request }) {
  const map = useMap();
  const done = useRef(null);
  useEffect(() => {
    if (!bounds.length) return;
    if (done.current === fitKey && !request) return;
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    done.current = fitKey;
  }, [bounds, fitKey, request, map]);
  return null;
}

// Leaflet measures its container once; keep it in sync with layout changes.
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function WaitingCard({ trip, variant, onRetry, retrying }) {
  const text = {
    not_started: {
      title: "Bus hasn't started yet",
      body: "Your bus will appear on the route once its trip begins and a valid location is received.",
    },
    unavailable: {
      title: "Waiting for the bus's location",
      body: `This trip was scheduled to start at ${clock(trip.startAt)}, but no location has been received for it yet.`,
    },
    delayed_waiting: {
      title: "This trip is delayed",
      body: "The bus will appear on the route once a valid location is received for this trip.",
    },
    completed: { title: "Trip completed", body: "This trip has finished. No final position was recorded for it." },
    cancelled: { title: "Trip cancelled", body: "This trip will not run." },
  }[variant];
  const animated = variant === "not_started" || variant === "unavailable" || variant === "delayed_waiting";
  return (
    <div className="bt-waiting" role="status">
      {animated && (
        <div className="bt-waiting-art" aria-hidden="true">
          <span className="bt-waiting-end is-origin">A</span>
          <span className="bt-waiting-road" />
          <span className="bt-waiting-end is-dest">B</span>
          <span className="bt-waiting-bus">
            <svg viewBox="0 0 24 24">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z" />
            </svg>
          </span>
        </div>
      )}
      <div className="bt-waiting-text">
        <strong>{text.title}</strong>
        <p>{text.body}</p>
        {animated && (
          <p className="bt-waiting-meta">
            {trip.origin.name || "Origin"} <FiArrowRight aria-label="to" /> {trip.destination.name || "Destination"}
            {trip.startAt && <> · scheduled {clock(trip.startAt)}</>}
          </p>
        )}
        {onRetry && (
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={onRetry} disabled={retrying}>
            <FiRefreshCw aria-hidden="true" /> {retrying ? "Checking…" : "Check again"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function BusTracking() {
  const { state } = useLocation();
  const trip = useMemo(() => normalizeTrip(state?.route, state?.schedule), [state]);
  const token = localStorage.getItem("token");

  const [route, setRoute] = useState({ status: "loading", coords: [], provider: null });
  const [loc, setLoc] = useState(null); // position produced by this trip
  const [fetchState, setFetchState] = useState({ checked: false, error: "", busy: false });
  const [now, setNow] = useState(() => new Date());
  const [heading, setHeading] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [fitRequest, setFitRequest] = useState(0);
  const prevPos = useRef(null);

  // ---- route geometry (origin -> destination) ----
  useEffect(() => {
    if (!trip) return undefined;
    // The server orients geometry start_point -> end_point of the ROUTE; reverse trips flip it.
    const a = trip.reverse ? trip.destination : trip.origin;
    const b = trip.reverse ? trip.origin : trip.destination;
    if (!a.valid || !b.valid) {
      setRoute({ status: "error", coords: [], provider: null });
      return undefined;
    }
    let alive = true;
    fetch(`${API_BASE_URL}/view/api/get_route/${a.lat}/${a.lng}/${b.lat}/${b.lng}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        const raw = data.routes?.[0]?.geometry?.coordinates || [];
        const coords = raw.filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1])).map(([lng, lat]) => [lat, lng]);
        if (alive) setRoute({ status: coords.length > 1 ? "ok" : "error", coords: trip.reverse ? coords.reverse() : coords, provider: data.provider || null });
      })
      .catch(() => alive && setRoute({ status: "error", coords: [], provider: null }));
    return () => {
      alive = false;
    };
  }, [trip, token]);

  // ---- this trip's position ----
  const fetchLocation = useCallback(async () => {
    if (!trip?.busId || !trip.scheduleId) return;
    setFetchState((s) => ({ ...s, busy: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/view/get_location/${trip.busId}?schedule_id=${trip.scheduleId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) {
        setLoc(null); // nothing for THIS trip yet
        setFetchState({ checked: true, error: "", busy: false });
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const ok = data.schedule_id === trip.scheduleId && Number.isFinite(data.latitude) && Number.isFinite(data.longitude) && Math.abs(data.latitude) <= 90 && Math.abs(data.longitude) <= 180;
      if (ok) {
        // Never step backwards in time (out-of-order responses).
        setLoc((prev) => (prev && new Date(prev.timestamp) > new Date(data.timestamp) ? prev : data));
      }
      setFetchState({ checked: true, error: "", busy: false });
    } catch {
      setFetchState({ checked: true, error: "Couldn't reach the server. Retrying automatically.", busy: false });
    }
  }, [trip, token]);

  const status = trip ? trackingStatus(trip, loc, now) : "unavailable";

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);
  useEffect(() => {
    if (!POLLING.has(status)) return undefined;
    const t = setInterval(fetchLocation, POLL_MS);
    return () => clearInterval(t);
  }, [status, fetchLocation]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(t);
  }, []);

  const position = useMemo(() => (loc ? [loc.latitude, loc.longitude] : null), [loc]);
  useEffect(() => {
    if (!position) return;
    const h = headingBetween(prevPos.current, position);
    if (h !== null) setHeading(h);
    // Keep the last reliable heading when the bus barely moved; reset only for a new trip.
    if (!prevPos.current || h !== null) prevPos.current = position;
  }, [position]);

  const progress = useMemo(() => (position && route.coords.length > 1 ? progressAlong(route.coords, position) : null), [position, route.coords]);

  if (!trip) {
    return (
      <div className="ui-page">
        <div className="ui-card ui-card-body bt-empty">
          <FiMapPin aria-hidden="true" />
          <h2>Choose a trip to track</h2>
          <p>Open a trip from Live Tracking, Bus Schedule or the dashboard.</p>
          <Link to="/live_tracking" className="ui-btn ui-btn-primary">Go to Live Tracking</Link>
        </div>
      </div>
    );
  }

  const age = ageSeconds(loc, now);
  const showBus = Boolean(position) && ["live", "delayed", "stale", "completed"].includes(status);
  const waiting = ["not_started", "unavailable", "delayed_waiting", "cancelled"].includes(status) || (status === "completed" && !position);
  const bounds = route.coords.length > 1 ? route.coords : [trip.origin, trip.destination].filter((p) => p.valid).map((p) => [p.lat, p.lng]);
  const center = bounds[0] || [28.6, 77.2];
  const busLabel = trip.busNumber ? `Bus ${trip.busNumber}` : "Bus";
  const markerTitle = `${busLabel} · ${STATUS_TEXT[status]}${age !== null ? ` · updated ${formatAge(age)}` : ""}`;
  const popupHtml =
    `<div class="bt-popup"><strong>${esc(busLabel)}</strong><span>${esc(STATUS_TEXT[status])}</span>` +
    (loc ? `<span>Updated ${esc(clock(new Date(loc.timestamp)))}${age !== null ? ` (${esc(formatAge(age))})` : ""}</span>` : "") +
    (progress ? `<span>${esc(km(progress.covered))} of ${esc(km(progress.total))}</span>` : "") +
    `</div>`;
  const doneCoords = progress && status !== "completed" ? progress.done : status === "completed" && position ? route.coords : null;
  const remainingCoords = progress && status !== "completed" ? progress.remaining : null;

  const Details = (
    <dl className="bt-dl">
      <div><dt>Bus</dt><dd>{trip.busNumber || "—"}</dd></div>
      <div><dt>Route</dt><dd>{trip.routeName || "—"}{trip.reverse && " (return trip)"}</dd></div>
      <div><dt>Date</dt><dd>{trip.date ? new Date(`${trip.date}T12:00:00`).toLocaleDateString([], { dateStyle: "medium" }) : "—"}</dd></div>
      <div><dt>Scheduled</dt><dd>{clock(trip.startAt)} – {clock(trip.endAt)}</dd></div>
      <div><dt>Status</dt><dd>{STATUS_TEXT[status]}</dd></div>
      <div>
        <dt>Last location</dt>
        <dd>
          {loc ? `${clock(new Date(loc.timestamp))} · ${formatAge(age)}` : "None for this trip"}
          {loc?.source && <span className="bt-muted"> ({loc.source === "simulation" ? "simulated" : loc.source})</span>}
        </dd>
      </div>
      <div>
        <dt>Route line</dt>
        <dd>
          {route.status === "loading" ? "Loading…" : route.provider === "ors" ? "Road route" : route.provider === "fallback" ? "Approximate (straight line)" : "Unavailable"}
        </dd>
      </div>
    </dl>
  );

  return (
    <div className="ui-page bt">
      <div className="bt-head">
        <Link to="/live_tracking" className="ui-btn ui-btn-ghost ui-btn-sm bt-back">
          <FiArrowLeft aria-hidden="true" /> Live Tracking
        </Link>
        <div className="bt-title-row">
          <div className="bt-title">
            <h1>
              {trip.origin.name || "Origin"} <FiArrowRight aria-label="to" className="bt-arrow" /> {trip.destination.name || "Destination"}
            </h1>
            <p>
              {busLabel}
              {trip.routeName && ` · ${trip.routeName}`}
              {trip.reverse && " · return trip"}
            </p>
          </div>
          <div className="bt-actions">
            <StatusChip status={STATUS_CHIP[status]}>{STATUS_TEXT[status]}</StatusChip>
            <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={fetchLocation} disabled={fetchState.busy}>
              <FiRefreshCw aria-hidden="true" className={fetchState.busy ? "bt-spin" : undefined} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {fetchState.error && (
        <div className="ui-banner ui-banner-error" role="alert">
          <FiAlertTriangle aria-hidden="true" /> {fetchState.error}
        </div>
      )}
      {status === "stale" && (
        <div className="ui-banner ui-banner-warning" role="status">
          <FiClock aria-hidden="true" /> No new position since {clock(new Date(loc.timestamp))} ({formatAge(age)}). The bus is shown where it was last seen.
        </div>
      )}

      <ul className="bt-cards" aria-label="Trip overview">
        <li><span>From</span><strong>{trip.origin.name || "—"}</strong></li>
        <li><span>To</span><strong>{trip.destination.name || "—"}</strong></li>
        <li><span>Scheduled</span><strong>{clock(trip.startAt)} – {clock(trip.endAt)}</strong></li>
        <li><span>Status</span><strong>{STATUS_TEXT[status]}</strong></li>
        <li><span>Last update</span><strong>{loc ? formatAge(age) : "—"}</strong></li>
        <li>
          <span>Progress</span>
          <strong>{status === "completed" ? "Arrived" : progress ? `${Math.round(progress.fraction * 100)}% · ${km(progress.covered)} of ${km(progress.total)}` : "—"}</strong>
          {progress && status !== "completed" && (
            <span className="bt-progress" aria-hidden="true"><span style={{ width: `${progress.fraction * 100}%` }} /></span>
          )}
        </li>
      </ul>

      <div className="bt-main">
        <div className="bt-map-wrap">
          <MapContainer center={center} zoom={12} className="bt-map" scrollWheelZoom>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            <MapResizer />
            <FitRoute bounds={bounds} fitKey={trip.scheduleId} request={fitRequest} />
            {route.coords.length > 1 && !doneCoords && (
              <Polyline positions={route.coords} pathOptions={{ color: "#612D53", weight: 6, opacity: 0.8, dashArray: route.provider === "fallback" ? "2 10" : null }} />
            )}
            {doneCoords && <Polyline positions={doneCoords} pathOptions={{ color: "#612D53", weight: 6, opacity: 0.9 }} />}
            {remainingCoords && <Polyline positions={remainingCoords} pathOptions={{ color: "#853953", weight: 5, opacity: 0.45, dashArray: "8 10" }} />}
            {trip.origin.valid && (
              <Marker position={[trip.origin.lat, trip.origin.lng]} icon={ORIGIN_ICON} title={`Origin: ${trip.origin.name}`} alt={`Origin: ${trip.origin.name}`}>
                <Popup>Origin: {trip.origin.name}</Popup>
              </Marker>
            )}
            {trip.destination.valid && (
              <Marker position={[trip.destination.lat, trip.destination.lng]} icon={DEST_ICON} title={`Destination: ${trip.destination.name}`} alt={`Destination: ${trip.destination.name}`}>
                <Popup>Destination: {trip.destination.name}</Popup>
              </Marker>
            )}
            {showBus && (
              <BusMarker
                key={trip.scheduleId}
                position={position}
                status={status === "delayed" ? "delayed" : status}
                heading={status === "completed" ? null : heading}
                title={markerTitle}
                popupHtml={popupHtml}
                onSelect={() => setDetailsOpen(true)}
              />
            )}
          </MapContainer>

          <button type="button" className="bt-fit" onClick={() => setFitRequest((n) => n + 1)} aria-label="Show the whole route">
            <FiMaximize aria-hidden="true" />
          </button>
          {route.provider === "fallback" && <span className="bt-map-note">Approximate route (straight line) — road routing is not configured</span>}
          {route.status === "error" && <span className="bt-map-note">The route line could not be loaded.</span>}

          {fetchState.checked && waiting && (
            <WaitingCard
              trip={trip}
              variant={status === "completed" ? "completed" : status}
              onRetry={status === "unavailable" || status === "delayed_waiting" ? fetchLocation : null}
              retrying={fetchState.busy}
            />
          )}
        </div>

        <aside className={`bt-side${detailsOpen ? " is-open" : ""}`} aria-label="Trip details">
          <button type="button" className="bt-side-toggle" aria-expanded={detailsOpen} aria-controls="bt-details" onClick={() => setDetailsOpen((o) => !o)}>
            Trip details <FiChevronDown aria-hidden="true" />
          </button>
          <div id="bt-details" className="bt-side-body">
            <h2 className="bt-side-title">Trip details</h2>
            {Details}
          </div>
        </aside>
      </div>
    </div>
  );
}
