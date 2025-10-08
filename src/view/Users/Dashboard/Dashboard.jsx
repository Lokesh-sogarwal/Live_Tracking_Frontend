import React, { useEffect, useState } from 'react';
import './dashboard.css';
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

import Chart from './Dashboardchart/chart';
import TotalUsers from './Total-container/total_Users';
import Total_routes from './Total-container/Total_routes';
import Total_Drivers from './Total-container/total_drivers';
import AllSchedules from './Total-container/allschedules';

const Dashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      return decoded.exp < Date.now() / 1000;
    } catch (err) {
      return true;
    }
  };

  const check_password_change = (token) => {
    try {
      const decoded = jwtDecode(token);
      if (!decoded.is_password_change) {
        navigate('/defaultchangepassword');
      }
    } catch {
      console.log('error');
    }
  };

  const logoutUser = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  useEffect(() => {
    if (!token || isTokenExpired(token)) {
      toast.error("Session expired. Please log in again.");
      setTimeout(logoutUser, 3000);
      return;
    }
    check_password_change(token);
  }, [token]);

  return (
    <>
      <div className="dash-main">
        <div className="dashcontainer">
          <div className="dash-stats">
            <div className="dash-upper">
              <div className="total"><TotalUsers /></div>
              <div className="total"><Total_routes /></div>
            </div>
            <div className="dash-lower">
              <div className="total"><Total_Drivers /></div>
              <div className="total"><Total_routes /></div>
            </div>
          </div>

          <div className="dash-right">
            <div className="charts">
              <Chart />
            </div>
            <div className="dash-calendar">
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                tileClassName={({ date, view }) => {
                  if (view === 'month' && date.toDateString() === new Date().toDateString()) {
                    return 'highlight-today';
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="dash-schedules">
          <AllSchedules selectedDate={selectedDate} />
        </div>
      </div>

      <ToastContainer />
    </>
  );
};

export default Dashboard;
