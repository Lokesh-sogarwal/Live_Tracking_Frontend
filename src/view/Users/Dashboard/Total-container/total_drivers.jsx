import React, { useEffect, useState } from 'react';
import CountUp from 'react-countup';
import './total.css';
import { useNavigate } from 'react-router-dom';
import { FaIdCard } from "react-icons/fa";

const Total_Drivers = () => {
  const [totalDrivers, setTotalDrivers] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/data/get_data", {
           headers: { Authorization: "Bearer " + localStorage.getItem("token") }
        });
        const data = await res.json();
        setTotalDrivers(data.total_drivers || 0);
      } catch (err) { }
    }
    fetchData();
  }, []);

  return (
    <div className="total-card">
      <div className="total-card-header" onClick={() => navigate('/drivers')}>
        <div><FaIdCard /> Drivers</div>
        <div>{'>'}</div>
      </div>
      <div className="total-card-count">
        <CountUp end={totalDrivers} duration={2} />
      </div>
      <div className="total-card-subtitle">Total Drivers</div>

      <div className="total-card-footer">
        <div><strong>{totalDrivers}</strong> Active</div>
        <div><strong>0</strong> On-Leave</div>
      </div>
    </div>
  );
};
export default Total_Drivers;
