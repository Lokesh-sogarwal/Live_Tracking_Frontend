import React, { useEffect, useState } from 'react';
import CountUp from 'react-countup';
import './total.css';
import { useNavigate } from 'react-router-dom';
import { FaUserFriends } from "react-icons/fa";

const Total_Users = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
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
          console.error("Error fetching total users:", error);
          return;
        }

        const rawData = await res.json();
        console.log("Fetched data:", rawData);

        setTotalUsers(rawData.total_users || 0);
        setActiveUsers(rawData.total_active_users || 0);

      } catch (error) {
        console.error("Fetch error:", error);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="total-card">
      {/* Header */}
      <div className="total-card-header" onClick={() => navigate('/users')}>
        <div><FaUserFriends /> Users</div>
        <div>{'>'}</div>
      </div>

      {/* Count */}
      <div className="total-card-count">
        <CountUp end={totalUsers} duration={2.5} />
      </div>
      <div className="total-card-subtitle">Total Users</div>

      {/* Footer */}
      <div className="total-card-footer">
        {/* Active Users */}
        <div 
          onClick={() => navigate('/active_users')} 
          style={{ cursor: 'pointer' }}
        >
          <strong>{activeUsers}</strong> Active
        </div>

        {/* Non-Active Users */}
        <div 
          onClick={() => navigate('/inactive_users')} 
          style={{ cursor: 'pointer' }}
        >
          <strong>{totalUsers - activeUsers}</strong> Non-Active
        </div>
      </div>
    </div>
  );
};

export default Total_Users;
