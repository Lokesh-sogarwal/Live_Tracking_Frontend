import React from 'react'
import { Link } from 'react-router-dom'
import { MdDirectionsBus } from "react-icons/md";
import './header.css';

const Sidebar_header = ({ collapsed = false }) => {
  return (
    <Link to="/dashboard" className="header-logo" aria-label="Live Tracking home">
      <span className="logo-icon" aria-hidden="true">
        <MdDirectionsBus />
      </span>
      {!collapsed && (
        <span className="logo-text">
          Live <span className="highlight">Tracking</span>
        </span>
      )}
    </Link>
  )
}

export default Sidebar_header;
