import React, { useState } from "react";
import { toast } from "react-toastify";
import { FiPlus, FiTrash2, FiArrowUp, FiArrowDown } from "react-icons/fi";
import "./BusRoute.css";
import API_BASE_URL from "../../../utils/config";
import useResource from "../../../hooks/useResource";
import { usePermissions } from "../../../context/PermissionsContext";
import { PageHeader, Panel, Field, PlaceInput } from "../../../Components/ui";

// India-only check kept from the previous version (the UI only offers Indian places).
const isInIndia = async (place) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`);
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 && data[0].display_name.includes("India");
  } catch {
    return null; // geocoder unreachable: let the server decide
  }
};

const RouteCreation = () => {
  const { can } = usePermissions();
  const existing = useResource("/data/get_routes", can("dashboard"));
  const [routeName, setRouteName] = useState("");
  const [startPoint, setStartPoint] = useState("");
  const [endPoint, setEndPoint] = useState("");
  const [stops, setStops] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);

  const setStop = (i, v) => setStops((s) => s.map((x, j) => (j === i ? v : x)));
  const moveStop = (i, d) =>
    setStops((s) => {
      const next = [...s];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  const handleAddRoute = async (e) => {
    e.preventDefault();
    const next = {};
    if (!routeName.trim()) next.routeName = "Give the route a name";
    if (!startPoint.trim()) next.startPoint = "Choose where the route starts";
    if (!endPoint.trim()) next.endPoint = "Choose where the route ends";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const filledStops = stops.map((s) => s.trim()).filter(Boolean);
      const checks = await Promise.all([startPoint, endPoint, ...filledStops].map(isInIndia));
      const outside = {};
      if (checks[0] === false) outside.startPoint = "This place is outside India or could not be found";
      if (checks[1] === false) outside.endPoint = "This place is outside India or could not be found";
      checks.slice(2).forEach((ok, i) => {
        if (ok === false) outside[`stop${i}`] = "Outside India or not found";
      });
      if (Object.keys(outside).length) {
        setErrors(outside);
        toast.error("One or more places are outside India.");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/bus/bus_route`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ route_name: routeName.trim(), starting: startPoint.trim(), destination: endPoint.trim(), stops: filledStops }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result.error || "Could not create the route");
        return;
      }
      setLastCreated(result);
      setRouteName("");
      setStartPoint("");
      setEndPoint("");
      setStops([]);
      setErrors({});
      toast.success(`Route “${result.route?.route_name}” created`);
      existing.reload();
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const routes = Array.isArray(existing.data) ? existing.data : [];

  return (
    <div className="ui-page">
      <PageHeader title="Create route" description="Define a route from a start point to a destination, with optional stops in travel order." />

      <div className="route-layout">
        <section className="ui-card" aria-labelledby="new-route-title">
          <header className="ui-card-header">
            <h2 id="new-route-title" className="ui-card-title">New route</h2>
          </header>
          <form className="ui-card-body ui-form" onSubmit={handleAddRoute} noValidate>
            <Field label="Route name" error={errors.routeName}>
              <input className="ui-input" value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="e.g. City Center Express" maxLength={100} />
            </Field>
            <Field label="Starting point" error={errors.startPoint} hint="Type at least 3 letters to see suggestions">
              <PlaceInput value={startPoint} onChange={setStartPoint} placeholder="e.g. Main Bus Stand" />
            </Field>

            <fieldset className="route-stops">
              <legend className="ui-label">
                Stops <span className="ui-label-optional">(optional, in travel order)</span>
              </legend>
              {stops.length === 0 && <p className="ui-hint">No stops yet.</p>}
              <ol className="route-stop-list">
                {stops.map((stop, i) => (
                  <li key={i} className="route-stop">
                    <span className="route-stop-num" aria-hidden="true">{i + 1}</span>
                    <div className="route-stop-input">
                      <PlaceInput value={stop} onChange={(v) => setStop(i, v)} placeholder={`Stop ${i + 1}`} aria-label={`Stop ${i + 1}`} aria-invalid={errors[`stop${i}`] ? "true" : undefined} />
                      {errors[`stop${i}`] && <span className="ui-error-text">{errors[`stop${i}`]}</span>}
                    </div>
                    <div className="route-stop-actions">
                      <button type="button" className="ui-icon-btn" onClick={() => moveStop(i, -1)} disabled={i === 0} aria-label={`Move stop ${i + 1} up`}><FiArrowUp /></button>
                      <button type="button" className="ui-icon-btn" onClick={() => moveStop(i, 1)} disabled={i === stops.length - 1} aria-label={`Move stop ${i + 1} down`}><FiArrowDown /></button>
                      <button type="button" className="ui-icon-btn route-stop-remove" onClick={() => setStops((s) => s.filter((_, j) => j !== i))} aria-label={`Remove stop ${i + 1}`}><FiTrash2 /></button>
                    </div>
                  </li>
                ))}
              </ol>
              <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setStops((s) => [...s, ""])} disabled={stops.length >= 25}>
                <FiPlus aria-hidden="true" /> Add stop
              </button>
            </fieldset>

            <Field label="Destination" error={errors.endPoint}>
              <PlaceInput value={endPoint} onChange={setEndPoint} placeholder="e.g. Airport" />
            </Field>

            <div className="ui-form-actions">
              <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>
                {saving && <span className="ui-spinner" aria-hidden="true" />} {saving ? "Creating…" : "Create route"}
              </button>
            </div>
          </form>
        </section>

        <div className="route-side">
          {lastCreated?.route && (
            <div className="ui-banner ui-banner-success" role="status">
              <div>
                <strong>{lastCreated.route.route_name}</strong> was created: {lastCreated.route.start_point} →{" "}
                {(lastCreated.route.stops || []).map((s) => s.stop_name).concat(lastCreated.route.end_point).join(" → ")}
                {lastCreated.skipped_stops?.length > 0 && (
                  <p className="route-skipped">Could not locate and skipped: {lastCreated.skipped_stops.join(", ")}</p>
                )}
              </div>
            </div>
          )}
          {can("dashboard") && (
            <Panel
              title="Existing routes"
              subtitle={existing.status === "ok" ? `${routes.length} routes` : undefined}
              status={existing.status === "idle" ? "loading" : existing.status}
              onRetry={existing.reload}
              isEmpty={routes.length === 0}
              empty="No routes yet."
            >
              <ul className="route-list">
                {routes.map((r) => (
                  <li key={r.route_id}>
                    <span className="route-list-name">{r.route_name}</span>
                    <span className="route-list-path">{r.start_point} → {r.end_point}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteCreation;
