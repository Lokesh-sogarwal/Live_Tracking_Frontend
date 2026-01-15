export const normalizeRole = (role) => (role || "").toString().trim().toLowerCase();

// Legacy defaults (before permissions UI existed)
// If a permission key is NOT explicitly configured in DB, we use this fallback.
export const legacyAllows = (role, permissionKey) => {
  const r = normalizeRole(role);
  const key = (permissionKey || "").toString();

  if (!key) return true;

  // Superadmin can access everything by default
  if (r === "superadmin") return true;

  // Only superadmin should see/manage permissions screen by default
  if (key === "permissions") return false;

  // Operator restrictions (intended)
  if (r === "operator") {
    const deny = new Set(["active_users", "users"]);
    return !deny.has(key);
  }

  // Driver restrictions (intended)
  if (r === "driver") {
    const deny = new Set([
      "active_users",
      "users",
      "create_routes",
      "live_tracking",
      "Uploded_documents",
      "Feedbacks",
    ]);
    return !deny.has(key);
  }

  // Passenger restrictions (intended)
  if (r === "passenger") {
    const deny = new Set([
      "active_users",
      "users",
      "create_routes",
      "bus_schedule",
      "drivers",
      "Uploded_documents",
      "Feedbacks",
    ]);
    return !deny.has(key);
  }

  // Admin (and any unknown roles) default to allow
  return true;
};
