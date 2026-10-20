import React from "react";
import "./RouteIllustration.css";

// Static, clearly labelled illustration of the Live Fleet view for the public pages.
// It never calls the API: visitors are not signed in, and sample buses must not look live.
const TRIPS = [
  { route: "Route 12", path: "Central Depot → Campus Gate", status: "live", label: "Live" },
  { route: "Route 7", path: "Railway Station → Tech Park", status: "delayed", label: "Delayed" },
  { route: "Route 3", path: "Old Town → City Hospital", status: "notstarted", label: "Not started" },
];

const RouteIllustration = ({ compact = false }) => (
  <figure className={`ri${compact ? " ri-compact" : ""}`}>
    <div className="ri-card">
      <div className="ri-head">
        <span className="ri-title">Live fleet</span>
        <span className="ri-tag">Illustration</span>
      </div>
      <svg className="ri-map" viewBox="0 0 400 220" role="img" aria-label="Sample map with three buses on two routes">
        <rect width="400" height="220" rx="12" className="ri-ground" />
        <g className="ri-streets">
          <path d="M0 60H400M0 150H400M80 0V220M200 0V220M320 0V220" />
          <path d="M0 105H400M140 0V220M260 0V220" className="ri-streets-minor" />
        </g>
        <rect x="214" y="118" width="38" height="26" rx="5" className="ri-park" />
        <path className="ri-route-b" d="M20 190 C80 170 120 175 160 150 S240 120 260 90 S330 40 385 30" />
        <path className="ri-route-a" d="M15 40 C70 50 110 90 150 105 S230 125 290 160 S360 195 390 190" />
        {[[15, 40], [150, 105], [290, 160], [390, 190], [20, 190], [160, 150], [385, 30]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="5" className="ri-stop" />
        ))}
        {[
          { x: 92, y: 74, name: "Bus 12" },
          { x: 236, y: 132, name: "Bus 7", delayed: true },
          { x: 300, y: 64, name: "Bus 3", idle: true },
        ].map((b) => (
          <g key={b.name} transform={`translate(${b.x} ${b.y})`} className={`ri-bus${b.delayed ? " is-delayed" : ""}${b.idle ? " is-idle" : ""}`}>
            {!b.idle && <circle r="14" className="ri-bus-pulse" />}
            <circle r="9" className="ri-bus-dot" />
            <rect x="-4" y="-4" width="8" height="7" rx="1.5" fill="#fff" />
            <g transform="translate(14 -22)">
              <rect width="46" height="18" rx="9" className="ri-bus-label" />
              <text x="23" y="12.5" textAnchor="middle">{b.name}</text>
            </g>
          </g>
        ))}
      </svg>
      <ul className="ri-trips">
        {(compact ? TRIPS.slice(0, 2) : TRIPS).map((t) => (
          <li key={t.route}>
            <span className="ri-trip-text">
              <strong>{t.route}</strong>
              <span>{t.path}</span>
            </span>
            <span className={`ri-chip ri-chip-${t.status}`}>{t.label}</span>
          </li>
        ))}
      </ul>
    </div>
    <figcaption className="ri-caption">Illustrative example with sample routes, not live data.</figcaption>
  </figure>
);

export default RouteIllustration;
