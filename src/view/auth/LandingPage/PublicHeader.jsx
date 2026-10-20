import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiLogIn, FiMenu, FiX } from "react-icons/fi";
import { MdDirectionsBus } from "react-icons/md";

// Header for logged-out pages (Landing, Explore). links: [{ href } | { to }, label].
// A signed-in visitor sees "Open dashboard" instead of "Login".
const PublicHeader = ({ links }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const signedIn = Boolean(localStorage.getItem("token"));

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="lp-header">
      <div className="lp-container lp-header-inner">
        <Link to="/" className="lp-brand" onClick={closeMenu}>
          <span className="lp-brand-mark" aria-hidden="true"><MdDirectionsBus /></span>
          <span className="lp-brand-text">
            <strong>Live Tracking</strong>
            <span>Transport Management System</span>
          </span>
        </Link>

        <button
          type="button"
          className="lp-menu-btn"
          aria-expanded={menuOpen}
          aria-controls="lp-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
        </button>

        <nav id="lp-nav" className={`lp-nav${menuOpen ? " is-open" : ""}`} aria-label="Main">
          <ul>
            {links.map((n) => (
              <li key={n.label}>
                {n.to ? (
                  <Link to={n.to} onClick={closeMenu} aria-current={n.current ? "page" : undefined}>{n.label}</Link>
                ) : (
                  <a href={n.href} onClick={closeMenu}>{n.label}</a>
                )}
              </li>
            ))}
          </ul>
          {signedIn ? (
            <Link to="/dashboard" className="lp-btn lp-btn-primary lp-nav-login">Open dashboard</Link>
          ) : (
            <Link to="/login" className="lp-btn lp-btn-primary lp-nav-login">
              <FiLogIn aria-hidden="true" /> Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default PublicHeader;
