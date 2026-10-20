import React from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight, FiBell, FiCalendar, FiCheck, FiClock, FiFileText, FiMap, FiMapPin, FiShield,
} from "react-icons/fi";
import { MdDirectionsBus } from "react-icons/md";
import RouteIllustration from "../RouteIllustration";
import PublicHeader from "./PublicHeader";
import "./Landing.css";

// Public landing page (route "/", logged-out visitors only — see PublicRoute in App.js).
// Every claim below maps to a feature in this codebase; nothing here calls the API.
const NAV = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#roles", label: "Who it's for" },
  { to: "/explore", label: "Routes & times" },
];

const FEATURES = [
  { icon: FiMapPin, title: "Live fleet tracking", text: "Buses report their position and the map shows where each one was last seen, flagging updates that have gone stale." },
  { icon: FiCalendar, title: "Trips & schedules", text: "Plan schedules that pair a bus, a driver and a route, then follow each trip from not started to completed." },
  { icon: FiMap, title: "Routes & stops", text: "Define routes with an origin, a destination and the stops in between. Passengers can search the routes available to them." },
  { icon: MdDirectionsBus, title: "Buses & drivers", text: "Register the buses in your fleet and keep a directory of drivers alongside the trips they run." },
  { icon: FiClock, title: "Delay & status monitoring", text: "Each trip carries a clear status — live, delayed, stale, not started or completed — so problems stand out." },
  { icon: FiFileText, title: "Driver documents", text: "Drivers upload licence and ID documents; operators review them and mark each one verified or rejected." },
  { icon: FiBell, title: "Notifications, chat & feedback", text: "In-app notifications, one-to-one messaging between users, and a feedback form that reaches the operations team." },
  { icon: FiShield, title: "Role-based access", text: "Five roles see only the tools they need, and a superadmin controls which features each role can use." },
];

const STEPS = [
  { title: "Sign in to your account", text: "Use the account your organisation gave you, or create a passenger account." },
  { title: "Manage or explore trips", text: "Plan schedules and routes, or look up the buses and routes that matter to you — depending on your role." },
  { title: "Stay informed", text: "Follow trip status on the live map and get notified about updates and messages." },
];

const ROLES = [
  { name: "Superadmin", text: "Everything an admin can do, plus the permission matrix that decides which features each role can use." },
  { name: "Admin", text: "Runs day-to-day operations: users, drivers, buses, routes, schedules, documents and feedback." },
  { name: "Operator", text: "Coordinates trips — creates routes and schedules, registers buses and reviews driver documents." },
  { name: "Driver", text: "Sees bus schedules and trips, uploads licence and ID documents, and messages the team." },
  { name: "Passenger", text: "Finds available routes, follows buses on the live map, receives notifications and sends feedback." },
];

const Landing = () => {
  return (
    <div className="lp">
      <a className="lp-skip" href="#main">Skip to content</a>

      <PublicHeader links={NAV} />

      <main id="main">
        <section id="top" className="lp-hero">
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <p className="lp-eyebrow">Live Tracking &amp; Transport Management System</p>
              <h1>Know where every journey stands.</h1>
              <p className="lp-lead">
                Track your fleet, manage trips, monitor delays and coordinate transport operations through one
                connected platform.
              </p>
              <div className="lp-cta-row">
                <Link to="/login" className="lp-btn lp-btn-primary lp-btn-lg">
                  Get started — sign in <FiArrowRight aria-hidden="true" />
                </Link>
                <Link to="/explore" className="lp-btn lp-btn-secondary lp-btn-lg">See routes &amp; times</Link>
              </div>
              <ul className="lp-points">
                <li><FiCheck aria-hidden="true" /> Bus positions on a shared live map</li>
                <li><FiCheck aria-hidden="true" /> Trips marked live, delayed or completed</li>
                <li><FiCheck aria-hidden="true" /> Tools tailored to each role</li>
              </ul>
            </div>
            <div className="lp-hero-visual">
              <RouteIllustration />
            </div>
          </div>
        </section>

        <section id="features" className="lp-section" aria-labelledby="features-title">
          <div className="lp-container">
            <div className="lp-section-head">
              <p className="lp-eyebrow">Features</p>
              <h2 id="features-title">Everything your transport team works with, in one place</h2>
              <p>From the live map to driver paperwork, each part of the operation has a home.</p>
            </div>
            <ul className="lp-features">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="lp-feature">
                  <span className="lp-feature-icon" aria-hidden="true"><Icon /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how-it-works" className="lp-section lp-section-alt" aria-labelledby="how-title">
          <div className="lp-container">
            <div className="lp-section-head">
              <p className="lp-eyebrow">How it works</p>
              <h2 id="how-title">Three steps from sign-in to a clear picture</h2>
            </div>
            <ol className="lp-steps">
              {STEPS.map((s, i) => (
                <li key={s.title} className="lp-step">
                  <span className="lp-step-num" aria-hidden="true">{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="roles" className="lp-section" aria-labelledby="roles-title">
          <div className="lp-container">
            <div className="lp-section-head">
              <p className="lp-eyebrow">Who it's for</p>
              <h2 id="roles-title">Built around the people who keep transport moving</h2>
              <p>Five roles, each with its own view. These are the defaults — a superadmin can adjust them.</p>
            </div>
            <ul className="lp-roles">
              {ROLES.map((r) => (
                <li key={r.name} className="lp-role">
                  <h3>{r.name}</h3>
                  <p>{r.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lp-cta" aria-labelledby="cta-title">
          <div className="lp-container lp-cta-inner">
            <h2 id="cta-title">A clearer view of every journey starts here.</h2>
            <p>Sign in to see the trips, buses and updates that matter to you.</p>
            <div className="lp-cta-row">
              <Link to="/login" className="lp-btn lp-btn-light lp-btn-lg">Sign in to your account</Link>
              <Link to="/signup" className="lp-btn lp-btn-outline-light lp-btn-lg">Create a passenger account</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <span className="lp-brand-mark" aria-hidden="true"><MdDirectionsBus /></span>
            <span>Live Tracking &amp; Transport Management System</span>
          </div>
          <nav aria-label="Footer">
            <ul>
              {NAV.map((n) => (
                <li key={n.label}>{n.to ? <Link to={n.to}>{n.label}</Link> : <a href={n.href}>{n.label}</a>}</li>
              ))}
              <li><Link to="/login">Sign in</Link></li>
              <li><Link to="/signup">Create account</Link></li>
            </ul>
          </nav>
          <p className="lp-copy">&copy; {new Date().getFullYear()} Live Tracking &amp; Transport Management System</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
