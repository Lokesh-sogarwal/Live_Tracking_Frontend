import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { FaRegBell } from "react-icons/fa";
import { FiMenu, FiChevronRight } from "react-icons/fi";
import { io } from "socket.io-client";
import DropButton from '../dropdown-Button/dropdown';
import API_BASE_URL from "../../utils/config";
import { usePermissions } from "../../context/PermissionsContext";
import { allowed } from "../../utils/access";
import { NAV_SECTIONS, PAGE_TITLES, PAGE_PARENTS } from "../Static/SideItems";
import './nav.css';

// Detail pages end in a numeric id (/Feedbacks/12): titled by "<base>/:id", parent = list page.
const detailBase = (path) => (/\/\d+$/.test(path) ? path.replace(/\/\d+$/, '') : null);

const titleFor = (path) =>
  (detailBase(path) && PAGE_TITLES[`${detailBase(path)}/:id`]) ||
  PAGE_TITLES[path] ||
  path.split('/').filter(Boolean).pop()?.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) ||
  'Dashboard';

// Number of unread notifications for the signed-in user (null if the request fails).
const fetchUnreadCount = async (authToken) => {
    try {
        const res = await fetch(`${API_BASE_URL}/view/notifications`, {
            headers: { "Authorization": "Bearer " + authToken }
        });
        if (!res.ok) return null;
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.notifications || []);
        return list.filter(n => !n.is_read).length;
    } catch {
        return null;
    }
};

const ruleForPath = (path) => NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.link === path)?.rule;

const Nav = ({ onOpenMenu }) => {
    const token = localStorage.getItem('token');
    const location = useLocation();
    const { can, role } = usePermissions();
    const [userName, setUserName] = useState("User");
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!token) return undefined;
        try {
            const decoded = jwtDecode(token);
            const fullName = decoded.fullname || decoded.full_name || decoded.name || decoded.user_fullname;
            setUserName(fullName && typeof fullName === 'string' ? fullName : "User");

            // Real-time count updates
            const user_uuid = decoded.user_uuid || decoded.user_id || decoded.sub;
            if (user_uuid) {
                const socket = io(API_BASE_URL, { transports: ["websocket"], auth: { token } });
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
        return undefined;
    }, [token]);

    // Initial count, refreshed on navigation (the notifications page marks items read).
    useEffect(() => {
        if (!token) return undefined;
        let active = true;
        fetchUnreadCount(token).then((n) => {
            if (active && n !== null) setUnreadCount(n);
        });
        return () => {
            active = false;
        };
    }, [location.pathname, token]);

    const path = location.pathname;
    const title = titleFor(path);
    const base = detailBase(path);
    const parent = base ? PAGE_PARENTS[base] || base : PAGE_PARENTS[path];
    const parentRule = parent && ruleForPath(parent);
    const showParent = parent && (!parentRule || allowed(parentRule, can, role));
    const canSeeNotifications = allowed('notifications', can, role);

    return (
        <header className="topbar">
            <div className="topbar-left">
                <button type="button" className="ui-icon-btn topbar-menu-btn" onClick={onOpenMenu} aria-label="Open navigation menu">
                    <FiMenu />
                </button>
                <div className="topbar-heading">
                    <nav aria-label="Breadcrumb" className="topbar-breadcrumb">
                        <Link to="/dashboard">Home</Link>
                        {showParent && (
                            <>
                                <FiChevronRight aria-hidden="true" />
                                <Link to={parent}>{titleFor(parent)}</Link>
                            </>
                        )}
                        {path !== '/dashboard' && (
                            <>
                                <FiChevronRight aria-hidden="true" />
                                <span aria-current="page">{title}</span>
                            </>
                        )}
                    </nav>
                    <h1 className="topbar-title">{title}</h1>
                </div>
            </div>

            <div className="topbar-right">
                {canSeeNotifications && (
                    <Link
                        to="/notifications"
                        className="ui-icon-btn"
                        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                        title="Notifications"
                    >
                        <FaRegBell />
                        {unreadCount > 0 && <span className="topbar-dot">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    </Link>
                )}
                <div className="topbar-divider" aria-hidden="true" />
                <div className="topbar-user">
                    <span className="topbar-user-name">{userName}</span>
                    {role && <span className="topbar-user-role">{role}</span>}
                </div>
                <DropButton userName={userName} />
            </div>
        </header>
    );
};

export default Nav;
