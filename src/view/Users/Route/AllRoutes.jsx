import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiSearch } from 'react-icons/fi';
import { FaBusAlt } from 'react-icons/fa';
import './AllRoute.css';
import { PageHeader, LoadingState, EmptyState } from '../../../Components/ui';
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
                    destination: searchParams.destination,
                };

                const response = await fetch(`${API_BASE_URL}/bus/get_routes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : '',
                    },
                    body: JSON.stringify(requestBody),
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
                console.log("Backend Response:", routesData);

                let allSchedules = [];

                if (Array.isArray(routesData)) {
                    allSchedules = routesData.flatMap((route) => {
                        if (Array.isArray(route.schedules)) {
                            return route.schedules.map((schedule) => ({
                                ...schedule,
                                parentRouteName: route.route_name,
                                parentRouteObj: route,
                            }));
                        }
                        return [];
                    });
                }

                console.log("All Schedules (Extracted):", allSchedules);

                // Filter by selected date if provided
                if (searchParams.date) {
                    try {
                        const searchDateObj = new Date(searchParams.date);
                        if (!isNaN(searchDateObj.getTime())) {
                            const searchDateStr = searchDateObj.toISOString().split('T')[0];

                            allSchedules = allSchedules.filter((item) => {
                                if (!item.date) return true;
                                return (
                                    item.date.startsWith(searchDateStr) ||
                                    item.date.startsWith(searchParams.date)
                                );
                            });
                        }
                    } catch (e) {
                        console.warn('Date filtering error:', e);
                    }
                }

                // Sort routes date-wise and time-wise (earliest first)
                const toDateTime = (sch) => {
                    try {
                        if (sch.date && sch.start_time) {
                            let d = new Date(`${sch.date}T${sch.start_time}`);
                            if (!isNaN(d.getTime())) return d;

                            d = new Date(`${sch.date} ${sch.start_time}`);
                            if (!isNaN(d.getTime())) return d;
                        }

                        if (sch.start_time) {
                            const d = new Date(`1970-01-01T${sch.start_time}`);
                            if (!isNaN(d.getTime())) return d;
                        }

                        if (sch.date) {
                            const d = new Date(sch.date);
                            if (!isNaN(d.getTime())) return d;
                        }
                    } catch (e) {
                        console.warn('DateTime sort error for schedule', sch, e);
                    }
                    return null;
                };

                allSchedules.sort((a, b) => {
                    const da = toDateTime(a);
                    const db = toDateTime(b);

                    if (da && db) return da - db;
                    if (da && !db) return -1;
                    if (!da && db) return 1;
                    return 0;
                });

                // Use backend status as source of truth and format it for display
                const getStatusLabel = (sch) => {
                    const raw = (sch.status || '').trim().toLowerCase();

                    if (!raw && sch.is_reached) return 'Completed';
                    if (!raw) return 'On Time';

                    if (sch.is_reached || raw === 'completed' || raw === 'finished') {
                        return 'Completed';
                    }

                    return raw.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                };

                // Exclude completed routes entirely from the list based on backend flags
                const visibleSchedules = allSchedules.filter((sch) => {
                    const raw = (sch.status || '').toLowerCase();
                    return !sch.is_reached && raw !== 'completed' && raw !== 'finished';
                });

                const mappedSchedules = visibleSchedules.map((sch) => ({
                    id: sch.schedule_id,
                    routeNo: sch.parentRouteName || 'N/A',
                    busName: sch.bus_number || 'Bus Service',
                    departure: extractTime(sch.start_time),
                    arrival: extractTime(sch.end_time),
                    fullDeparture: sch.start_time,
                    fullArrival: sch.end_time,
                    status: getStatusLabel(sch),
                    rawStatus: sch.status || 'on_time',
                    driverName: sch.driver_name || null,
                    date: sch.date || null,
                    parentRouteObj: sch.parentRouteObj,
                    rawSchedule: sch,
                }));

                setSchedules(mappedSchedules);
            } catch (error) {
                console.error('Error fetching routes:', error);
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
        // Pass both the full original schedule and the parent route object (required by BusTracking)
        navigate('/bus_tracking', {
            state: {
                schedule: schedule.rawSchedule || schedule,
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

    // Readable labels for the server's status values.
    const STATUS_TEXT = { on_time: 'On time', running: 'Running', delayed: 'Delayed', cancelled: 'Cancelled', arrived: 'Completed', delayed_completed: 'Completed late' };

    // Maps the display label to a status chip (text label always shown with the colour).
    const chipFor = (status) => {
        const st = String(status || '').replace(/_/g, ' ').toLowerCase();
        if (st === 'delayed completed') return 'delayed_completed';
        if (st === 'arrived' || st === 'completed') return 'completed';
        if (st === 'delayed') return 'delayed';
        if (st === 'cancelled') return 'error';
        if (st === 'completed') return 'completed';
        if (st === 'running') return 'live';
        return 'not_started';
    };

    return (
        <div className="ui-page">
            <PageHeader
                title="Available buses"
                description={
                    searchParams.source || searchParams.destination
                        ? `${searchParams.source || 'Any start'} → ${searchParams.destination || 'Any destination'}`
                        : 'Search for a route to see its buses.'
                }
                actions={
                    <Link to="/live_tracking?view=search" className="ui-btn ui-btn-secondary">
                        <FiSearch aria-hidden="true" /> Change search
                    </Link>
                }
            />

            {loading ? (
                <div className="ui-card ui-card-body"><LoadingState /></div>
            ) : schedules.length > 0 ? (
                <>
                    <p className="ar-count" role="status">{schedules.length} bus{schedules.length > 1 ? 'es' : ''} found. Select one to track it.</p>
                    <ul className="ar-list">
                        {schedules.map((schedule) => (
                            <li key={schedule.id}>
                                <button
                                    type="button"
                                    className="ar-card ui-card"
                                    onClick={() => handleCardClick(schedule)}
                                    disabled={schedule.status === 'Cancelled'}
                                    aria-label={`${schedule.busName}, ${schedule.routeNo}, departs ${schedule.arrival}, ${schedule.status}`}
                                >
                                    <span className="ar-bus">
                                        <span className="ar-bus-icon" aria-hidden="true"><FaBusAlt /></span>
                                        <span>
                                            <span className="ar-bus-number">{schedule.busName}</span>
                                            <span className="ar-meta">{schedule.routeNo}</span>
                                            <span className="ar-meta">
                                                {schedule.date ? formatDate(schedule.date) : formatDate(searchParams.date)}
                                                {schedule.driverName ? ` · ${schedule.driverName}` : ''}
                                            </span>
                                        </span>
                                    </span>
                                    <span className="ar-times">
                                        <span className="ar-time">
                                            <strong>{schedule.arrival}</strong>
                                            <span>Departs</span>
                                        </span>
                                        <span className="ar-duration">
                                            <span>{getDuration(schedule.fullArrival, schedule.fullDeparture)}</span>
                                            <FiArrowRight aria-hidden="true" />
                                        </span>
                                        <span className="ar-time">
                                            <strong>{schedule.departure}</strong>
                                            <span>Arrives</span>
                                        </span>
                                    </span>
                                    <span className={`ui-chip ui-chip-${chipFor(schedule.status)}`}>{STATUS_TEXT[String(schedule.status || '').toLowerCase()] || schedule.status}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </>
            ) : (
                <div className="ui-card">
                    {error ? (
                        <EmptyState title="Search failed">Could not reach the server. Try again in a moment.</EmptyState>
                    ) : (
                        <EmptyState title="No buses found">
                            No upcoming or running buses match this search.
                            <Link to="/live_tracking?view=search" className="ui-btn ui-btn-primary">Search again</Link>
                        </EmptyState>
                    )}
                </div>
            )}
        </div>
    );
};

export default AllRoutes;
