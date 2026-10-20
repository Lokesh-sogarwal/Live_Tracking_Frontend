import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import API_BASE_URL from "../utils/config";
import { clearSession } from "../utils/logout";
import { legacyAllows } from "../utils/legacyAccess";

const PermissionsContext = createContext({
  isLoading: false,
  ready: false,
  role: "",
  permissions: null,
  refresh: async () => {},
  can: () => true,
});

const roleFromToken = () => {
  try {
    return jwtDecode(localStorage.getItem("token") || "").role || "";
  } catch {
    return "";
  }
};

export const PermissionsProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  // true once /permissions/my has answered (or failed), so gated UI does not flash.
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState(roleFromToken);
  const [permissions, setPermissions] = useState(null); // { [featureKey]: boolean }

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setRole("");
      setPermissions(null);
      setReady(true);
      return;
    }

    setIsLoading(true);
    try {
      const permRes = await fetch(`${API_BASE_URL}/permissions/my`, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
        },
        credentials: "include",
      });

      if (permRes.status === 401) {
        // The server rejected the token (expired, logged out, user removed, or issued by
        // the old backend). Without this the UI stays "logged in" with every call failing.
        clearSession("/login");
        return;
      }

      if (permRes.ok) {
        const data = await permRes.json();
        setRole(data.role || "");
        setPermissions(data.permissions || {});
      } else {
        setRole(roleFromToken());
        setPermissions(null);
      }
    } catch (e) {
      setRole(roleFromToken());
      setPermissions(null);
    } finally {
      setIsLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const can = useCallback(
    (featureKey) => {
      if (!featureKey) return true;
      // Server answer unavailable: fall back to the documented role defaults rather than
      // showing everything. The server still enforces access either way.
      if (!permissions) return legacyAllows(role, featureKey);
      if (permissions[featureKey] === undefined) return true;
      return !!permissions[featureKey];
    },
    [permissions, role]
  );

  const value = useMemo(
    () => ({
      isLoading,
      ready,
      role,
      permissions,
      refresh,
      can,
    }),
    [isLoading, ready, role, permissions, refresh, can]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

export const usePermissions = () => useContext(PermissionsContext);
