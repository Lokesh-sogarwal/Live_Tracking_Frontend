import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiArrowRight, FiMessageSquare, FiSearch } from "react-icons/fi";
import API_BASE_URL from "../../../utils/config";
import PublicHeader from "./PublicHeader";
import "./Landing.css";
import "./Explore.css";

// Public timetable and route list from /public/* — no account needed. Actions that need an
// account (feedback, notifications) link into the app, which asks to sign in only then.
const NAV = [
  { to: "/", label: "Home" },
  { to: "/explore", label: "Routes & times", current: true },
];
const STATUS = { scheduled: "Scheduled", running: "On the way", delayed: "Delayed", completed: "Completed", completed_late: "Arrived late", missed: "Did not depart", cancelled: "Cancelled" };

const todayIso = () => new Date().toLocaleDateString("en-CA");
const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
};
const dayLabel = (iso, today) =>
  iso === today ? "Today" : iso === addDays(today, 1) ? "Tomorrow" : new Date(`${iso}T12:00:00`).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });

function useJson(url) {
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, status: "loading" }));
    fetch(url)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "Could not load");
        if (alive) setState({ status: "ok", data, error: "" });
      })
      .catch((e) => alive && setState({ status: "error", data: null, error: e.message }));
    return () => {
      alive = false;
    };
  }, [url]);
  return state;
}

const Explore = () => {
  const [day, setDay] = useState(todayIso());
  const [query, setQuery] = useState("");
  const deps = useJson(`${API_BASE_URL}/public/departures?date=${day}`);
  const routes = useJson(`${API_BASE_URL}/public/routes`);
  const serverToday = deps.data?.today || todayIso();
  const days = useMemo(() => Array.from({ length: 8 }, (_, i) => addDays(serverToday, i)), [serverToday]);

  const q = query.trim().toLowerCase();
  const match = (...vals) => !q || vals.some((v) => (v || "").toLowerCase().includes(q));
  const departures = (deps.data?.departures || []).filter((d) => match(d.route_name, d.start_point, d.end_point, d.bus_number));
  const routeList = (routes.data || []).filter((r) => match(r.route_name, r.start_point, r.end_point, ...(r.stops || [])));

  return (
    <div className="lp">
      <PublicHeader links={NAV} />
      <main className="ex" id="main">
        <div className="lp-container">
          <div className="ex-head">
            <p className="lp-eyebrow">Routes &amp; times</p>
            <h1>Find your bus</h1>
            <p>Search routes and today's timetable. No account needed.</p>
            <label className="ex-search">
              <FiSearch aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a place, route or bus number" aria-label="Search routes and departures" />
            </label>
          </div>

          <section className="ex-card" aria-labelledby="ex-deps">
            <div className="ex-card-head">
              <h2 id="ex-deps">Departures</h2>
              <div className="ex-days" role="tablist" aria-label="Day">
                {days.map((d) => (
                  <button key={d} type="button" role="tab" aria-selected={d === day} className="ex-day" onClick={() => setDay(d)}>
                    {dayLabel(d, serverToday)}
                  </button>
                ))}
              </div>
            </div>
            {deps.status === "loading" && <p className="ex-muted" role="status">Loading departures…</p>}
            {deps.status === "error" && (
              <p className="ex-error" role="alert"><FiAlertCircle aria-hidden="true" /> {deps.error}</p>
            )}
            {deps.status === "ok" && departures.length === 0 && (
              <p className="ex-muted">{q ? "No departures match your search." : "No departures are scheduled for this day."}</p>
            )}
            {departures.length > 0 && (
              <ul className="ex-deps">
                {departures.map((d) => (
                  <li key={d.schedule_id}>
                    <span className="ex-time">
                      {d.start_time}
                      <span>to {d.end_time}</span>
                    </span>
                    <span className="ex-dep-main">
                      <strong>{d.route_name}</strong>
                      <span>{d.start_point} <FiArrowRight aria-label="to" /> {d.end_point}</span>
                    </span>
                    <span className="ex-bus">Bus {d.bus_number}</span>
                    <span className={`ex-chip ex-chip-${d.status}`}>{STATUS[d.status]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ex-card" aria-labelledby="ex-routes">
            <div className="ex-card-head">
              <h2 id="ex-routes">Routes</h2>
            </div>
            {routes.status === "loading" && <p className="ex-muted" role="status">Loading routes…</p>}
            {routes.status === "error" && <p className="ex-error" role="alert"><FiAlertCircle aria-hidden="true" /> {routes.error}</p>}
            {routes.status === "ok" && routeList.length === 0 && <p className="ex-muted">{q ? "No routes match your search." : "No routes have been published yet."}</p>}
            {routeList.length > 0 && (
              <ul className="ex-routes">
                {routeList.map((r) => (
                  <li key={r.route_id}>
                    <strong>{r.route_name}</strong>
                    <span>{r.start_point} <FiArrowRight aria-label="to" /> {r.end_point}</span>
                    {r.stops.length > 0 && <span className="ex-muted">Stops: {r.stops.join(" · ")}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ex-cta" aria-labelledby="ex-cta-title">
            <FiMessageSquare aria-hidden="true" />
            <div>
              <h2 id="ex-cta-title">Want live positions, alerts or to send feedback?</h2>
              <p>Those need a free passenger account. You'll be asked to sign in only when you use them.</p>
            </div>
            <div className="ex-cta-actions">
              <Link to="/live_tracking" className="lp-btn lp-btn-primary">Track a bus live</Link>
              <Link to="/Feedback" className="lp-btn lp-btn-secondary">Send feedback</Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Explore;
