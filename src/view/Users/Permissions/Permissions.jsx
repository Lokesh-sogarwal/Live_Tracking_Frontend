import React, { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../../utils/config";
import "./permissions.css";
import { legacyAllows, normalizeRole } from "../../../utils/legacyAccess";

const FEATURES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "profile", label: "Profile" },
  { key: "users", label: "Users" },
  { key: "active_users", label: "Active Users" },
  { key: "drivers", label: "Drivers" },
  { key: "upload", label: "Upload Document" },
  { key: "live_tracking", label: "Live Tracking" },
  { key: "create_routes", label: "Create Routes" },
  { key: "all_routes", label: "All Routes" },
  { key: "bus_tracking", label: "Bus Tracking" },
  { key: "bus_schedule", label: "Bus Schedule" },
  { key: "Uploded_documents", label: "Uploaded Documents" },
  { key: "Feedback", label: "Feedback" },
  { key: "Feedbacks", label: "Feedbacks" },
  { key: "chat_bot", label: "ChatBot" },
  { key: "chat", label: "Chat" },
  { key: "profile_settings", label: "Profile Settings" },
  { key: "edit_profile", label: "Edit Profile" },
  { key: "register_bus", label: "Register Bus" },
  { key: "notifications", label: "Notifications" },
  { key: "permissions", label: "Permissions (Superadmin)" },
];

const PermissionsPage = () => {
  const token = localStorage.getItem("token");

  const [roles, setRoles] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [selectedRole, setSelectedRole] = useState("");

  // Local edits for the selected role only
  const [draft, setDraft] = useState({}); // { featureKey: boolean }

  const selectedRolePermissions = useMemo(() => {
    const base = matrix[selectedRole] || {};

    // Missing keys fall back to legacy defaults.
    const merged = {};
    for (const f of FEATURES) {
      merged[f.key] =
        base[f.key] === undefined
          ? legacyAllows(normalizeRole(selectedRole), f.key)
          : !!base[f.key];
    }

    return merged;
  }, [matrix, selectedRole]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/permissions/matrix`, {
          method: "GET",
          headers: {
            Authorization: "Bearer " + token,
          },
          credentials: "include",
        });

        if (!res.ok) return;

        const data = await res.json();
        setRoles(data.roles || []);
        
        setMatrix(data.matrix || {});

        const firstRole = (data.roles || [])[0] || "";
        setSelectedRole((prev) => prev || firstRole);
      } catch (e) {
        // no-op
      }
    };

    if (token) load();
  }, [token]);

  useEffect(() => {
    if (!selectedRole) return;
    setDraft(selectedRolePermissions);
  }, [selectedRole, selectedRolePermissions]);

  const toggle = (featureKey) => {
    setDraft((prev) => ({
      ...prev,
      [featureKey]: !prev[featureKey],
    }));
  };

  const save = async () => {
    if (!selectedRole) return;

    const updates = FEATURES.map((f) => ({
      role_name: selectedRole,
      feature_key: f.key,
      allowed: !!draft[f.key],
    }));

    const res = await fetch(`${API_BASE_URL}/permissions/matrix`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      credentials: "include",
      body: JSON.stringify({ updates }),
    });

    if (!res.ok) return;

    // Refresh matrix
    const refreshed = await fetch(`${API_BASE_URL}/permissions/matrix`, {
      method: "GET",
      headers: { Authorization: "Bearer " + token },
      credentials: "include",
    });

    if (refreshed.ok) {
      const data = await refreshed.json();
      setRoles(data.roles || []);
      setMatrix(data.matrix || {});
    }
  };

  return (
    <div className="permissions-page">
      <div className="permissions-header">
        <h2>Permissions</h2>
        <div className="permissions-controls">
          <label>
            Role:
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <button className="permissions-save" onClick={save}>
            Save
          </button>
        </div>
      </div>

      <div className="permissions-table">
        {FEATURES.map((f) => (
          <div key={f.key} className="permissions-row">
            <div className="permissions-feature">{f.label}</div>
            <label className="permissions-switch">
              <input
                type="checkbox"
                checked={!!draft[f.key]}
                onChange={() => toggle(f.key)}
              />
              <span>Allow</span>
            </label>
          </div>
        ))}
      </div>

      <div className="permissions-note">
        Note: If a permission is not explicitly set, it defaults to allowed.
      </div>
    </div>
  );
};

export default PermissionsPage;
