import React, { useState, useEffect } from "react";
import "./notification.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Notification = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                toast.error("Please log in to view notifications");
                setLoading(false);
                return;
            }

            const res = await fetch("/view/notifications", {
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

    return (
        <div className="notification-page">
            <ToastContainer />
            <div className="notification-container">
                <div className="notif-header">
                    <h2>Notifications</h2>
                    <span className="badge">{notifications.length} New</span>
                </div>
                
                <div className="notif-list">
                    {loading ? (
                        <p style={{textAlign: "center", padding: "20px"}}>Loading notifications...</p>
                    ) : notifications.length === 0 ? (
                        <p style={{textAlign: "center", padding: "20px", color: "#666"}}>No new notifications.</p>
                    ) : (
                        notifications.map((notif) => (
                            <div key={notif.id || Math.random()} className={`notif-item ${notif.type || 'info'}`}>
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
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notification;
