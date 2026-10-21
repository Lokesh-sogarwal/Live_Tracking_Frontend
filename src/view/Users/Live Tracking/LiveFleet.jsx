import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import { io } from "socket.io-client";
import { FiSearch, FiX, FiRefreshCw, FiMaximize, FiList, FiAlertCircle } from "react-icons/fi";
import "leaflet/dist/leaflet.css";
import "./LiveFleet.css";
import busImg from "../../../Assets/bus.png";
import API_BASE_URL from "../../../utils/config";
import { apiGet } from "../../../utils/api";
import { usePermissions } from "../../../context/PermissionsContext";
import { allowed, atLeast } from "../../../utils/access";
import { toLocalYYYYMMDD } from "../../../utils/dates";
import useResource from "../../../hooks/useResource";
import {
  STATUS_LABELS, byStart, formatAge, formatClock, isInProgress, lifecycleOf, locationAgeSeconds, trackingState, tripStatus,
} from "../../../utils/trips";

// "active" = trips due or under way now (awaiting first location, live, delayed, stale).
const FILTERS = ["active", "all", "live", "delayed", "stale", "awaiting", "upcoming", "missed", "completed", "delayed_completed"];
const ACTIVE_STATUSES = new Set(["awaiting", "live", "delayed", "stale"]);
const DEFAULT_CENTER = [28.6139, 77.209]; // only used before any position is known
const POLL_FALLBACK_MS = 15000;

// The trip that describes a bus right now (same lifecycle as the server): a trip producing
// positions > one that has departed > one that is due > the next upcoming > the latest trip.
// A missed (did-not-depart) or finished trip never hides a later trip of the same bus.
const currentTrip = (trips, now, pos) => {
  const withPos = (t) => Boolean(pos && pos.schedule_id === t.schedule_id);
  const active = trips.filter((t) => isInProgress(t, now, withPos(t)));
  return (
    active.find(withPos) ||
    active.find((t) => lifecycleOf(t, now) !== "not_started") ||
    active[0] ||
    trips.find((t) => lifecycleOf(t, now) === "upcoming") ||
    trips[trips.length - 1]
  );
};

