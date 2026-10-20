import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FiSave, FiRotateCcw } from "react-icons/fi";
import API_BASE_URL from "../../../utils/config";
import "./permissions.css";
import { legacyAllows, normalizeRole } from "../../../utils/legacyAccess";
import { usePermissions } from "../../../context/PermissionsContext";
import { PageHeader, Panel, ConfirmDialog } from "../../../Components/ui";

const GROUPS = [
  {
    title: "General",
    features: [
      { key: "dashboard", label: "Dashboard" },
      { key: "notifications", label: "Notifications" },
      { key: "profile", label: "Profile" },
      { key: "profile_settings", label: "Profile settings" },
      { key: "edit_profile", label: "Edit profile" },
    ],
  },
  {
    title: "Tracking & schedules",
    features: [
      { key: "live_tracking", label: "Live tracking" },
      { key: "bus_tracking", label: "Bus tracking" },
      { key: "bus_schedule", label: "Bus schedule" },
      { key: "all_routes", label: "All routes" },
    ],
  },
  {
    title: "Fleet & routes",
    features: [
      { key: "register_bus", label: "Register bus" },
      { key: "create_routes", label: "Create routes" },
    ],
  },
  {
    title: "People",
    features: [
      { key: "users", label: "Users" },
      { key: "active_users", label: "Active users" },
      { key: "drivers", label: "Drivers" },
    ],
  },
  {
    title: "Documents",
    features: [
      { key: "upload", label: "Upload document" },
      { key: "Uploded_documents", label: "Review documents" },
    ],
  },
  {
    title: "Communication",
    features: [
      { key: "chat", label: "Chat" },
      { key: "chat_bot", label: "Assistant (ChatBot)" },
      { key: "Feedback", label: "Send feedback" },
      { key: "Feedbacks", label: "Feedback inbox" },
    ],
  },
  { title: "Administration", features: [{ key: "permissions", label: "Permissions (superadmin only on the server)" }] },
];
const FEATURES = GROUPS.flatMap((g) => g.features);

const PermissionsPage = () => {
  const token = localStorage.getItem("token");
  const { refresh, role: myRole } = usePermissions();
  const [status, setStatus] = useState("loading");
  const [roles, setRoles] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [selectedRole, setSelectedRole] = useState("");
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [pendingRole, setPendingRole] = useState(null); // role switch waiting on "discard changes?"

  // Missing keys fall back to legacy defaults.
  const saved = useMemo(() => {
    const base = matrix[selectedRole] || {};
    const merged = {};
    for (const f of FEATURES) merged[f.key] = base[f.key] === undefined ? legacyAllows(normalizeRole(selectedRole), f.key) : !!base[f.key];
    return merged;
  }, [matrix, selectedRole]);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(`${API_BASE_URL}/permissions/matrix`, {
        headers: { Authorization: "Bearer " + token },
        credentials: "include",
      });
      if (!res.ok) {
        setStatus(res.status === 403 ? "forbidden" : "error");
        return;
      }
      const data = await res.json();
      setRoles(data.roles || []);
      setMatrix(data.matrix || {});
      setSelectedRole((prev) => prev || (data.roles || [])[0] || "");
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, [token]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  useEffect(() => {
    setDraft(saved);
  }, [saved]);

  const changed = FEATURES.filter((f) => draft[f.key] !== saved[f.key]);
  const dirty = changed.length > 0;

  const chooseRole = (r) => (dirty ? setPendingRole(r) : setSelectedRole(r));

  const save = async () => {
    if (!selectedRole || !dirty) return;
    setSaving(true);
    try {
      // Only the switches that changed are written, so untouched features keep their defaults.
      const updates = changed.map((f) => ({ role_name: selectedRole, feature_key: f.key, allowed: !!draft[f.key] }));
      const res = await fetch(`${API_BASE_URL}/permissions/matrix`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        credentials: "include",
        body: JSON.stringify({ updates }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Permissions were not saved");
        return;
      }
      toast.success(`Saved ${data.applied ?? updates.length} change${updates.length === 1 ? "" : "s"} for ${selectedRole}`);
      await load();
      if (normalizeRole(selectedRole) === normalizeRole(myRole)) refresh();
    } catch {
      toast.error("Could not reach the server. Permissions were not saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ui-page">
      <PageHeader
        title="Permissions"
        description="Choose which features each role can open. The server also enforces role rank, so some features stay restricted even when allowed here."
        actions={
          <>
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setDraft(saved)} disabled={!dirty || saving}>
              <FiRotateCcw aria-hidden="true" /> Discard
            </button>
            <button type="button" className="ui-btn ui-btn-primary" onClick={save} disabled={!dirty || saving}>
              {saving ? <span className="ui-spinner" aria-hidden="true" /> : <FiSave aria-hidden="true" />} {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      />

      {status === "ok" && (
        <div className="perm-toolbar">
          <div className="ui-tabs" role="tablist" aria-label="Role">
            {roles.map((r) => (
              <button key={r} type="button" role="tab" className="ui-tab" aria-selected={selectedRole === r} onClick={() => chooseRole(r)}>
                {r}
              </button>
            ))}
          </div>
          <span className={`perm-dirty${dirty ? " is-dirty" : ""}`} role="status">
            {dirty ? `${changed.length} unsaved change${changed.length === 1 ? "" : "s"}` : "All changes saved"}
          </span>
        </div>
      )}

      <Panel status={status} onRetry={load} flush={false}>
        <div className="perm-groups">
          {GROUPS.map((g) => (
            <fieldset key={g.title} className="perm-group">
              <legend className="perm-group-title">{g.title}</legend>
              {g.features.map((f) => {
                const id = `perm-${f.key}`;
                const isChanged = draft[f.key] !== saved[f.key];
                return (
                  <div key={f.key} className={`perm-row${isChanged ? " is-changed" : ""}`}>
                    <label htmlFor={id} className="perm-label">
                      {f.label}
                      {isChanged && <span className="perm-changed">Changed</span>}
                    </label>
                    <input
                      id={id}
                      type="checkbox"
                      role="switch"
                      className="perm-switch"
                      checked={!!draft[f.key]}
                      aria-checked={!!draft[f.key]}
                      onChange={() => setDraft((d) => ({ ...d, [f.key]: !d[f.key] }))}
                      disabled={saving}
                    />
                  </div>
                );
              })}
            </fieldset>
          ))}
        </div>
        <p className="ui-hint perm-note">Features without an explicit setting use the role's default access.</p>
      </Panel>

      <ConfirmDialog
        open={Boolean(pendingRole)}
        title="Discard unsaved changes?"
        message={`You have ${changed.length} unsaved change${changed.length === 1 ? "" : "s"} for ${selectedRole}. Switching to ${pendingRole} discards them.`}
        confirmLabel="Discard and switch"
        tone="danger"
        onConfirm={() => {
          setSelectedRole(pendingRole);
          setPendingRole(null);
        }}
        onCancel={() => setPendingRole(null)}
      />
    </div>
  );
};

export default PermissionsPage;
