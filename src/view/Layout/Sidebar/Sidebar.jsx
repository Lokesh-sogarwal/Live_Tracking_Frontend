import React from "react";
import { Items } from "../../../Components/Static/SideItems";
import Sidebar_header from "./Header/Sidebar_header";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "./sidebar.css";

const Sidebar = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // ✅ Decode token to get user role
  let role = "";
  if (token) {
    try {
      const decoded = jwtDecode(token);
      role = decoded.role || ""; // ensure safety
    } catch (err) {
      console.error("Invalid token:", err);
    }
  }

  const handleClick = (item) => {
    navigate(item.link);
  };

  // ✅ Filter items based on role
  const filterItemsByRole = (items, role) => {
  if (role === "Superadmin" || role === "Admin") {
    // Exclude "Upload Documents" only
    return items.filter(item => item.title !== "Upload Document"
      && item.title !== "Feedback"
    );
  }

  if (role === "operator") {
    return items.filter(
      item =>
        item.title !== "Active Users" &&
        item.title !== "Users"&&
        item.tittle !== "Feedback & Complaints"
    );
  }

  if (role === "driver") {
    return items.filter(
      item =>
        item.title !== "Active Users" &&
        item.title !== "Users" &&
        item.title !== "Create Route" &&
        item.title !== "Buses" &&
        item.title !== "Driver" &&
        item.title !== "Live Tracking"&&
        item.title !== "Uploaded Documents"&&
        item.tittle !== "Feedbacks & Complaints"
    );
  }

  if (role === "passenger") {
    return items.filter(
      item =>
        item.title !== "Active Users" &&
        item.title !== "Users" &&
        item.title !== "Create Route" &&
        item.title !== "Buses" &&
        item.title !== "Schedule" &&
        item.title !== "Driver"&&
        item.title !== "Uploaded Documents"&&
        item.tittle !== "Feedbacks & Complaints"
    );
  }

  // Default: show only login/signup if no role matched
  return items.filter(
    item => item.title === "Login" || item.title === "Signup"
  );
};


  // ✅ Apply role-based filtering
  const filteredItems = token ? filterItemsByRole(Items, role) : Items.filter(
    (item) => item.title === "Login" || item.title === "Signup"
  );

  return (
    <div className="sidebar">
      <div className="header border-bottom p-3">
        <Sidebar_header />
      </div>

      <ul className="mt-4 space-y-2 ps-0">
        {filteredItems.map((item) => (
          <li
            key={item.id}
            onClick={() => handleClick(item)}
            className={`sidebar-item ${item.id === 4 ? "text-danger" : "text-dark"}`}
            style={{ cursor: "pointer" }}
          >
            <div className="cont" style={{ color: "black" }}>
              <span className="text-dark p-2" style={{ fontSize: "1.3rem" }}>
                {item.icon}
              </span>
              <span className="fw-medium text-dark p-2" style={{ fontSize: "1.1rem" }}>
                {item.title}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
