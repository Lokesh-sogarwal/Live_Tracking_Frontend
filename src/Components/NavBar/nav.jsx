import React, { useState, useEffect } from 'react';
import './nav.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { FaHome, FaAngleRight, FaRegBell, FaUserCircle } from "react-icons/fa";
import { CiSearch } from "react-icons/ci";
import DropButton from '../dropdown-Button/dropdown';
import { io } from "socket.io-client";
import API_BASE_URL from "../../utils/config";

const Nav = () => {
    const token = localStorage.getItem('token');
    const navigate = useNavigate();
    const location = useLocation();
    const [userName, setUserName] = useState("Guest");
    const [userRole, setUserRole] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Prefer full name from backend token payload
                const fullName = decoded.fullname || decoded.full_name || decoded.name || decoded.user_fullname;
                if (fullName && typeof fullName === 'string') {
                    setUserName(fullName);
                } else {
                    setUserName("User");
                }
                
                
                if (decoded.role) setUserRole(decoded.role);

                // Fetch Initial Notification Count
                fetchNotificationsCount(token);
                
                // Initialize Socket for real-time count updates
                const user_uuid = decoded.user_uuid || decoded.user_id || decoded.sub;
                if(user_uuid) {
                    const socket = io(API_BASE_URL, { transports: ["websocket"] });
                    socket.on("connect", () => {
                        socket.emit("join_notifications", { user_uuid });
                    });

                    socket.on("new_notification", () => {
                        setUnreadCount(prev => prev + 1);
                    });

                    return () => socket.disconnect();
                }

            } catch (err) {
                console.error("Invalid token:", err);
            }
        }
    }, [token]);

    const fetchNotificationsCount = async (authToken) => {
        try {
            const res = await fetch(`${API_BASE_URL}/view/notifications`, {
                headers: { "Authorization": "Bearer " + authToken }
            });
            const data = await res.json();
            if (res.ok) {
                // If the API doesn't have an "unread" flag, we count all.
                // Or if it returns { notifications: [], unread: 5 }, use that.
                // Assuming list of notifications, checking for 'is_read' or reading all as unread if not present.
                const list = Array.isArray(data) ? data : (data.notifications || []);
                const unread = list.filter(n => !n.is_read).length; // Adjust logic if needed
                setUnreadCount(unread > 0 ? unread : 0);
            }
        } catch (error) {
           console.error("Failed to fetch notification count");
        }
    };

    // Breadcrumb Logic
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbPaths = pathSegments.map((seg, idx) => {
        return {
            name: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/_/g, ' '),
            path: '/' + pathSegments.slice(0, idx + 1).join('/')
        };
    });
    const isDashboard = location.pathname === "/dashboard" || location.pathname === "/";

    return (
        <div className="navbar-wrapper">
            <div className="navbar-glass">
                
                {/* Left Section: Breadcrumbs */}
                <div className="navbar-left">
                    <div className="breadcrumb-container">
                        <span 
                            className={`breadcrumb-item ${isDashboard ? 'active' : ''}`} 
                            onClick={() => navigate('/')}
                        >
                            <FaHome className="home-icon" /> 
                            <span className="breadcrumb-text">Home</span>
                        </span>
                        
                        {!isDashboard && breadcrumbPaths.map((seg, i) => (
                            <React.Fragment key={i}>
                                <FaAngleRight className="breadcrumb-separator" />
                                <span 
                                    className={`breadcrumb-item ${i === breadcrumbPaths.length - 1 ? 'active' : ''}`}
                                    onClick={() => navigate(seg.path)}
                                >
                                    {seg.name}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Right Section: Search, Notifs, Profile */}
                <div className="navbar-right">
                    
                    {/* Search Bar (Visual Only for now) */}
                    <div className="nav-search">
                        <CiSearch className="search-icon" />
                        <input type="text" placeholder="Search..." />
                    </div>

                    {/* Notification Icon */}
                    <div className="icon-btn" onClick={() => navigate('/notifications')}>
                        <FaRegBell />
                        {unreadCount > 0 && <span className="notification-dot">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    </div>

                    {/* Divider */}
                    <div className="nav-divider"></div>

                    {/* User Profile Area */}
                    <div className="user-profile-nav">
                        <div className="user-info">
                            <span className="user-name">{userName}</span>
                            <span className="user-role">{userRole}</span>
                        </div>
                        <div className="profile-dropdown-wrapper">
                             <DropButton />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Nav;
