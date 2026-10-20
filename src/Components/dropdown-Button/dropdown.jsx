import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoIosLogOut } from "react-icons/io";
import navItems from "../Static/navItems";
import { Logout } from "../../utils/logout";
import { usePermissions } from "../../context/PermissionsContext";
import { allowed } from "../../utils/access";
import "./dropdown.css";

const initials = (name) =>
  (name || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

// Account menu: avatar button with Profile / Settings / Log out.
function DropButton({ userName = "User" }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { can, role } = usePermissions();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const items = navItems.filter((item) => allowed(item.rule, can, role));

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="account-avatar"
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Account menu"
      >
        {initials(userName)}
      </button>

      {isOpen && (
        <div className="account-dropdown" role="menu">
          <div className="account-dropdown-header">
            <span className="account-dropdown-name">{userName}</span>
            {role && <span className="account-dropdown-role">{role}</span>}
          </div>
          {items.map((item) => (
            <button
              type="button"
              role="menuitem"
              key={item.id}
              className="account-item"
              onClick={() => {
                setIsOpen(false);
                navigate(item.path);
              }}
            >
              {item.icon} {item.title}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            className="account-item account-item-danger"
            onClick={() => {
              setIsOpen(false);
              Logout(localStorage.getItem("token"));
            }}
          >
            <IoIosLogOut /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default DropButton;
