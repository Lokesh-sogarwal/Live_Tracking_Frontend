import React from 'react'
import { FaRoute } from "react-icons/fa";
import './header.css';

const Sidebar_header = () => {
  return (
    <div className="header-logo">
      <div className="logo-icon">
        <FaRoute />
      </div>
      <div className="logo-text">
        <span>Route</span>
        <span className="highlight">Master</span>
      </div>
    </div>
  )
}

export default Sidebar_header;
