import React, { useEffect, useState } from 'react';
import CountUp from 'react-countup';
import './total.css';
import { useNavigate } from 'react-router-dom';
import { FaBus } from "react-icons/fa";

const Allbuses = () => {
    const [totalBuses, setTotalBuses] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBuses = async () => {
            try {
                const res = await fetch("/bus/get_all_buses");
                const data = await res.json();
                setTotalBuses(data.length);
            } catch (err) {}
        };
        fetchBuses();
    }, []);

    return (
        <div className="total-card">
            <div className="total-card-header" onClick={() => navigate('/bus_details')}>
                <div><FaBus /> Buses</div>
                <div>{'>'}</div>
            </div>
            
            <div className="total-card-count">
                <CountUp end={totalBuses} duration={2} />
            </div>
            <div className="total-card-subtitle">Total Buses</div>

            <div className="total-card-footer">
                <div><strong>{totalBuses}</strong> Registered</div>
                <div><strong>0</strong> Maintenance</div>
            </div>
        </div>
    );
};
export default Allbuses;
