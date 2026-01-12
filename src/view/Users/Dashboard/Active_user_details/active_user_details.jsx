import React, { useEffect, useState } from "react";
import './a_user.css';
import myimage from '../../../../Assets/male-avatar-boy-face-man-user-9-svgrepo-com.svg';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/auth/get_data", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          credentials: "include",
        });

        if (!res.ok) {
          const error = await res.json();
          console.error("Error fetching users:", error);
          return;
        }

        const rawData = await res.json();
        console.log("Users fetched successfully:", rawData);

        setUsers(rawData[0]);      // all users
        setActiveUsers(rawData[3]); // active users
      } catch (error) {
        console.error("Fetch error:", error);
      }
    }

    fetchData();
  }, []);

  // ✅ Use emails instead of IDs for quick lookup
  const activeUserEmails = new Set(activeUsers.map((user) => user.email));

  return (
    <div className="users-container">
      <h2 id="users-title">All Users</h2>
      <ul className="users-list">
        {users.map((user) => (
          <li
            key={user.id}
            className={`user-item ${activeUserEmails.has(user.email) ? "user-active" : "user-inactive"}`}
          >
            <div className="user-header">
                <div className="img-cont">
                <img src={myimage} alt="" />
                </div>
              <span className="user-name">{user.fullname}</span>
              <span className="user-status">
                {activeUserEmails.has(user.email) ? "🟢 Active" : "⚫ Inactive"}
              </span>
            </div>
            <div className="user-details">
              <p>Email: {user.email}</p>
              <p>Created: {new Date(user.created_date).toLocaleDateString()}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UsersList;
