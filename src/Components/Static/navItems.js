import { IoIosLogOut, IoIosSettings ,IoIosNotifications} from "react-icons/io";
import { CgProfile } from "react-icons/cg";
import { Logout } from "../../utils/logout";

const navItems = [
  {
    id: 1,
    title: "Profile",
    icon: <CgProfile />,
    path: "/profile",
  },
  {
    id: 3,
    title: "Notification",
    icon: <IoIosNotifications />,
    link: "/notification"
  },
  {
    id: 2,
    title: "Settings",
    icon: <IoIosSettings />,
    path: "/settings",
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
