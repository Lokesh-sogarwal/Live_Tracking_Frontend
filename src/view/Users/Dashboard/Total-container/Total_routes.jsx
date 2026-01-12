import React, { useEffect, useState } from 'react';
import CountUp from 'react-countup';
import './total.css';
import { useNavigate } from 'react-router-dom';
import { FaRoute } from "react-icons/fa";

const Total_routes = () => {
    const [totalRoutes, setTotalRoutes] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRoutes = async () => {
            try {
                const res = await fetch("/bus/get_all_routes");
                if (res.ok) {
                    const data = await res.json();
                    setTotalRoutes(data.length); 
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchRoutes();
    }, []);

    return (
        <div className="total-card">
            <div className="total-card-header" onClick={() => navigate('/all_routes')}>
                <div><FaRoute /> Routes</div>
                <div>{'>'}</div>
            </div>

            <div className="total-card-count">
                <CountUp end={totalRoutes} duration={2} />
            </div>
            <div className="total-card-subtitle">Total Routes</div>

            <div className="total-card-footer">
                <div>
                   <strong>{2}</strong> Completed
                </div>
                <div>
                  <strong>{18}</strong> In-Progress
                </div>
            </div>
        </div>
    );
};

export default Total_routes;
