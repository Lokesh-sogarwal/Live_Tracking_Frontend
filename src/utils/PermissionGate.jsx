import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { usePermissions } from "../context/PermissionsContext";
import { normalizeRole } from "./legacyAccess";
import { allowed } from "./access";

const PermissionGate = ({ permissionKey, rule, requireSuperadmin = false, children }) => {
  const token = localStorage.getItem("token");
  const { isLoading, ready, can, role: serverRole } = usePermissions();
  const location = useLocation();

  let role = "";
  try {
    role = token ? jwtDecode(token).role : "";
  } catch (e) {
    role = "";
  }

  const normalizedRole = normalizeRole(role);

  if (requireSuperadmin) {
    if (!normalizedRole || normalizedRole !== "superadmin") {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Until permissions are known, render nothing from the page itself: rendering it would
  // mount a possibly restricted screen and fire its API requests before the redirect.
  if (!ready || isLoading) {
    return (
      <div className="ui-state" aria-busy="true">
        Loading…
      </div>
    );
  }

  if (permissionKey || rule) {
    // Feature permission, or the full access rule (permission + minimum role) for pages
    // whose API also requires a minimum role on the server.
    const permitted = rule ? allowed(rule, can, serverRole || role) : can(permissionKey);
    if (!permitted) {
      // Avoid redirect loops if the user is blocked from dashboard.
      const currentPath = location?.pathname || "";
      const fallback = currentPath.startsWith("/dashboard") ? "/profile" : "/dashboard";
      return <Navigate to={fallback} replace />;
    }
  }

  return children;
};

export default PermissionGate;
