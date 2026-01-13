import React, { useState, useEffect } from "react";
import "./notification.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import API_BASE_URL from "../../../utils/config";
import { useNavigate } from "react-router-dom";

const Notification = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all"); 
    const navigate = useNavigate();

    // Restrict Reload
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                toast.error("Please log in to view notifications");
                setLoading(false);
                return;
            }

            const res = await fetch(`${API_BASE_URL}/view/notifications`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                credentials: "include"
            });

            const data = await res.json();
            if (res.ok) {
                // If data is an array, set it directly. 
                // If nested (e.g. data.notifications), handle that.
                const notifList = Array.isArray(data) ? data : (data.notifications || []);
                setNotifications(notifList);
            } else {
                console.error("Failed to fetch notifications:", data.error);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAllRead = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            // Optimistic update
            setNotifications(prev => prev.map(n => ({...n, is_read: true})));

            await fetch(`${API_BASE_URL}/view/notifications/mark_read_all`, {
                method: "POST",
                headers: {
                     "Authorization": "Bearer " + token,
                     "Content-Type": "application/json"
                }
            });
            toast.success("All notifications marked as read");
        } catch (e) {
            console.error(e);
        }
    }

    const handleNotificationClick = async (notif) => {
        if (!notif.is_read) {
            // Mark individual as read (optional)
        }

        if (notif.type === "message" || notif.title === "New Message") {
            // Assuming payload contains sender_id or similar. 
            // If backend provides sender_id in notif:
            const list = Array.isArray(notifications) ? notifications : [];
            // If we don't have the ID, we might just go to chat
            const senderId = notif.related_id || notif.sender_id; 
            if (senderId) {
                navigate('/chat', { state: { selectedUserId: senderId } });
            } else {
                navigate('/chat');
            }
        }
    };

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            return date.toLocaleString(); 
        } catch (e) {
            return dateString;
        }
    };

    const filteredNotifications = notifications.filter(notif => {
        if (filter === "unread") return !notif.is_read;
        return true;
    });

    const newCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="notification-page">
            <ToastContainer />
            <div className="notification-container">
                <div className="notif-header">
                    <h2>Notifications</h2>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                        <span className="badge">{newCount} New</span>
                        {newCount > 0 && <button onClick={markAllRead} style={{fontSize: '0.8rem', padding: '4px 10px', cursor: 'pointer', background: 'transparent', border: '1px solid #6366f1', color: '#6366f1', borderRadius: '4px'}}>Mark all read</button>}
                    </div>
                </div>

                <div className="filter-tabs" style={{marginBottom: "20px", display: "flex", gap: "10px"}}>
                    <button 
                        onClick={() => setFilter("all")}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "20px",
                            border: "none",
                            background: filter === "all" ? "#6366f1" : "white",
                            color: filter === "all" ? "white" : "#666",
                            cursor: "pointer",
                            fontWeight: "bold"
                        }}
                    >
                        All
                    </button>
                    <button 
                         onClick={() => setFilter("unread")}
                         style={{
                            padding: "8px 16px",
                            borderRadius: "20px",
                            border: "none",
                            background: filter === "unread" ? "#6366f1" : "white",
                            color: filter === "unread" ? "white" : "#666",
                            cursor: "pointer",
                            fontWeight: "bold"
                        }}
                    >
                        Unread
                    </button>
                </div>
                
                <div className="notif-list">
                    {loading ? (
                        <p style={{textAlign: "center", padding: "20px"}}>Loading notifications...</p>
                    ) : filteredNotifications.length === 0 ? (
                        <p style={{textAlign: "center", padding: "20px", color: "#666"}}>
                           {filter === "unread" ? "No unread notifications." : "No notifications found."}
                        </p>
                    ) : (
                        filteredNotifications.map((notif) => (
                            <div 
                                key={notif.id || Math.random()} 
                                className={`notif-item ${notif.type || 'info'} ${!notif.is_read ? 'unread-item' : ''}`}
                                onClick={() => handleNotificationClick(notif)}
                                style={{cursor: notif.type === "message" ? "pointer" : "default"}}
                            >
                                <div className="notif-icon">
                                    {notif.type === "alert" && "🚨"}
                                    {notif.type === "info" && "ℹ️"}
                                    {notif.type === "success" && "✅"}
                                    {notif.type === "warning" && "⚠️"}
                                    {!notif.type && "📌"}
                                </div>
                                <div className="notif-content">
                                    <h4>{notif.type ? notif.type.charAt(0).toUpperCase() + notif.type.slice(1) : "Notification"}</h4>
                                    <p>{notif.message}</p>
                                    <span className="notif-time">{notif.timestamp ? formatDate(notif.timestamp) : ""}</span>
                                </div>
                                {!notif.is_read && <div style={{width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", marginLeft: "auto"}}></div>}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notification;
