import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../utils/config";

const PermissionsContext = createContext({
  isLoading: false,
  role: "",
  permissions: null,
  refresh: async () => {},
  can: () => true,
});

export const PermissionsProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState("");
  const [permissions, setPermissions] = useState(null); // { [featureKey]: boolean }

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setRole("");
      setPermissions(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/permissions/my`, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
        },
        credentials: "include",
      });

      if (!res.ok) {
        setRole("");
        setPermissions(null);
        return;
      }

      const data = await res.json();
      setRole(data.role || "");
      setPermissions(data.permissions || {});
    } catch (e) {
      setRole("");
      setPermissions(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const can = useCallback(
    (featureKey) => {
      // Missing entries are treated as allowed to preserve existing behavior.
      if (!featureKey) return true;
      if (!permissions) return true;
      if (permissions[featureKey] === undefined) return true;
      return !!permissions[featureKey];
    },
    [permissions]
  );

  const value = useMemo(
    () => ({
      isLoading,
      role,
      permissions,
      refresh,
      can,
    }),
    [isLoading, role, permissions, refresh, can]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

export const usePermissions = () => useContext(PermissionsContext);
