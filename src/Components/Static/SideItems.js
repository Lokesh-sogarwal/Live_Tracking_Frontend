import { MdDashboard, MdSchedule, MdOutlineFileUpload, MdSupportAgent, MdAdminPanelSettings } from "react-icons/md";
import { FaMapMarkedAlt, FaUsers, FaUserCheck, FaBusAlt, FaRoute, FaIdCard, FaUserPlus } from "react-icons/fa";
import { FiMessageSquare } from "react-icons/fi";
import { VscFeedback } from "react-icons/vsc";
import { IoDocumentSharp } from "react-icons/io5";
import { IoIosNotifications } from "react-icons/io";
import { RiFeedbackLine } from "react-icons/ri";

// Sidebar navigation. Every item links to an existing route in routes/mainRoutes.js and is
// shown only when its access rule (utils/access.js) passes for the signed-in role.
export const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [
      { id: "dashboard", title: "Dashboard", icon: <MdDashboard />, link: "/dashboard", rule: "dashboard" },
      { id: "live", title: "Live Tracking", icon: <FaMapMarkedAlt />, link: "/live_tracking", rule: "liveTracking" },
      { id: "schedule", title: "Bus Schedule", icon: <MdSchedule />, link: "/bus_schedule", rule: "busSchedule" },
      { id: "notifications", title: "Notifications", icon: <IoIosNotifications />, link: "/notifications", rule: "notifications" },
    ],
  },
  {
    title: "Fleet",
    items: [
      { id: "create_routes", title: "Create Route", icon: <FaRoute />, link: "/create_routes", rule: "createRoute" },
      { id: "register_bus", title: "Buses", icon: <FaBusAlt />, link: "/register_bus", rule: "registerBus" },
    ],
  },
  {
    title: "People",
    items: [
      { id: "users", title: "Users", icon: <FaUsers />, link: "/users", rule: "users" },
      { id: "drivers", title: "Drivers", icon: <FaIdCard />, link: "/drivers", rule: "drivers" },
      { id: "active_users", title: "Active Users", icon: <FaUserCheck />, link: "/active_users", rule: "activeUsers" },
      { id: "applications", title: "Applications", icon: <FaUserPlus />, link: "/applications", rule: "reviewApplications" },
    ],
  },
  {
    title: "Documents",
    items: [
      { id: "upload", title: "Upload Document", icon: <MdOutlineFileUpload />, link: "/upload", rule: "uploadDocument" },
      { id: "documents", title: "Document Review", icon: <IoDocumentSharp />, link: "/Uploded_documents", rule: "reviewDocuments" },
    ],
  },
  {
    title: "Communication",
    items: [
      { id: "chat", title: "Chat", icon: <FiMessageSquare />, link: "/chat", rule: "chat", badge: "chat" },
      { id: "feedback", title: "Give Feedback", icon: <RiFeedbackLine />, link: "/Feedback", rule: "giveFeedback" },
      { id: "feedbacks", title: "Feedbacks & Complaints", icon: <VscFeedback />, link: "/Feedbacks", rule: "feedbackInbox" },
      { id: "chatbot", title: "Assistant", icon: <MdSupportAgent />, link: "/chat_bot", rule: "chatbot" },
    ],
  },
  {
    title: "Administration",
    items: [
      { id: "permissions", title: "Permissions", icon: <MdAdminPanelSettings />, link: "/permissions", rule: "permissions" },
    ],
  },
];

// Titles for the top bar, keyed by path (includes pages reached from inside other pages).
export const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/live_tracking": "Live Tracking",
  "/all_routes": "Available Routes",
  "/bus_tracking": "Bus Tracking",
  "/bus_schedule": "Bus Schedule",
  "/notifications": "Notifications",
  "/create_routes": "Create Route",
  "/register_bus": "Buses",
  "/users": "Users",
  "/drivers": "Drivers",
  "/active_users": "Active Users",
  "/upload": "Upload Document",
  "/Uploded_documents": "Document Review",
  "/chat": "Chat",
  "/Feedback": "Give Feedback",
  "/Feedbacks": "Feedbacks & Complaints",
  "/Feedbacks/:id": "Feedback Conversation",
  "/my_feedback/:id": "Your Feedback",
  "/chat_bot": "Assistant",
  "/permissions": "Permissions",
  "/applications": "Applications",
  "/profile": "Profile",
  "/edit_profile": "Edit Profile",
  "/profile_settings": "Settings",
};

// Parent page for the breadcrumb, where a page is reached from another one.
export const PAGE_PARENTS = {
  "/all_routes": "/live_tracking",
  "/bus_tracking": "/live_tracking",
  "/edit_profile": "/profile",
  "/my_feedback": "/Feedback",
};
