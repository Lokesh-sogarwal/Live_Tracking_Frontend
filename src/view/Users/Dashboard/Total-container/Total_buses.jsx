import React, { useEffect, useState } from 'react';
import CountUp from 'react-countup';
import './total.css';
import { useNavigate } from 'react-router-dom';
import { FaBus } from "react-icons/fa"; // ✅ Bus icon

const Total_Buses = () => {
  const [totalBuses, setTotalBuses] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0); // optional if you want to show active users still
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("http://localhost:5000/data/get_data", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          credentials: "include",
        });

        if (!res.ok) {
          const error = await res.json();
          console.error("Error fetching total buses:", error);
          return;
        }

        const rawData = await res.json();
        console.log("Fetched data:", rawData);

        // ✅ Access the total_buses field returned by Flask
        setTotalBuses(rawData.total_buses || 0);

      } catch (error) {
        console.error("Fetch error:", error);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="total-card">
      {/* Header */}
      <div className="total-card-header" onClick={() => navigate('/buses')}>
        <div><FaBus /> Buses</div>
        <div>{'>'}</div>
      </div>

      {/* Count */}
      <div className="total-card-count">
        <CountUp end={totalBuses} duration={2.5} />
      </div>
      <div className="total-card-subtitle">Total Buses</div>

      {/* Footer */}
      <div className="total-card-footer">
        <div><strong>{totalBuses}</strong> Registered</div>
      </div>
    </div>
  );
};

export default Total_Buses;
