import { IoIosSettings } from "react-icons/io";
import { CgProfile } from "react-icons/cg";

// Account menu (top-right). Fleet actions such as Create Route / Register Bus live in the
// sidebar, gated by role; logout is handled by the menu itself.
const navItems = [
  { id: 1, title: "Profile", icon: <CgProfile />, path: "/profile", rule: "profile" },
  { id: 2, title: "Settings", icon: <IoIosSettings />, path: "/profile_settings", rule: "settings" },
];

export default navItems;
