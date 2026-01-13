import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./ShowSchedules.css";
import API_BASE_URL from "../../../utils/config";

const ShowSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");

  // Fetch schedules
  const fetchSchedules = async (filterDate = "") => {
    try {
      setLoading(true);
      let url = `${API_BASE_URL}/bus/schedules`;
      if (filterDate) {
        url += `?date=${filterDate}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setSchedules(data);
      } else {
        toast.error(data.error || "❌ Failed to fetch schedules");
      }
    } catch (err) {
      console.error("Error fetching schedules:", err);
      toast.error("🚨 Server error, try again later");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <div>
          <h1 className="schedule-title">📅 Bus Schedules</h1>
          <p className="schedule-subtitle">View and filter all upcoming and past bus schedules.</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="filter-section">
        <label>Filter by Date: </label>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        <button onClick={() => fetchSchedules(dateFilter)}>Apply</button>
        <button onClick={() => { setDateFilter(""); fetchSchedules(); }}>Reset</button>
      </div>

      {/* Schedules Table */}
      {loading ? (
        <p className="schedule-loading">Loading schedules...</p>
      ) : schedules.length === 0 ? (
        <p className="schedule-empty">No schedules found for the selected date.</p>
      ) : (
        <div className="schedule-table-wrapper">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Route</th>
                <th>Bus</th>
                <th>Driver</th>
                <th>Stop</th>
                <th>Arrival</th>
                <th>Departure</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((sch) => {
                const normalizedStatus = String(sch.status || '')
                  .replace(/_/g, ' ')
                  .toLowerCase();

                const statusClass =
                  normalizedStatus === 'on time'
                    ? 'on_time'
                    : normalizedStatus === 'delayed'
                    ? 'delayed'
                    : normalizedStatus === 'cancelled'
                    ? 'cancelled'
                    : '';

                const statusLabel = normalizedStatus
                  ? normalizedStatus.replace(/\b\w/g, (l) => l.toUpperCase())
                  : 'On Time';

                return (
                  <tr key={sch.schedule_id}>
                    <td>{sch.schedule_id}</td>
                    <td>{sch.route_name}</td>
                    <td>{sch.bus_number}</td>
                    <td>{sch.driver_name}</td>
                    <td>{sch.stop_name}</td>
                    <td>{sch.arrival_time}</td>
                    <td>{sch.departure_time}</td>
                    <td>
                      <span className={`schedule-status ${statusClass}`}>{statusLabel}</span>
                    </td>
                    <td>{sch.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default ShowSchedules;
