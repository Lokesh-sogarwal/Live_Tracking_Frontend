import Dashboard from '../view/Users/Dashboard/Dashboard';
import Profile from '../view/Users/Profile/Profile';
// import AboutUs from '../view/users/User_details/aboutus';
import Userdetails from '../view/Users/UserDeatils/UserDetails'; 
// import Change_password from '../view/users/ChangePassword/Changepassword';
// import Otp from '../view/auth/OTP/Otp';
import Active_Users from '../view/Users/Dashboard/Active_user_details/active_user_details';
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




export const userRoutes = [
  {
    id: 1,
    path: "dashboard",   // no leading slash for nested routes
    element: <Dashboard />
  },
  {
    id: 2,
    path: "profile",
    element: <Profile />
  },
//   {
//     id: 3,
//     path: "aboutus",
//     element: <AboutUs />
//   },
  {
    id: 4,
    path: "users",
    element: <Userdetails />
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
    element: <Active_Users />   // ✅ will render inside Layout
  },
//   {
//     id:13,
//     path:"Chats",
//     element:<Chat/>
//   },
  {
    id: 14,
    path: "drivers",
    element: <DriverDetails />
  },
  {
    id: 15,
    path: "upload",
    element: <DriverUpload />
  },
  {
    id: 16,
    path: "live_tracking",
    element: <LiveTracking />
  },
  {
    id: 17,
    path: "Create_routes",
    element: <BusRoute />
  },{
    id: 18,
    path: "all_routes",
    element: <AllRoutes />
  }
  ,{
    id: 19,
    path: "bus_tracking",
    element: <BusTracking />
  },
  // {
  //   id: 20,
  //   path: "landing_page",
  //   element: <Landing />
  // },
  {
    id: 21,
    path: "bus_schedule",
    element: <BusSchedule />
  },
  {
    id: 22,
    path:"Uploded_documents",
    element:<Uploaded_documents/>
  },
  {
    id: 23,
    path:"Feedback",
    element:<Feedback/>
  },
  {
    id: 24,
    path:"Feedbacks",
    element:<ShowFeeback/>
  },
  {
    id: 25,
    path:"chat_bot",
    element:<ChatBot/>
  },
  {
    id: 26,
    path:"chat",
    element:<Chat/>
  }

];



