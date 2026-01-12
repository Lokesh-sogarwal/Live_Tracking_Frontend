import React, { useState, useRef, useEffect } from "react";
import { CiMenuBurger } from "react-icons/ci";
import navItems from "../Static/navItems";
import "./dropdown.css";
import { useNavigate } from "react-router-dom";
import { toast,ToastContainer } from "react-toastify";


function DropButton() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Close menu if clicked outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const token = localStorage.getItem("token");

  return (
    <div className="hamburger-menu" ref={menuRef}>
      {/* Always show burger icon */}
      <div className="custom-icon" onClick={() => setIsOpen(!isOpen)}>
        <CiMenuBurger size={24} />
      </div>

      {/* The dropdown menu */}
      {isOpen && (
        <div className="menu">
          {navItems.map((item) =>
            item.action ? (
              <div
                key={item.id}
                className="menu-item"
                onClick={() => {
                  item.action(token); // call logout or other custom action
                  setIsOpen(false);
                  toast.success("Logged out successfully");
                  setTimeout(() => {
                    navigate("/");
                  }, 1000);
                }}
              >
                {item.icon} {item.title}
              </div>
            ) : (
              <div
                key={item.id}
                className="menu-item"
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false);
                }}
              >
                {item.icon} {item.title}
              </div>
            )
          )}
        </div>
      )}
      <ToastContainer />
    </div>
  );
}

export default DropButton;
