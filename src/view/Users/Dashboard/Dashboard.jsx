import React, { useEffect } from "react";
import "./dashboard.css";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";

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
        <div className="dashcontainer">

          {/* LEFT */}
          <div className="dash-stats">
            <div className="dash-upper">
              <div className="total"><TotalUsers /></div>
              <div className="total"><Total_routes /></div>
            </div>

            <div className="dash-lower">
              <div className="total"><Total_Drivers /></div>
              <div className="total"><Allbuses /></div>
            </div>
          </div>

          {/* RIGHT → LIVE MAP */}
          <div className="dash-right">
            <div className="map-container">
              <LiveMap />
            </div>
          </div>

        </div>

        <div className="dash-schedules">
          <AllSchedules />
        </div>
      </div>

      <ToastContainer />
    </>
  );
};

export default Dashboard;
