import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import io from "socket.io-client";
import { FiLogOut, FiChevronsLeft, FiChevronsRight } from "react-icons/fi";
import { NAV_SECTIONS } from "../../../Components/Static/SideItems";
import SidebarHeader from "./Header/Sidebar_header";
import API_BASE_URL from "../../../utils/config";
import { fetchChatUsers } from "../../../Components/Static/Chatusers";
import { usePermissions } from "../../../context/PermissionsContext";
import { allowed } from "../../../utils/access";
import { Logout } from "../../../utils/logout";
import "./sidebar.css";

const Sidebar = ({ collapsed = false, onToggleCollapsed }) => {
  const token = localStorage.getItem("token");
  const location = useLocation();
  const locationRef = useRef(location);
  const { can, role, ready } = usePermissions();

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [userId, setUserId] = useState(null);
  const socketRef = useRef(null);

  // Update ref for socket callback and reset on chat visit
  useEffect(() => {
    locationRef.current = location;
    if (location.pathname === "/chat") {
      setUnreadMessages(0);
    }
  }, [location]);

  // Decode user id and load the initial unread count
  useEffect(() => {
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      setUserId(decoded.user_id);
      fetchChatUsers().then((users) => {
        const totalUnread = users.reduce((acc, user) => acc + (user.unreadCount || 0), 0);
        if (locationRef.current.pathname !== "/chat") setUnreadMessages(totalUnread);
      });
    } catch (err) {
      console.error("Invalid token:", err);
    }
  }, [token]);

  // Live unread badge: the server also delivers chat messages to the receiver's personal room.
  useEffect(() => {
    if (!userId) return undefined;
    socketRef.current = io(API_BASE_URL, {
      transports: ["websocket"],
      withCredentials: true,
      path: "/socket.io",
      auth: { token: localStorage.getItem("token") },
    });
    socketRef.current.on("message", (msg) => {
      if (msg.receiver_id === userId && locationRef.current.pathname !== "/chat") {
        setUnreadMessages((prev) => prev + 1);
      }
    });
    return () => socketRef.current?.disconnect();
  }, [userId]);

  // Until permissions are known, render no gated items (avoids showing then hiding them).
  const sections = ready
    ? NAV_SECTIONS.map((s) => ({ ...s, items: s.items.filter((item) => allowed(item.rule, can, role)) })).filter(
        (s) => s.items.length > 0
      )
    : [];

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top">
        <SidebarHeader collapsed={collapsed} />
        {onToggleCollapsed && (
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {!ready && (
          <div className="sidebar-skeleton" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="sidebar-skeleton-row" />
            ))}
          </div>
        )}
        {sections.map((section) => (
          <div className="sidebar-section" key={section.title}>
            <p className="sidebar-section-title">{section.title}</p>
            <ul className="sidebar-list">
              {section.items.map((item) => {
                const badge = item.badge === "chat" && unreadMessages > 0 ? unreadMessages : 0;
                return (
                  <li key={item.id}>
                    <NavLink
                      to={item.link}
                      className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                      title={collapsed ? item.title : undefined}
                      aria-label={collapsed ? item.title : undefined}
                    >
                      <span className="sidebar-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="sidebar-title">{item.title}</span>
                      {badge > 0 && (
                        <span className="sidebar-badge" aria-label={`${badge} unread messages`}>
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-link sidebar-logout"
          onClick={() => Logout(token)}
          title={collapsed ? "Log out" : undefined}
          aria-label="Log out"
        >
          <span className="sidebar-icon" aria-hidden="true">
            <FiLogOut />
          </span>
          <span className="sidebar-title">Log out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
