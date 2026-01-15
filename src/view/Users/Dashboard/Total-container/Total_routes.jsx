import React, { useEffect, useState } from 'react';
import CountUp from 'react-countup';
import './total.css';
import { useNavigate } from 'react-router-dom';
import { FaRoute } from "react-icons/fa";
import API_BASE_URL from "../../../../utils/config";


const Total_routes = () => {
    const [totalRoutes, setTotalRoutes] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRoutes = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/data/get_routes`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + localStorage.getItem("token"),
                    },
                    credentials: "include",
                });
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
