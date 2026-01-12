import React, { useState, useEffect } from 'react';
import './nav.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { FaHome, FaAngleRight, FaRegBell, FaUserCircle } from "react-icons/fa";
import { CiSearch } from "react-icons/ci";
import DropButton from '../dropdown-Button/dropdown';

const Nav = () => {
    const token = localStorage.getItem('token');
    const navigate = useNavigate();
    const location = useLocation();
    const [userName, setUserName] = useState("Guest");
    const [userRole, setUserRole] = useState("");

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Adjust keys based on your actual token payload
                if (decoded.fullname) setUserName(decoded.fullname);
                else setUserName("User");
                
                if (decoded.role) setUserRole(decoded.role);
            } catch (err) {
                console.error("Invalid token:", err);
            }
        }
    }, [token]);

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
                        <span className="notification-dot"></span>
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
