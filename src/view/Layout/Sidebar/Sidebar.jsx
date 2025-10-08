import React from "react";
import { Items } from "../../../Components/Static/SideItems";
import Sidebar_header from "./Header/Sidebar_header";
import { useNavigate } from "react-router-dom";
import { Logout } from "../../../utils/logout";
import { jwtDecode } from "jwt-decode";
import './sidebar.css';


const Sidebar = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // ✅ Decode the token to get the role
  let role = "";
  if (token) {
    try {
      const decoded = jwtDecode(token);
      role = decoded.role; // Make sure your JWT has 'role' field
    } catch (err) {
      console.error("Invalid token:", err);
      role = "";
    }
  }

  const handleClick = async (item) => {
      navigate(item.link);
  };

  // ✅ Filter menu items based on login & role
  const filteredItems = token
    ? Items.filter((item) => {
      // Show all items except login/signup
      if (item.title === "Login" || item.title === "Signup") return false;

      // Only superadmin sees Active Users and User Details
      if ((item.title === "Active Users" || item.title === "Users" || item.title === "Driver") && role !== "Superadmin" && role!=="Admin") {
        return false;
      }

      return true;
    })
    : Items.filter((item) => item.title === "Login" || item.title === "Signup");

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
            <div className=" cont" style={{color:"black"}}>
              <span className="text-dark p-2 " style={{ fontSize: "1.3rem" }}>{item.icon}</span>
              <span className="fw-medium text-dark p-2" style={{ fontSize: "1.1rem" }}>{item.title}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>

  );
};

export default Sidebar;
