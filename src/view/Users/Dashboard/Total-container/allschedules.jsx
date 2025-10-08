import React, { useEffect, useState } from "react";
import "./all.css";

const AllSchedules = ({ selectedDate }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem("token");

    fetch("http://localhost:5000/bus/schedules", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch schedules");
        return res.json();
      })
      .then((data) => {
        setSchedules(data || []);
      })
      .catch((err) => {
        console.error("❌ Error fetching schedules:", err);
        setError("Failed to load schedules.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Loading schedules...</p>;
  if (error) return <p className="error">{error}</p>;

  // Filter schedules based on selected date OR current date
  const todayStr = new Date().toDateString();
  const filteredSchedules = schedules.filter(
    (sch) =>
      sch.date &&
      (new Date(sch.date).toDateString() === selectedDate.toDateString() ||
       new Date(sch.date).toDateString() === todayStr)
  );

  return (
    <div className="schedule-card">
      <div className="schedule-header">
        <h3>Schedules</h3>
        <button
          className="refresh-btn"
          onClick={() => window.location.reload()}
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
              {filteredSchedules.map((sch) => (
                <tr
                  key={sch.schedule_id}
                  className={
                    selectedDate &&
                    sch.date &&
                    new Date(sch.date).toDateString() ===
                      selectedDate.toDateString()
                      ? "highlight-row"
                      : ""
                  }
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AllSchedules;
