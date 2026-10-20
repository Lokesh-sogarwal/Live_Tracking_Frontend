import React, { useEffect, useState } from "react";
import "./all.css";
import API_BASE_URL from "../../../../utils/config";

import { toLocalYYYYMMDD } from "../../../../utils/dates";

const AllSchedules = ({ selectedDate }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const toYYYYMMDD = (d) => (d ? toLocalYYYYMMDD(d) : "");


  const fetchSchedules = async () => {
    setLoading(true);
    setError(null);

    try {
      const date = toYYYYMMDD(selectedDate) || toYYYYMMDD(new Date());
      const url = `${API_BASE_URL}/bus/schedules?date=${encodeURIComponent(date)}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch schedules");
      }
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Error fetching schedules:", err);
      setError("Failed to load schedules.");
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchSchedules();
  }, [selectedDate]);

  if (loading) return <p className="loading">Loading schedules...</p>;
  if (error) return <p className="error">{error}</p>;

  const selectedYYYYMMDD = toYYYYMMDD(selectedDate) || toYYYYMMDD(new Date());
  const filteredSchedules = schedules.filter((sch) => {
    if (!sch?.date) return false;
    return String(sch.date).slice(0, 10) === selectedYYYYMMDD;
  });

  return (
    <div className="schedule-card">
      <div className="schedule-header">
        <h3>Schedules</h3>
        <button
          className="refresh-btn"
          onClick={() => fetchSchedules()}
        >
          ⟳ Refresh
        </button>
      </div>

      <div className="dash-schedule-table-container">
        {filteredSchedules.length === 0 ? (
          <p className="no-data">No schedules available.</p>
        ) : (
          <table className="schedule-table">
            <thead>
              <tr>
                
                <th>Route</th>
                <th>Bus Number</th> 
                <th>Arrival</th>
                <th>Departure</th>
                <th>Status</th>
                <th>Date</th>
                <th>Reached</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.map((sch) => {
                return (
                  <tr
                    key={sch.schedule_id}
                    className={String(sch?.date || "").slice(0, 10) === selectedYYYYMMDD ? "highlight-row" : ""}
                  >
                  
                  <td>{sch.route_name}</td>
                  <td>{sch.bus_number}</td>
                  <td>{sch.arrival_time}</td>
                  <td>{sch.departure_time}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        sch.status === "on_time"
                          ? "status-green"
                          : sch.status === "delayed"
                          ? "status-red"
                          : "status-gray"
                      }`}
                    >
                      {sch.status}
                    </span>
                  </td>
                  <td>{sch.date}</td>
                  <td>{sch.is_reached ? "✅" : "❌"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AllSchedules;
