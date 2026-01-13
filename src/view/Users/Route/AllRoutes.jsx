import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './AllRoute.css';
import Navbar from '../../../Components/NavBar/nav';
import API_BASE_URL from '../../../utils/config';

const AllRoutes = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const searchParams = location.state || {}; 
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSchedules = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const token = localStorage.getItem("token");
                const requestBody = {
                    starting_point: searchParams.source,
                    destination: searchParams.destination
                };

                const response = await fetch(`${API_BASE_URL}/bus/get_routes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify(requestBody)
                });
                console.log("Response Status:", response.status);
                console.log("Response Headers:", [...response.headers.entries()]);

                if (response.status === 404) {
                    setSchedules([]);
                    return;
                }

                if (!response.ok) {
                    throw new Error('Failed to fetch routes');
                }

                const routesData = await response.json();
                console.log("Backend Response:", routesData); // Debug log

                // The backend returns a list of routes, each containing a 'schedules' array.
                // We need to flatten this to get a single list of all available bus schedules.
                
                let allSchedules = [];

                if (Array.isArray(routesData)) {
                    allSchedules = routesData.flatMap(route => {
                        if (Array.isArray(route.schedules)) {
                            return route.schedules.map(schedule => ({
                                ...schedule,
                                parentRouteName: route.route_name, // Attach route name to schedule
                                parentRouteObj: route // Store the full route object for tracking
                            }));
                        }
                        return [];
                    });
                }

                console.log("All Schedules (Extracted):", allSchedules); // Debug log

                // Client-side filtering for Date
                if (searchParams.date) {
                    try {
                        // Create a normalized string for comparison (YYYY-MM-DD)
                        const searchDateObj = new Date(searchParams.date);
                        // Check if valid date
                        if (!isNaN(searchDateObj.getTime())) {
                             // Use local date string comparison to avoid timezone shifts
                            const searchDateStr = searchDateObj.toISOString().split('T')[0];
                            
                            allSchedules = allSchedules.filter(item => {
                                if (!item.date) return true; 
                                // Backend returns "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS"
                                return item.date.startsWith(searchDateStr) || 
                                       item.date.startsWith(searchParams.date); 
                            });
                        }
                    } catch (e) {
                        console.warn("Date filtering error:", e);
                    }
                }

                // Map to UI format
                // Backend returns status like "on_time", we format it for display
                const formatStatus = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'On Time';

                const mappedSchedules = allSchedules.map(sch => ({
                    id: sch.schedule_id,
                    routeNo: sch.parentRouteName || 'N/A', // From the parent route object
                    busName: sch.bus_number || 'Bus Service',
                    departure: extractTime(sch.departure_time),
                    arrival: extractTime(sch.arrival_time),
                    fullDeparture: sch.departure_time, // Keep full string for duration calc
                    fullArrival: sch.arrival_time,     // Keep full string for duration calc
                    price: sch.price || 44, // Default price 
                    status: formatStatus(sch.status), // Format "on_time" -> "On Time"
                    rawStatus: sch.status || 'on_time', // Keep raw for styling class
                    type: 'AC Seater' // Default type
                }));

                setSchedules(mappedSchedules);

            } catch (error) {
                console.error("Error fetching routes:", error);
                setError(error.message);
                setSchedules([]);
            } finally {
                setLoading(false);
            }
        };

        if (searchParams.source || searchParams.destination) {
            fetchSchedules();
        } else {
            setLoading(false);
            setSchedules([]);
        }

    }, [searchParams.date, searchParams.source, searchParams.destination]);

    // Helper to extract HH:MM AM/PM from timestamp string
    const extractTime = (dateStr) => {
        if (!dateStr) return '--:--';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr; // Return as is if not a valid date
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return dateStr;
        }
    };

    const getDuration = (startStr, endStr) => {
        if (!startStr || !endStr) return '--';
        try {
            const start = new Date(startStr);
            const end = new Date(endStr);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return '--';

            let diffMs = end - start;
            if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000; // Handle overnight if dates are just times (rare with full dates)
            
            const diffMin = Math.floor(diffMs / 1000 / 60);
            const h = Math.floor(diffMin / 60);
            const m = diffMin % 60;
            return `${h}h ${m}m`;
        } catch (e) {
            return '--';
        }
    };

    const handleCardClick = (schedule) => {
        if (schedule.status === 'Cancelled') return;
        console.log("Navigating to bus tracking with schedule:", schedule);
        // Pass both the schedule and the parent route object (required by BusTracking)
        navigate('/bus_tracking', { 
            state: { 
                schedule: schedule, 
                route: schedule.parentRouteObj,
                ...searchParams 
            } 
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Date Not Selected';
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const getStatusTagClass = (status) => {
        // Normalize status string: replace underscores with spaces, lower case
        const normalizedStatus = status?.replace(/_/g, ' ').toLowerCase();
        
        switch (normalizedStatus) {
            case 'on time': return 'on_time';
            case 'delayed': return 'delayed';
            case 'cancelled': return 'cancelled';
            default: return '';
        }
    };

    return (
        <div className="main-container">
            <div className="routes-container">
                {/* Header Info Card */}
                <div className="route-info">
                    <div className="route-info-item">
                        <span className="route-info-label">From</span>
                        <span className="route-info-value">{searchParams.source || '...'}</span>
                    </div>
                    {/* Arrow Divider */}
                    <div style={{ color: '#cbd5e1' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </div>
                    <div className="route-info-item">
                        <span className="route-info-label">To</span>
                        <span className="route-info-value">{searchParams.destination || '...'}</span>
                    </div>
                    <div className="route-info-item">
                        <span className="route-info-label">Journey Date</span>
                        <span className="route-info-value">{formatDate(searchParams.date)}</span>
                    </div>
                    <div className="route-info-item">
                        <span className="route-info-label">Total Buses</span>
                        <span className="route-info-value">{loading ? '...' : schedules.length}</span>
                    </div>
                </div>

                {/* List View of Schedules */}
                {loading ? (
                    <div className="no-route" style={{ textAlign: 'center', marginTop: '50px', color: '#64748b' }}>
                        <h3>Loading routes...</h3>
                    </div>
                ) : schedules.length > 0 ? (
                    <div className="schedule-cards">
                        {schedules.map((schedule) => (
                            <div
                                key={schedule.id}
                                className="schedule-card"
                                onClick={() => handleCardClick(schedule)}
                            >
                                {/* Left: Bus Info */}
                                <div className="card-left">
                                    <div className="bus-icon-container">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M8 6v6" /><path d="M15 6v6" /><path d="M2 12h19.6" />
                                            <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" />
                                            <circle cx="7" cy="18" r="2" /><path d="M9 18h5" /><circle cx="16" cy="18" r="2" />
                                        </svg>
                                    </div>
                                    <div className="bus-details">
                                        <h3>{schedule.busName}</h3>
                                        <span className="bus-type">{schedule.type} • Route {schedule.routeNo}</span>
                                    </div>
                                </div>

                                {/* Center: Timing */}
                                <div className="card-center">
                                    <div className="time-group">
                                        <span className="time">{schedule.departure}</span>
                                        <span className="time-label">Departure</span>
                                    </div>
                                    <div className="duration-visual">
                                        <span className="time-label">{getDuration(schedule.fullDeparture, schedule.fullArrival)}</span>
                                        <div className="visual-line"></div>
                                    </div>
                                    <div className="time-group">
                                        <span className="time">{schedule.arrival}</span>
                                        <span className="time-label">Arrival</span>
                                    </div>
                                </div>

                                {/* Right: Price & Status */}
                                <div className="card-right">
                                    <div className="price">₹{schedule.price}</div>
                                    <div className={`status-badge ${getStatusTagClass(schedule.status)}`}>
                                        {schedule.status}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-route" style={{ textAlign: 'center', marginTop: '50px', color: '#64748b' }}>
                        <h3>{error ? 'Search Failed' : 'No buses found'}</h3>
                        <p>{error ? 'Unable to connect to the server.' : 'We couldn\'t find any buses for your search criteria.'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AllRoutes;
