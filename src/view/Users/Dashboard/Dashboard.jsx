import React, { useEffect, useState } from "react";
import "./dashboard.css";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { FaChartLine, FaExclamationTriangle, FaRoute } from "react-icons/fa";

import TotalUsers from "./Total-container/total_Users";
import Total_routes from "./Total-container/Total_routes";
import Total_Drivers from "./Total-container/total_drivers";
import AllSchedules from "./Total-container/allschedules";
import Allbuses from "./Total-container/Total_buses";
import API_BASE_URL from "../../../utils/config";

const normalizeStatus = (status) => {
  return String(status || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .trim();
};

const Dashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [todaySchedules, setTodaySchedules] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState(null);

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

  useEffect(() => {
    let isMounted = true;

    const fetchTodaySchedules = async (showLoader = false) => {
      try {
        if (showLoader) {
          setScheduleLoading(true);
        }
        setScheduleError(null);

        const todayStr = new Date().toISOString().slice(0, 10);
        const url = `${API_BASE_URL}/bus/schedules?date=${todayStr}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!isMounted) return;

        if (res.ok) {
          setTodaySchedules(Array.isArray(data) ? data : []);
        } else {
          setScheduleError(data.error || "Failed to fetch today's schedules");
        }
      } catch (err) {
        console.error("Error fetching dashboard schedules", err);
        if (isMounted) {
          setScheduleError("Failed to fetch today's schedules");
        }
      } finally {
        if (showLoader && isMounted) {
          setScheduleLoading(false);
        }
      }
    };

    // Initial load with loader
    fetchTodaySchedules(true);

    // Poll every 30 seconds for near real-time updates
    const intervalId = setInterval(() => {
      fetchTodaySchedules(false);
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

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

          {/* RIGHT: Performance + Alerts */}
          <div className="dash-right">
            <PunctualityWidget
              schedules={todaySchedules}
              loading={scheduleLoading}
              error={scheduleError}
            />

            <AlertsWidget
              schedules={todaySchedules}
              loading={scheduleLoading}
            />

            <TopRoutesWidget
              schedules={todaySchedules}
              loading={scheduleLoading}
            />
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

const PunctualityWidget = ({ schedules, loading, error }) => {
  if (loading) {
    return (
      <div className="dash-widget-card">
        <div className="dash-widget-header">
          <div className="title-box">
            <FaChartLine className="section-icon" />
            <h3>Network Performance</h3>
          </div>
        </div>
        <p className="dash-widget-muted">Loading today's performance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-widget-card">
        <div className="dash-widget-header">
          <div className="title-box">
            <FaChartLine className="section-icon" />
            <h3>Network Performance</h3>
          </div>
        </div>
        <p className="dash-widget-error">{error}</p>
      </div>
    );
  }

  const total = schedules.length;
  let onTime = 0;
  let delayed = 0;
  let cancelled = 0;
  let running = 0;

  schedules.forEach((sch) => {
    const st = normalizeStatus(sch.status);
    if (!st || st === "on time") {
      onTime += 1;
    } else if (st.includes("cancel")) {
      cancelled += 1;
    } else if (st.includes("delay")) {
      delayed += 1;
    } else if (
      st.includes("running") ||
      st.includes("in progress") ||
      st.includes("on route")
    ) {
      running += 1;
    } else {
      onTime += 1;
    }
  });

  const onTimePercent = total ? Math.round((onTime / total) * 100) : 0;

  return (
    <div className="dash-widget-card">
      <div className="dash-widget-header">
        <div className="title-box">
          <FaChartLine className="section-icon" />
          <h3>Network Performance</h3>
        </div>
        <p className="dash-widget-caption">Today</p>
      </div>

      {total === 0 ? (
        <p className="dash-widget-muted">No trips scheduled for today.</p>
      ) : (
        <>
          <div className="performance-main">
            <div className="performance-percentage">
              <span className="performance-value">{onTimePercent}%</span>
              <span className="performance-label">On-time buses</span>
            </div>
            <div className="performance-bar">
              <div
                className="performance-bar-fill"
                style={{ width: `${onTimePercent}%` }}
              />
            </div>
          </div>
          <div className="performance-legend">
            <div className="legend-item">
              <span className="legend-dot ontime" />
              <span>On Time: {onTime}</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot running" />
              <span>Running: {running}</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot delayed" />
              <span>Delayed: {delayed}</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot cancelled" />
              <span>Cancelled: {cancelled}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const AlertsWidget = ({ schedules, loading }) => {
  if (loading) return null;

  const alerts = schedules
    .filter((sch) => {
      const st = normalizeStatus(sch.status);
      return st.includes("delay") || st.includes("cancel");
    })
    .slice(0, 5);

  return (
    <div className="dash-widget-card">
      <div className="dash-widget-header">
        <div className="title-box">
          <FaExclamationTriangle className="section-icon blue-icon" />
          <h3>Alerts & Exceptions</h3>
        </div>
        <p className="dash-widget-caption">Today</p>
      </div>

      {alerts.length === 0 ? (
        <p className="dash-widget-muted">No delays or cancellations detected today.</p>
      ) : (
        <ul className="alerts-list">
          {alerts.map((sch) => {
            const st = normalizeStatus(sch.status);
            const isCancelled = st.includes("cancel");

            return (
              <li key={sch.schedule_id} className="alert-item">
                <div className="alert-main">
                  <span className="alert-route">{sch.route_name}</span>
                  <span className="alert-meta">
                    Bus {sch.bus_number} • {sch.departure_time}
                  </span>
                </div>
                <span
                  className={`alert-status-chip ${
                    isCancelled ? "cancelled" : "delayed"
                  }`}
                >
                  {isCancelled ? "Cancelled" : "Delayed"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const TopRoutesWidget = ({ schedules, loading }) => {
  if (loading) return null;

  const routeMap = new Map();

  schedules.forEach((sch) => {
    const name = sch.route_name || "Unknown Route";
    const st = normalizeStatus(sch.status);
    const key = name;

    if (!routeMap.has(key)) {
      routeMap.set(key, {
        name,
        total: 0,
        delayed: 0,
        cancelled: 0,
      });
    }

    const entry = routeMap.get(key);
    entry.total += 1;
    if (st.includes("delay")) entry.delayed += 1;
    if (st.includes("cancel")) entry.cancelled += 1;
  });

  const topRoutes = Array.from(routeMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return (
    <div className="dash-widget-card">
      <div className="dash-widget-header">
        <div className="title-box">
          <FaRoute className="section-icon blue-icon" />
          <h3>Top Routes Today</h3>
        </div>
        <p className="dash-widget-caption">By number of trips</p>
      </div>

      {topRoutes.length === 0 ? (
        <p className="dash-widget-muted">No trips scheduled for today.</p>
      ) : (
        <table className="top-routes-table">
          <thead>
            <tr>
              <th>Route</th>
              <th>Trips</th>
              <th>Issues</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {topRoutes.map((route) => {
              const issues = route.delayed + route.cancelled;
              const hasIssues = issues > 0;
              const statusText = hasIssues ? "Needs Attention" : "Healthy";
              const statusClass = hasIssues
                ? "status-attention"
                : "status-healthy";

              return (
                <tr key={route.name}>
                  <td>{route.name}</td>
                  <td>{route.total}</td>
                  <td>{issues}</td>
                  <td>
                    <span className={`top-route-status ${statusClass}`}>
                      {statusText}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Dashboard;
