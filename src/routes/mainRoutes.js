import Dashboard from '../view/Users/Dashboard/Dashboard';
import Profile from '../view/Users/Profile/Profile';
// import AboutUs from '../view/users/User_details/aboutus';
import Userdetails from '../view/Users/UserDeatils/UserDetails'; 
// import Change_password from '../view/users/ChangePassword/Changepassword';
// import Otp from '../view/auth/OTP/Otp';
import Active_Users from '../view/Users/Active Users/active_users';
// import Chat from '../view/Chatbox/chat';
import DriverDetails from '../view/Users/Drivers/Driver_details';
import DriverUpload from '../view/Users/Upload_File/DriverUpload';
import LiveTracking from '../view/Users/Live Tracking/LiveTracking';
import BusRoute from '../view/Users/Route/BusRoute';
import AllRoutes from '../view/Users/Route/AllRoutes';
import BusTracking from '../view/Users/Live Tracking/BusTracking';
// import Landing from '../view/auth/LandingPage/Landing';
import BusSchedule from '../view/Users/Schedules/schedule';
import Uploaded_documents from '../view/Users/Upload_File/Uploaded_documents';
import Feedback from '../view/Users/FeedBacks/feedback';
import ShowFeeback from '../view/Users/FeedBacks/show_feedback';
import ChatBot from '../view/Users/Chatbot/chatbot';
import Chat from '../view/Chatbox/chat';
import Settings from '../view/Users/Settings/setting';
import EditProfile from '../view/Users/Settings/editProfile';
import RegisterBus from '../view/Users/Bus/RegisterBus';
import Notification from '../view/Users/Notification/Notification';
import PermissionsPage from '../view/Users/Permissions/Permissions';





export const userRoutes = [
  {
    id: 1,
    path: "dashboard",   // no leading slash for nested routes
    element: <Dashboard />,
    permissionKey: "dashboard"
  },
  {
    id: 2,
    path: "profile",
    element: <Profile />,
    permissionKey: "profile"
  },
//   {
//     id: 3,
//     path: "aboutus",
//     element: <AboutUs />
//   },
  {
    id: 4,
    path: "users",
    element: <Userdetails />,
    permissionKey: "users"
  },
//   {
//     id: 5,
//     path: "defaultchangepassword",
//     element: <Change_password />
//   },
//   {
//     id: 6,
//     path: "verify_otp",
//     element: <Otp />
//   },
  {
    id: 7,
    path: "active_users",
    element: <Active_Users />,
    permissionKey: "active_users"   // ✅ will render inside Layout
  },
//   {
//     id:13,
//     path:"Chats",
//     element:<Chat/>
//   },
  {
    id: 14,
    path: "drivers",
    element: <DriverDetails />,
    permissionKey: "drivers"
  },
  {
    id: 15,
    path: "upload",
    element: <DriverUpload />,
    permissionKey: "upload"
  },
  {
    id: 16,
    path: "live_tracking",
    element: <LiveTracking />,
    permissionKey: "live_tracking"
  },
  {
    id: 17,
    path: "create_routes",
    element: <BusRoute />,
    permissionKey: "create_routes"
  },{
    id: 18,
    path: "all_routes",
    element: <AllRoutes />,
    permissionKey: "all_routes"
  }
  ,{
    id: 19,
    path: "bus_tracking",
    element: <BusTracking />,
    permissionKey: "bus_tracking"
  },
  // {
  //   id: 20,
  //   path: "landing_page",
  //   element: <Landing />
  // },
  {
    id: 21,
    path: "bus_schedule",
    element: <BusSchedule />,
    permissionKey: "bus_schedule"
  },
  {
    id: 22,
    path:"Uploded_documents",
    element:<Uploaded_documents/>,
    permissionKey: "Uploded_documents"
  },
  {
    id: 23,
    path:"Feedback",
    element:<Feedback/>,
    permissionKey: "Feedback"
  },
  {
    id: 24,
    path:"Feedbacks",
    element:<ShowFeeback/>,
    permissionKey: "Feedbacks"
  },
  {
    id: 25,
    path:"chat_bot",
    element:<ChatBot/>,
    permissionKey: "chat_bot"
  },
  {
    id: 26,
    path:"chat",
    element:<Chat/>,
    permissionKey: "chat"
  },
  {
    id: 27,
    path:"profile_settings",
    element:<Settings/>,
    permissionKey: "profile_settings"
  },
  {
    id: 28,
    path:"edit_profile",
    element:<EditProfile/>,
    permissionKey: "edit_profile"
  },
  {
    id: 29,
    path:"register_bus",
    element:<RegisterBus/>,
    permissionKey: "register_bus"
  },
  {
    id: 30,
    path:"notifications",
    element:<Notification/>,
    permissionKey: "notifications"
  },
  {
    id: 31,
    path: "permissions",
    element: <PermissionsPage />,
    permissionKey: "permissions",
    requireSuperadmin: true
  }
];



