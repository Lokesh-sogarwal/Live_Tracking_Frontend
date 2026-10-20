import React from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiCheck } from "react-icons/fi";
import { MdDirectionsBus } from "react-icons/md";
import RouteIllustration from "./RouteIllustration";
import "./LoginSignup/Login.css";

// Two-column shell shared by sign-in and the password pages: brand panel on the left
// (hidden on small screens), the form card on the right.
const AuthLayout = ({ heading = "Welcome back.", intro, back = { to: "/", label: "Back to home" }, children }) => (
  <div className="si">
    <aside className="si-aside">
      <Link to="/" className="si-brand">
        <span className="si-brand-mark" aria-hidden="true"><MdDirectionsBus /></span>
        <span className="si-brand-text">
          <strong>Live Tracking</strong>
          <span>Transport Management System</span>
        </span>
      </Link>

      <div className="si-aside-copy">
        <h1>{heading}</h1>
        <p>{intro || "Sign in to follow your buses, trips and updates — with the tools your role gives you."}</p>
        <ul>
          <li><FiCheck aria-hidden="true" /> Bus positions and trip status on one map</li>
          <li><FiCheck aria-hidden="true" /> Schedules, routes and documents in one place</li>
        </ul>
      </div>

      <div className="si-aside-visual">
        <RouteIllustration compact />
      </div>
    </aside>

    <main className="si-main">
      <div className="si-main-top">
        {back && (
          <Link to={back.to} className="si-back">
            <FiArrowLeft aria-hidden="true" /> {back.label}
          </Link>
        )}
      </div>

      <div className="si-card">
        <Link to="/" className="si-brand si-brand-mobile" aria-hidden="true" tabIndex={-1}>
          <span className="si-brand-mark"><MdDirectionsBus /></span>
          <span className="si-brand-text"><strong>Live Tracking</strong></span>
        </Link>
        {children}
      </div>
    </main>
  </div>
);

export default AuthLayout;
