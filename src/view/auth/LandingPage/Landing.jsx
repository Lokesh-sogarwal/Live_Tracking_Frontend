import React from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";

const Landing = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/signup");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleViewDemo = () => {
    const el = document.getElementById("landing-demo-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-nav">
        <div className="landing-logo">RouteMaster</div>
        <div className="landing-nav-actions">
          <button className="landing-btn ghost" onClick={handleLogin}>
            Login
          </button>
          <button className="landing-btn primary" onClick={handleGetStarted}>
            Get Started
          </button>
        </div>
      </div>

      <div className="landing-hero">
        <div className="landing-hero-left">
          <h1>
            Live Bus Tracking
            <span> for Smarter Commutes</span>
          </h1>
          <p className="landing-subtitle">
            Monitor buses in real time, manage routes and schedules, and keep
            every passenger informed — all from a single, intuitive dashboard.
          </p>
          <div className="landing-cta-row">
            <button
              className="landing-btn primary cta-main"
              onClick={handleGetStarted}
            >
              Get Started Free
            </button>
            <button
              className="landing-btn ghost cta-secondary"
              onClick={handleViewDemo}
            >
              View Live Demo
            </button>
          </div>

          <div className="landing-metrics">
            <div className="metric-card">
              <span className="metric-icon" aria-hidden="true">
                ⏱
              </span>
              <div className="metric-text">
                <span className="metric-value">24/7</span>
                <span className="metric-label">Live tracking visibility</span>
              </div>
            </div>
            <div className="metric-card">
              <span className="metric-icon" aria-hidden="true">
                ✅
              </span>
              <div className="metric-text">
                <span className="metric-value">99%</span>
                <span className="metric-label">On-time schedule accuracy</span>
              </div>
            </div>
            <div className="metric-card">
              <span className="metric-icon" aria-hidden="true">
                📊
              </span>
              <div className="metric-text">
                <span className="metric-value">360°</span>
                <span className="metric-label">Route & User Insights</span>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-hero-right">
          <div className="scene-3d">
            <div className="card-3d">
              <div className="card-layer layer-main">
                <h3>Live Tracking Map</h3>
                <p>See every bus move in real time.</p>
                <div className="card-pills">
                  <span>Active buses</span>
                  <span>Smart routes</span>
                  <span>ETA alerts</span>
                </div>

                <div className="mini-chart">
                  <div className="mini-chart-header">
                    <span>Today's load</span>
                    <span>Peak hours</span>
                  </div>
                  <div className="mini-chart-bars">
                    <div className="mini-bar" style={{ "--h": "55%" }} />
                    <div className="mini-bar" style={{ "--h": "80%" }} />
                    <div className="mini-bar" style={{ "--h": "65%" }} />
                    <div className="mini-bar" style={{ "--h": "90%" }} />
                  </div>
                </div>
              </div>

              <div className="card-layer layer-floating badge-top">
                <span className="badge-title">Schedules</span>
                <span className="badge-text">Instant timetable overview</span>
              </div>

              <div className="card-layer layer-floating badge-bottom">
                <span className="badge-title">Notifications</span>
                <span className="badge-text">Delay & arrival alerts</span>
              </div>

              <div className="orbit-dot orbit-dot-1" />
              <div className="orbit-dot orbit-dot-2" />
              <div className="orbit-dot orbit-dot-3" />
            </div>
          </div>

          <div className="widget-stack">
            <div className="widget-card primary-widget">
              <div className="widget-header">
                <span className="widget-title">Fleet overview</span>
                <span className="widget-pill">Live</span>
              </div>
              <div className="widget-stats-row">
                <div className="widget-stat">
                  <span className="widget-stat-label">Active buses</span>
                  <span className="widget-stat-value">42</span>
                </div>
                <div className="widget-stat">
                  <span className="widget-stat-label">Routes running</span>
                  <span className="widget-stat-value">18</span>
                </div>
                <div className="widget-stat">
                  <span className="widget-stat-label">On-time</span>
                  <span className="widget-stat-value">96%</span>
                </div>
              </div>
            </div>

            <div className="widget-card secondary-widget">
              <div className="widget-header">
                <span className="widget-title">Today at a glance</span>
              </div>
              <div className="widget-tags">
                <span>Campus shuttle</span>
                <span>Employee transit</span>
                <span>Student buses</span>
              </div>
              <p className="widget-description">
                A single control center for routes, buses, drivers, users,
                notifications and feedback — mirroring what you see inside the
                dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="landing-trust">
        <p className="trust-title">Trusted by campuses and transport teams</p>
        <div className="trust-logos" aria-label="Trusted by sample customers">
          <span className="trust-logo">CampusOne</span>
          <span className="trust-logo">MetroConnect</span>
          <span className="trust-logo">CityLine</span>
          <span className="trust-logo">TransitPlus</span>
        </div>
      </section>

      <section id="landing-demo-section" className="landing-section features">
        <h2>Why this platform?</h2>
        <p className="section-subtitle">
          Designed for transport admins, drivers, and passengers who need
          reliable, real-time information.
        </p>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Real-time Bus Locations</h3>
            <p>
              Track every bus with live GPS updates, so you always know where
              your fleet is and when it will arrive.
            </p>
          </div>
          <div className="feature-card">
            <h3>Smart Routes & Schedules</h3>
            <p>
              Create, edit, and monitor routes and schedules with an interface
              tailored for daily operations.
            </p>
          </div>
          <div className="feature-card">
            <h3>Passenger Experience</h3>
            <p>
              Share accurate ETAs, reduce wait times, and send instant
              notifications for delays or route changes.
            </p>
          </div>
          <div className="feature-card">
            <h3>Insights & Feedback</h3>
            <p>
              Analyse usage, collect feedback, and continuously improve
              reliability and safety for everyone on the road.
            </p>
          </div>
        </div>
      </section>

      <section id="about-section" className="landing-section info">
        <div className="info-grid">
          <div className="info-block">
            <h3>About the System</h3>
            <p>
              This platform centralises live tracking, routes, buses, drivers,
              users, notifications, and feedback into one modern web
              application. It is built to support campuses, institutions, and
              organisations that manage their own fleets.
            </p>
          </div>
          <div className="info-block">
            <h3>Who is it for?</h3>
            <p>
              Transport administrators, dispatch teams, and supervisors use the
              dashboard to manage operations, while passengers and drivers get
              clear, reliable updates on trips and schedules.
            </p>
          </div>
          <div className="info-block">
            <h3>Key Modules</h3>
            <ul>
              <li>Live bus tracking & route visualisation</li>
              <li>Route, bus, driver and user management</li>
              <li>Schedules, notifications and chat support</li>
              <li>Feedback and performance analytics</li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <span className="footer-copy">
          &copy; {new Date().getFullYear()} RouteMaster Live Tracking. All rights
          reserved.
        </span>
        <nav className="footer-nav" aria-label="Footer navigation">
          <a href="#about-section" className="footer-link">
            About
          </a>
          <a href="#contact" className="footer-link">
            Contact
          </a>
          <a href="#privacy" className="footer-link">
            Privacy Policy
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="footer-link"
          >
            GitHub
          </a>
        </nav>
      </footer>
    </div>
  );
};

export default Landing;
