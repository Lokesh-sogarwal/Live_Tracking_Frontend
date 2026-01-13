import React, { useEffect } from 'react';
import Layout from '../Layout/Layout';
import { Routes, Route } from "react-router-dom";
import { userRoutes } from "../../routes/mainRoutes";
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import API_BASE_URL from "../../utils/config";

const MainContainer = () => {
    // Socket Listener for Notifications
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        let user_uuid = null;
        try {
            const decoded = jwtDecode(token);
            // Assuming the token contains user_uuid or user_id
            user_uuid = decoded.user_uuid || decoded.user_id || decoded.sub;
        } catch (e) {
            console.error("Failed to decode token for notifications:", e);
            return;
        }

        if (user_uuid) {
            const socket = io(API_BASE_URL, {
                transports: ["websocket"]
            });

            socket.on("connect", () => {
                // Join the room identified by user_uuid
                socket.emit("join_notifications", { user_uuid });
            });

            socket.on("new_notification", (data) => {
                console.log("New Alert:", data.message);
                toast.info(data.message || "New Notification Received!", {
                    position: "top-right",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                });
            });

            return () => {
                socket.disconnect();
            };
        }
    }, []);

    console.log(userRoutes);
  return (
    <Layout>
      <Routes>
        {userRoutes.map((item) => (
          <Route key={item.id} path={item.path} element={item.element} />
        ))}
      </Routes>
    </Layout>
  );
};

export default MainContainer;
