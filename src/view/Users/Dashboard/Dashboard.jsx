import React, { useEffect } from "react";
import "./dashboard.css";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { FaChartLine, FaMapMarkedAlt } from "react-icons/fa";

import TotalUsers from "./Total-container/total_Users";
import Total_routes from "./Total-container/Total_routes";
import Total_Drivers from "./Total-container/total_drivers";
import AllSchedules from "./Total-container/allschedules";
import Allbuses from "./Total-container/Total_buses";
import LiveMap from "../../../Components/LiveMap";

const Dashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const isTokenExpired = (token) => {
    try {
      return jwtDecode(token).exp < Date.now() / 1000;
    } catch {
      return true;
    }
  };

  useEffect(() => {
    if (!token || isTokenExpired(token)) {
      toast.error("Session expired");
      setTimeout(() => {
        localStorage.removeItem("token");
        window.location.href = "/";
      }, 2000);
    }
  }, [token]);

  return (
    <>
      <div className="dash-main">
        
        {/* Statistics Section Title */}
        <div className="section-header">
           <div className="title-box">
             <FaChartLine className="section-icon" />
             <h3>Overview</h3>
           </div>
           <p className="section-subtitle">Real-time statistics of your transport network.</p>
        </div>

        <div className="dashcontainer">
          {/* LEFT: Stats Grid */}
          <div className="dash-stats">
            <div className="total-wrapper">
              <TotalUsers />
            </div>
            <div className="total-wrapper">
              <Total_routes />
            </div>
            <div className="total-wrapper">
              <Total_Drivers />
            </div>
            <div className="total-wrapper">
              <Allbuses />
            </div>
          </div>

          {/* RIGHT: Live Map */}
          <div className="dash-right">
             <div className="section-header map-header-small">
               <div className="title-box">
                 <FaMapMarkedAlt className="section-icon blue-icon" />
                 <h3>Live Tracking</h3>
               </div>
             </div>
            <div className="map-container">
              <LiveMap />
            </div>
          </div>
        </div>

        {/* Schedule/Table Section */}
        {/* <div className="dash-schedules-section">
           <div className="section-header">
             <h3>Recent Schedules</h3>
           </div>
          <AllSchedules />
        </div> */}
      </div>

      <ToastContainer />
    </>
  );
};

export default Dashboard;
