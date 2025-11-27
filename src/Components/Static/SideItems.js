import { MdDashboard } from "react-icons/md";
import { FaUser, FaUsers, FaMapMarkedAlt } from "react-icons/fa"
import { TbRouteSquare } from "react-icons/tb";
import { IoIosNotifications } from "react-icons/io";
import { MdFeedback, MdSchedule, MdOutlineFileUpload } from "react-icons/md";
import { FaBusAlt } from "react-icons/fa";
import { VscFeedback } from "react-icons/vsc";
import { BsDatabaseAdd } from "react-icons/bs";
import { IoDocumentSharp } from "react-icons/io5";

export const Items = [
    {
        id: 1,
        title: "Dashboard",
        icon: <MdDashboard />,
        link: "/dashboard"
    },
    {
        id: 2,
        title: "Active Users",
        icon: <FaUsers />,
        link: "/active_users"
    },
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
        id: 5,
        title: "Create Route",
        icon: <TbRouteSquare />,
        link: "/Create_routes"
    },
    {
        id: 12,
        title: "Register Bus",
        icon: <BsDatabaseAdd />,
        link: "/Bus_register"
    },
    {
        id: 6,
        title: "Buses",
        icon: <FaBusAlt />,
        link: "/Bus_details"
    },
    {
        id: 9,
        title: "Schedule",
        icon: <MdSchedule />,
        link: "/bus_schedule"
    },
    
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
        id: 11,
        title: "Feedback",
        icon: <VscFeedback />,
        link: "/Feedback"
    },
    {
        id: 11,
        title: "Feedbacks & Complaints",
        icon: <VscFeedback />,
        link: "/Feedbacks"
    },
    {
        id: 13,
        title:"ChatBot",
        icon:<MdFeedback/>,
        link:"/chat_bot"
    },
    {
        id: 14,
        title:"Chat",
        icon:<IoIosNotifications/>,
        link:"/chat"
    }

]