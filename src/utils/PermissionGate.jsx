import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { usePermissions } from "../context/PermissionsContext";
import { legacyAllows, normalizeRole } from "./legacyAccess";

const PermissionGate = ({ permissionKey, requireSuperadmin = false, children }) => {
  const token = localStorage.getItem("token");
  const { isLoading, permissions } = usePermissions();

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

  // While loading, avoid redirect flicker; show the page (or keep blank).
  if (isLoading) {
    return children;
  }

  if (permissionKey) {
    const hasExplicit =
      permissions && Object.prototype.hasOwnProperty.call(permissions, permissionKey);

    const allowed = hasExplicit
      ? !!permissions[permissionKey]
      : legacyAllows(normalizedRole, permissionKey);

    if (!allowed) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default PermissionGate;
