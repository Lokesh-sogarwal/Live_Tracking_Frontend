// Client-side mirror of the backend's authorization rules (backend-node/src/routes/index.js
// and controllers). Used only to decide what to SHOW; the server still enforces every rule.
//
// Two layers, as on the server:
//   1. feature permission  -> can(featureKey), from GET /permissions/my (role defaults + matrix)
//   2. minimum role rank   -> some write/review endpoints also require operator or above
import { normalizeRole } from "./legacyAccess";

// Same ranking as backend-node/src/services/roles.js.
const RANK = { superadmin: 4, admin: 3, operator: 2, driver: 1, passenger: 0 };

export const roleKey = (role) => normalizeRole(role).replace(/[\s_-]+/g, "");
export const roleRank = (role) => RANK[roleKey(role)] ?? 0;
export const atLeast = (role, minRole) => roleRank(role) >= RANK[minRole];

// Each rule: (can, role) => boolean. Keys are used by the sidebar, dashboards and quick actions.
export const RULES = {
  dashboard: (can) => can("dashboard"),
  liveTracking: (can) => can("live_tracking"),
  busTracking: (can) => can("bus_tracking"),
  busSchedule: (can) => can("bus_schedule"),
  // GET /bus/schedules: dashboard OR bus_schedule
  readSchedules: (can) => can("dashboard") || can("bus_schedule"),
  allRoutes: (can) => can("all_routes") || can("live_tracking"),
  // POST /bus/schedules: operator+ AND bus_schedule; the form also lists drivers (drivers)
  // and routes (dashboard).
  createSchedule: (can, role) => can("bus_schedule") && can("drivers") && can("dashboard") && atLeast(role, "operator"),
  // POST /bus/bus_route and /bus/register_bus: operator+ AND the feature permission
  createRoute: (can, role) => can("create_routes") && atLeast(role, "operator"),
  registerBus: (can, role) => can("register_bus") && atLeast(role, "operator"),
  users: (can) => can("users"),
  activeUsers: (can) => can("active_users"),
  drivers: (can) => can("drivers"),
  uploadDocument: (can) => can("upload"),
  // GET /data/get_documents, verify/reject: operator+ AND Uploded_documents
  reviewDocuments: (can, role) => can("Uploded_documents") && atLeast(role, "operator"),
  giveFeedback: (can) => can("Feedback"),
  // GET /data/get_feedback: operator+ AND Feedbacks
  feedbackInbox: (can, role) => can("Feedbacks") && atLeast(role, "operator"),
  chat: (can) => can("chat"),
  chatbot: (can) => can("chat_bot"),
  notifications: (can) => can("notifications"),
  profile: (can) => can("profile"),
  settings: (can) => can("profile_settings"),
  // /onboarding/applications: operator+; the server narrows further per application
  // (driver documents: Uploded_documents + drivers; operator applications and decisions: admin+).
  reviewApplications: (can, role) => atLeast(role, "operator") && (can("Uploded_documents") || can("users")),
  // /permissions/* is superadmin-only on the server
  permissions: (_can, role) => roleKey(role) === "superadmin",
};

export const allowed = (ruleName, can, role) => Boolean(RULES[ruleName]?.(can, role));
