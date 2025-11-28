import { MdDashboard } from "react-icons/md";
import { FaUser, FaUsers, FaMapMarkedAlt } from "react-icons/fa"
import { IoIosNotifications } from "react-icons/io";
import { MdFeedback, MdSchedule, MdOutlineFileUpload } from "react-icons/md";
import { FiMessageSquare } from "react-icons/fi";
import { VscFeedback } from "react-icons/vsc";
import { MdSupportAgent } from "react-icons/md";
import { IoDocumentSharp } from "react-icons/io5";
import { FaBusAlt } from "react-icons/fa";

export const Items = [
    {
        id: 1,
        title: "Dashboard",
        icon: <MdDashboard />,
        link: "/dashboard"
    },
    // {
    //     id: 2,
    //     title: "Active Users",
    //     icon: <FaUsers />,
    //     link: "/active_users"
    // },
    // {
    //     id: 3,
    //     title: "Users",
    //     icon: <FaUser/>,
    //     link: "/users"
    // },
    // {
    //     id: 4,
    //     title: "Driver",
    //     icon: <FaBusAlt/>,
    //     link: "/drivers"
    // },
    {
        id: 7,
        title: "Live Tracking",
        icon: <FaMapMarkedAlt />,
        link: "live_tracking"
    },

    {
        id: 14,
        title: "Chat",
        icon: <FiMessageSquare />,
        link: "/chat"
    },

    {
        id: 9,
        title: "Schedule",
        icon: <MdSchedule />,
        link: "/bus_schedule"
    },
    // {
    //     id: 6,
    //     title: "Buses",
    //     icon: <FaBusAlt />,
    //     link: "/Bus_details"
    // },

    {
        id: 10,
        title: "Upload Document",
        icon: <MdOutlineFileUpload />,
        link: "/upload"
    },
    {
        id: 12,
        title: "Uploaded Documents",
        icon: <IoDocumentSharp />,
        link: "/Uploded_documents"
    },

    {
        id: 16,
        title: "Feedbacks & Complaints",
        icon: <VscFeedback />,
        link: "/Feedbacks"
    },
    {
        id: 13,
        title: "ChatBot",
        icon: <MdSupportAgent />,
        link: "/chat_bot"
    },

]