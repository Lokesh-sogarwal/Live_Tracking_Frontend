import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "../../../Components/Static/setting";
import "./setting.css";
import profileimg from "../../../Assets/male-avatar-boy-face-man-user-9-svgrepo-com.svg";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Setting = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    const [user, setUser] = useState({ fullname: "", email: "", role: "" });

    const fetchUserData = async () => {
        try {
            const res = await fetch("http://localhost:5001/data/get_data", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token,
                },
                credentials: "include",
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "API Error");

            const name = data.users?.[0]?.fullname || "";

            setUser({
                fullname: name,
                email: data.users?.[0]?.email || "",
                role: data.users?.[0]?.role || "",
            });

        } catch (err) {
            toast.error("Failed to load profile!");
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    const handleClick = (item) => {
        console.log("Clicked on:", item.title);

        // ✅ Run logout if action exists
        if (item.action) {
            item.action(token); // ✅ CALL LOGOUT API
            return;
        }

        // ✅ Otherwise navigate to path
        if (item.link) {
            navigate(item.link);
        }
    };


    return (
        <div className="layout"> {/* ✅ left-right layout wrapper */}

            {/* ===== LEFT MENU ===== */}
            <div className="setting_container">
                {Settings.map((item) => (
                    <div
                        className="setting_item"
                        key={item.id}
                        onClick={() => handleClick(item)}
                        style={item.title === "Logout" ? { color: "red" } : {}}  // ✅ valid conditional style
                    >
                        <span className="setting_icon">{item.icon}</span>
                        <span className="setting_title">{item.title}</span>
                    </div>
                ))}
            </div>


            {/* ===== RIGHT PROFILE CARD ===== */}
            <div className="photo_card">
                <img src={profileimg} alt="Profile" />
                <p className="profile-name">{user.fullname || "-"}</p>

                {/* ✅ GitHub Style Active Pill */}
                <div className="github-active-pill">
                    <span className="status-dot"></span>
                    <div className="text-group">
                        <span className="status-text">Active Now</span>
                        <span className="status-sub">Online</span>
                    </div>
                </div>

            </div>

            <ToastContainer /> {/* Toast support */}

        </div>
    );
};
export default Setting;
