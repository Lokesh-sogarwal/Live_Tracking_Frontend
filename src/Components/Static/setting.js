import { MdSettings, MdLockOutline } from "react-icons/md";
import { VscFeedback } from "react-icons/vsc";
import { Logout } from "../../utils/logout"; // ✅ correct import
import { IoIosLogOut } from "react-icons/io";

export const Settings = [
  {
    id: 1,
    title: "Edit Profile",
    icon: <MdSettings />,
    link: "/edit_profile", // ✅ use `path`, not `link`
  },
  {
    id: 3,
    title: "Change Password",
    icon: <MdLockOutline />,
    link: "/change-password",
  },
  {
    id: 2,
    title: "Feedback",
    icon: <VscFeedback />,
    link: "/feedback", // ✅ lowercase so route matches better
  },
  {
     id: 4,
     title: "Logout",
     icon: <IoIosLogOut />,
     path: null,
     action: Logout
   },
];

export default Settings;