const markerIcon = (status, selected) =>
  L.divIcon({
    className: "",
    html: `<span class="fleet-marker fleet-marker-${status}${selected ? " is-selected" : ""}"><img src="${busImg}" alt="" /></span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

function FitTo({ points, version }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    // Re-fit only when asked (first data, reset), not on every position update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, map]);
  return null;
}

// Leaflet measures its container once; re-measure when the layout changes it (list hidden,
// window or orientation change), otherwise parts of the map stay unpainted.
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

// Follows the selected bus: re-centres only when its coordinates change.
function FlyTo({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const zoom = Math.max(map.getZoom(), 14);
    let target = L.latLng(lat, lng);
    // On small screens the details sheet covers the lower ~60% of the map: centre the view
    // below the bus so the marker stays visible above the sheet.
    if (window.matchMedia("(max-width: 960px)").matches) {
      target = map.unproject(map.project(target, zoom).add([0, map.getSize().y * 0.3]), zoom);
    }
    map.flyTo(target, zoom, { duration: 0.6 });
  }, [lat, lng, map]);
  return null;
}

export default function LiveFleet() {
  const { can, role } = usePermissions();
  const canSchedules = allowed("readSchedules", can, role);
  const canPositions = allowed("busTracking", can, role);

  const today = toLocalYYYYMMDD();
  const schedules = useResource(`/bus/schedules?date=${today}`, canSchedules);
  const { reload: reloadSchedules } = schedules;
  const [now, setNow] = useState(() => new Date());
  const [positions, setPositions] = useState({}); // bus_id -> { latitude, longitude, timestamp, source }
  const [connection, setConnection] = useState(canPositions ? "connecting" : "off");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const [routeFilter, setRouteFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [fitVersion, setFitVersion] = useState(0);
  const [listOpen, setListOpen] = useState(true);
  const [geometry, setGeometry] = useState({}); // route_id -> [[lat, lng], ...]
  const socketRef = useRef(null);
  const subscribed = useRef(new Set());
  const busIdsRef = useRef([]);
  // Whether anything is producing positions (the worker), as opposed to the socket being up.
  const tracking = useResource("/view/tracking_status", canPositions);
  const { reload: reloadTracking } = tracking;
  // Read through a ref so the socket effect doesn't depend on (and re-create the socket for) it.
  const reloadTrackingRef = useRef(reloadTracking);
  reloadTrackingRef.current = reloadTracking;
  const hasFitted = useRef(false);
  const mapSectionRef = useRef(null);

  // Clock for age/stale computation; schedules refresh every minute.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!canSchedules) return undefined;
    const t = setInterval(reloadSchedules, 60000);
    return () => clearInterval(t);
  }, [canSchedules, reloadSchedules]);

  // One entry per bus that has a trip today.
  const vehicles = useMemo(() => {
    const rows = Array.isArray(schedules.data) ? [...schedules.data].sort(byStart) : [];
    const byBus = new Map();
    for (const r of rows) {
      if (!byBus.has(r.bus_id)) byBus.set(r.bus_id, []);
      byBus.get(r.bus_id).push(r);
    }
    return [...byBus.entries()].map(([busId, trips]) => {
      const raw = positions[busId] || null;
      const trip = currentTrip(trips, now, raw);
      // A bus keeps its last position after a trip ends. Only a position produced by the trip
      // shown here counts; otherwise a not-started trip appeared at the previous trip's end.
      const pos = raw && raw.schedule_id === trip.schedule_id ? raw : null;
      return { busId, busNumber: trip.bus_number, trip, trips, pos, status: tripStatus(trip, pos, now) };
    });
  }, [schedules.data, positions, now]);

  const busIdsKey = vehicles.map((v) => v.busId).join(",");

  useEffect(() => {
    if (!canPositions) return undefined;
    const t = setInterval(reloadTracking, 15000);
    return () => clearInterval(t);
  }, [canPositions, reloadTracking]);
  const service = tracking.status === "ok" ? tracking.data : null;
  const workerDown = Boolean(service && !service.worker.running);
  const simulationOff = Boolean(service && service.worker.running && service.simulation.enabled === false);

  // Live positions: Socket.IO "bus:subscribe" gives the current position, then "bus:location"
  // for every update (including simulated ones relayed by the API).
  useEffect(() => {
    if (!canPositions) return undefined;
    const socket = io(API_BASE_URL, { auth: { token: localStorage.getItem("token") }, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => {
      setConnection("live");
      reloadTrackingRef.current();
      // A recovered session keeps its rooms; otherwise subscribe again.
      if (!socket.recovered) subscribed.current = new Set();
      for (const id of busIdsRef.current) {
        if (!subscribed.current.has(id)) {
          socket.emit("bus:subscribe", { busId: id });
          subscribed.current.add(id);
        }
      }
    });
    socket.on("disconnect", () => setConnection("offline"));
    socket.on("connect_error", () => setConnection("offline"));
    socket.on("bus:location", (p) => {
      setPositions((prev) => ({ ...prev, [p.bus_id]: { latitude: p.latitude, longitude: p.longitude, timestamp: p.timestamp, source: p.source, schedule_id: p.schedule_id ?? null } }));
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
      subscribed.current = new Set();
    };
  }, [canPositions]);

  // Subscribe to buses as they appear in today's schedule.
  useEffect(() => {
    const ids = busIdsKey ? busIdsKey.split(",").map(Number) : [];
    busIdsRef.current = ids;
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    for (const id of ids) {
      if (!subscribed.current.has(id)) {
        socket.emit("bus:subscribe", { busId: id });
        subscribed.current.add(id);
      }
    }
  }, [busIdsKey]);

  // Fallback while the socket is down: poll the REST endpoint.
  useEffect(() => {
    if (!canPositions || connection === "live" || !busIdsKey) return undefined;
    const ids = busIdsKey.split(",").map(Number);
    let active = true;
    const load = async () => {
      const results = await Promise.all(ids.map((id) => apiGet(`/view/get_location/${id}`).then((r) => [id, r])));
      if (!active) return;
      setPositions((prev) => {
        const next = { ...prev };
        for (const [id, r] of results) if (r.ok) next[id] = { latitude: r.data.latitude, longitude: r.data.longitude, timestamp: r.data.timestamp, source: r.data.source, schedule_id: r.data.schedule_id ?? null };
        return next;
      });
    };
    load();
    const t = setInterval(load, POLL_FALLBACK_MS);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [canPositions, connection, busIdsKey]);

  const routes = useMemo(() => {
    const m = new Map();
    for (const v of vehicles) for (const t of v.trips) m.set(t.route_id, t.route_name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [vehicles]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(FILTERS.map((f) => [f, 0]));
    c.all = vehicles.length;
    for (const v of vehicles) {
      if (v.status in c) c[v.status] += 1;
      if (ACTIVE_STATUSES.has(v.status)) c.active += 1;
    }
    return c;
  }, [vehicles]);

  const q = query.trim().toLowerCase();
  const visible = vehicles.filter(
    (v) =>
      (filter === "all" || v.status === filter || (filter === "active" && ACTIVE_STATUSES.has(v.status))) &&
      (routeFilter === "all" || v.trips.some((t) => String(t.route_id) === routeFilter)) &&
      (!q || [v.busNumber, v.trip.driver_name, v.trip.route_name].some((s) => (s || "").toLowerCase().includes(q)))
  );
  const filtersActive = filter !== "all" || routeFilter !== "all" || q !== "";
  const selected = vehicles.find((v) => v.busId === selectedId) || null;

  const mapPoints = visible.filter((v) => v.pos).map((v) => [v.pos.latitude, v.pos.longitude]);
  // Fit the map once when the first positions arrive.
  useEffect(() => {
    if (!hasFitted.current && mapPoints.length) {
      hasFitted.current = true;
      setFitVersion((n) => n + 1);
    }
  }, [mapPoints.length]);

  // Road geometry for the selected trip (same endpoint the trip view uses).
  useEffect(() => {
    const t = selected?.trip;
    if (!t || geometry[t.route_id]) return;
    let active = true;
    apiGet(`/view/api/get_route/${t.start_lat}/${t.start_lng}/${t.end_lat}/${t.end_lng}`).then((r) => {
      const coords = r.ok ? r.data?.routes?.[0]?.geometry?.coordinates : null;
      if (active && Array.isArray(coords)) setGeometry((g) => ({ ...g, [t.route_id]: coords.map(([lng, lat]) => [lat, lng]) }));
    });
    return () => {
      active = false;
    };
  }, [selected, geometry]);

  const resetAll = useCallback(() => {
    setQuery("");
    setFilter("all");
    setRouteFilter("all");
    setSelectedId(null);
    setFitVersion((n) => n + 1);
  }, []);

  if (!canSchedules) {
    return (
      <div className="ui-card fleet-message">
        <FiAlertCircle aria-hidden="true" /> Your role does not have access to today's trips.
      </div>
    );
  }

  const selectedPos = selected?.pos ? [selected.pos.latitude, selected.pos.longitude] : null;
  const selectedRoute = selected ? geometry[selected.trip.route_id] : null;

  return (
    <div className={`fleet ${listOpen ? "" : "list-collapsed"}`}>
      {/* ---------- Vehicle list ---------- */}
      <section className="fleet-list ui-card" aria-label="Vehicles">
        <div className="fleet-list-head">
          <div className="fleet-search">
            <FiSearch aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bus, driver or route"
              aria-label="Search bus, driver or route"
            />
          </div>
          <div className="fleet-filters" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`fleet-filter ${filter === f ? "active" : ""}`}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : f === "active" ? "Active now" : STATUS_LABELS[f]} <span className="fleet-filter-count">{counts[f]}</span>
              </button>
            ))}
          </div>
          {routes.length > 1 && (
            <select className="fleet-route-select" value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)} aria-label="Filter by route">
              <option value="all">All routes</option>
              {routes.map(([id, name]) => (
                <option key={id} value={String(id)}>
                  {name}
                </option>
              ))}
            </select>
          )}
          <div className="fleet-list-meta">
            <span>
              {visible.length} of {vehicles.length} buses
            </span>
            <span className={`fleet-conn fleet-conn-${connection}`}>
              {connection === "live"
                ? workerDown
                  ? "Connected · no updates"
                  : "Live updates"
                : connection === "connecting"
                  ? "Connecting…"
                  : connection === "off"
                    ? "Positions unavailable"
                    : "Reconnecting · polling"}
            </span>
          </div>
          {workerDown && (
            <p className="fleet-service-note is-warning" role="status">
              Bus positions are not being updated: the tracking worker isn't running
              {service.worker.last_heartbeat_at ? ` (last seen ${formatAge(Math.round((now - new Date(service.worker.last_heartbeat_at)) / 1000))})` : ""}.
              {atLeast(role, "operator") && <> Start it with <code>npm run start:worker</code> in <code>backend-node</code>.</>}
            </p>
          )}
          {simulationOff && !vehicles.some((v) => v.status === "live") && (
            <p className="fleet-service-note" role="status">
              Simulation is off, so positions come only from drivers' devices.
              {atLeast(role, "operator") && <> Set <code>SIMULATION_ENABLED=true</code> and restart the worker to simulate buses.</>}
            </p>
          )}
          {service?.last_error && !workerDown && atLeast(role, "operator") && (
            <p className="fleet-service-note is-error" role="status">
              Last tracking error ({service.last_error.job}
              {service.last_error.bus_id ? `, bus ${service.last_error.bus_id}` : ""}
              {service.last_error.schedule_id ? `, trip #${service.last_error.schedule_id}` : ""}): {service.last_error.message}
            </p>
          )}
        </div>

        <div className="fleet-list-body">
          {schedules.status === "loading" && !schedules.data && (
            <div className="fleet-skeleton" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="ui-skeleton" />
              ))}
            </div>
          )}
          {schedules.status === "error" && (
            <div className="ui-state ui-state-error" role="alert">
              <FiAlertCircle aria-hidden="true" /> Could not load today's trips.
              <button type="button" className="ui-btn ui-btn-secondary" onClick={reloadSchedules}>
                <FiRefreshCw aria-hidden="true" /> Retry
              </button>
            </div>
          )}
          {schedules.status === "ok" && vehicles.length === 0 && <div className="ui-state">No buses have trips scheduled today.</div>}
          {vehicles.length > 0 && visible.length === 0 && (
            <div className="ui-state">
              No buses match these filters.
              <button type="button" className="ui-btn ui-btn-secondary" onClick={resetAll}>
                Clear filters
              </button>
            </div>
          )}
          <ul className="fleet-items">
            {visible.map((v) => (
              <li key={v.busId}>
                <button
                  type="button"
                  className={`fleet-item ${selectedId === v.busId ? "selected" : ""}`}
                  onClick={() => {
                    const next = v.busId === selectedId ? null : v.busId;
                    setSelectedId(next);
                    // On small screens the list sits below the map: bring the map and the
                    // details sheet into view.
                    if (next !== null && window.matchMedia("(max-width: 960px)").matches) {
                      mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  aria-pressed={selectedId === v.busId}
                >
                  <span className="fleet-item-top">
                    <span className="fleet-item-bus">{v.busNumber}</span>
                    <span className={`ui-chip ui-chip-${v.status}`}>{STATUS_LABELS[v.status]}</span>
                  </span>
                  <span className="fleet-item-route">{v.trip.route_name}</span>
                  <span className="fleet-item-meta">
                    {formatClock(v.trip.arrival_time)}–{formatClock(v.trip.departure_time)} · {v.trip.driver_name}
                  </span>
                  <span className="fleet-item-meta">
                    {v.pos ? `Updated ${formatAge(locationAgeSeconds(v.pos, now))}` : "No location reported yet"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Map ---------- */}
      <section className="fleet-map ui-card" aria-label="Map" ref={mapSectionRef}>
        <MapContainer center={DEFAULT_CENTER} zoom={11} className="fleet-map-canvas" scrollWheelZoom>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <InvalidateOnResize />
          <FitTo points={mapPoints} version={fitVersion} />
          {selectedPos && <FlyTo lat={selectedPos[0]} lng={selectedPos[1]} />}
          {selectedRoute && <Polyline positions={selectedRoute} pathOptions={{ color: "#612D53", weight: 5, opacity: 0.75 }} />}
          {selected && (
            <>
              <CircleMarker center={[selected.trip.start_lat, selected.trip.start_lng]} radius={7} pathOptions={{ color: "#1e7a46", fillColor: "#1e7a46", fillOpacity: 1 }}>
                <Tooltip>Start: {selected.trip.start_point}</Tooltip>
              </CircleMarker>
              <CircleMarker center={[selected.trip.end_lat, selected.trip.end_lng]} radius={7} pathOptions={{ color: "#853953", fillColor: "#853953", fillOpacity: 1 }}>
                <Tooltip>End: {selected.trip.end_point}</Tooltip>
              </CircleMarker>
            </>
          )}
          {visible
            .filter((v) => v.pos)
            .map((v) => (
              <Marker
                key={v.busId}
                position={[v.pos.latitude, v.pos.longitude]}
                icon={markerIcon(v.status, v.busId === selectedId)}
                eventHandlers={{ click: () => setSelectedId(v.busId) }}
                keyboard
                title={`${v.busNumber}: ${STATUS_LABELS[v.status]}`}
              >
                <Tooltip direction="top" offset={[0, -18]}>
                  {v.busNumber} · {STATUS_LABELS[v.status]}
                </Tooltip>
              </Marker>
            ))}
        </MapContainer>

        <div className="fleet-map-controls">
          <button type="button" className="ui-btn ui-btn-secondary fleet-toggle-list" onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen}>
            <FiList aria-hidden="true" /> {listOpen ? "Hide list" : "Show list"}
          </button>
          <button type="button" className="ui-btn ui-btn-secondary" onClick={resetAll} disabled={!filtersActive && !selectedId}>
            <FiMaximize aria-hidden="true" /> Reset view
          </button>
        </div>

        {canPositions && vehicles.length > 0 && mapPoints.length === 0 && schedules.status === "ok" && (
          <div className="fleet-map-empty">No bus has reported a position yet.</div>
        )}

        {/* ---------- Selected vehicle ---------- */}
        {selected && (
          <aside className="fleet-details" aria-label={`Bus ${selected.busNumber} details`}>
            <div className="fleet-details-head">
              <div>
                <h3>{selected.busNumber}</h3>
                <span className={`ui-chip ui-chip-${selected.status}`}>{STATUS_LABELS[selected.status]}</span>
              </div>
              <button type="button" className="ui-icon-btn" onClick={() => setSelectedId(null)} aria-label="Close details">
                <FiX />
              </button>
            </div>
            <dl className="fleet-details-facts">
              <div><dt>Route</dt><dd>{selected.trip.route_name}</dd></div>
              <div><dt>From → To</dt><dd>{selected.trip.start_point} → {selected.trip.end_point}</dd></div>
              <div><dt>Driver</dt><dd>{selected.trip.driver_name}</dd></div>
              <div><dt>Trip</dt><dd>{formatClock(selected.trip.arrival_time)} – {formatClock(selected.trip.departure_time)}</dd></div>
              <div>
                <dt>Last location update</dt>
                <dd>
                  {selected.pos ? formatAge(locationAgeSeconds(selected.pos, now)) : "No location reported yet"}
                  {selected.pos?.source === "simulation" && <span className="fleet-sim-tag">Simulated</span>}
                </dd>
              </div>
              {selected.pos && (
                <div><dt>Position</dt><dd>{selected.pos.latitude.toFixed(5)}, {selected.pos.longitude.toFixed(5)}</dd></div>
              )}
              <div><dt>Trips today</dt><dd>{selected.trips.length} ({selected.trips.filter((t) => t.is_reached).length} completed)</dd></div>
            </dl>
            {canPositions && !selected.trip.is_reached && (
              <Link to="/bus_tracking" state={trackingState(selected.trip)} className="ui-btn ui-btn-primary fleet-details-cta">
                Open trip view
              </Link>
            )}
          </aside>
        )}
      </section>
    </div>
  );
}
