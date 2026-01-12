import { IoIosLogOut, IoIosSettings, IoIosNotifications } from "react-icons/io";
import { CgProfile } from "react-icons/cg";
import { Logout } from "../../utils/logout";
import { BsDatabaseAdd } from "react-icons/bs";

import { TbRouteSquare } from "react-icons/tb";


const navItems = [
  {
    id: 1,
    title: "Profile",
    icon: <CgProfile />,
    path: "/profile",
  },
   {
    id: 5,
    title: "Create Route",
    icon: <TbRouteSquare />,
    path: "/create_routes"
  },
  {
    id: 12,
    title: "Register Bus",
    icon: <BsDatabaseAdd />,
    path: "/register_bus"
  },
 
  {
    id: 3,
    title: "Notification",
    icon: <IoIosNotifications />,
    path: "/notifications"
  },
  {
    id: 2,
    title: "Settings",
    icon: <IoIosSettings />,
    path: "/profile_settings",
  },
 
  {
    id: 4,
    title: "Logout",
    icon: <IoIosLogOut />,
    path: null,
    action: Logout
  },
];

export default navItems;
