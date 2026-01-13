import React, { useState, useEffect, useRef } from "react";
import { Items } from "../../../Components/Static/SideItems";
import Sidebar_header from "./Header/Sidebar_header";
import { useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import io from "socket.io-client";
import API_BASE_URL from "../../../utils/config";
import { fetchChatUsers } from "../../../Components/Static/Chatusers";
import "./sidebar.css";

const Sidebar = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [userId, setUserId] = useState(null);
  const socketRef = useRef(null);

  // Update ref for socket callback and reset on chat visit
  useEffect(() => {
    locationRef.current = location;
    if (location.pathname === '/chat') {
        setUnreadMessages(0);
    }
  }, [location]);

  // Decode and set user ID, load initial count
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.user_id);

        // Fetch initial unread count
        fetchChatUsers().then(users => {
             const totalUnread = users.reduce((acc, user) => acc + (user.unreadCount || 0), 0);
             if (location.pathname !== '/chat') {
                 setUnreadMessages(totalUnread);
             }
        });

      } catch (err) {
        console.error("Invalid token:", err);
      }
    }
  }, [token]);
  
  // Socket Listener
  useEffect(() => {
      if (!userId) return;

      socketRef.current = io(API_BASE_URL, {
        transports: ["websocket"],
        withCredentials: true,
        path: "/socket.io"
      });

      socketRef.current.on("message", (msg) => {
          if (msg.receiver_id === userId) {
               if (locationRef.current.pathname !== '/chat') {
                   setUnreadMessages(prev => prev + 1);
               }
          }
      });

      return () => {
          if (socketRef.current) socketRef.current.disconnect();
      };
  }, [userId]);

  // ✅ Decode token to get user role (Sync for render filter)
  let role = "";
  if (token) {
    try {
      const decoded = jwtDecode(token);
      role = decoded.role || "";
    } catch (err) {}
  }

  const handleClick = (item) => {
    navigate(item.link);
  };

  // ✅ Filter items based on role
  const filterItemsByRole = (items, role) => {
    if (role === "Superadmin" || role === "Admin") {
      return items.filter(
        (item) => item.title !== "Upload Document" && item.title !== "Feedback"
      );
    }

    if (role === "operator") {
      return items.filter(
        (item) =>
          item.title !== "Active Users" &&
          item.title !== "Users" &&
          item.tittle !== "Feedback & Complaints"
      );
    }

    if (role === "driver") {
      return items.filter(
        (item) =>
          item.title !== "Active Users" &&
          item.title !== "Users" &&
          item.title !== "Create Route" &&
          item.title !== "Buses" &&
          item.title !== "Live Tracking" &&
          item.title !== "Uploaded Documents" &&
          item.tittle !== "Feedbacks & Complaints"
      );
    }

    if (role === "passenger") {
      return items.filter(
        (item) =>
          item.title !== "Active Users" &&
          item.title !== "Users" &&
          item.title !== "Create Route" &&
          item.title !== "Buses" &&
          item.title !== "Schedule" &&
          item.title !== "Driver" &&
          item.title !== "Uploaded Documents" &&
          item.tittle !== "Feedbacks & Complaints"
      );
    }

    // Default: show only login/signup if no role matched
    return items.filter(
      (item) => item.title === "Login" || item.title === "Signup"
    );
  };

  // ✅ Apply role-based filtering
  const filteredItems = token
    ? filterItemsByRole(Items, role)
    : Items.filter((item) => item.title === "Login" || item.title === "Signup");

  return (
    <div className="sidebar">
      <div className="header">
        <Sidebar_header />
      </div>

      <ul className="sidebar-list">
        {filteredItems.map((item, index) => {
            // Check if active. Logic: exact match or partial match (for nested) if needed.
            // Using exact match or includes for dashboard sub-routes could be refined.
            const isActive = location.pathname === item.link; 
            
            return (
              <li
                key={item.id}
                onClick={() => handleClick(item)}
                className={`sidebar-item ${item.id === 4 ? "text-danger" : ""}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className={`cont ${isActive ? "active" : ""}`}>
                  <span>{item.icon}</span>
                  <span className="sidebar-title">{item.title}</span>
                  {item.title === "Chat" && unreadMessages > 0 && (
                      <span className="sidebar-badge">{unreadMessages}</span>
                  )}
                </div>
              </li>
            );
        })}
      </ul>
    </div>
  );
};

export default Sidebar;
