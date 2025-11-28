import React, { useEffect, useState } from "react";
import './a_user.css';
import avatar from '../../../Assets/male-avatar-boy-face-man-user-9-svgrepo-com.svg';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("http://localhost:5000/data/get_data", {
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

        setUsers(rawData.users);          // ✅ correct way
        setActiveUsers(rawData.active_users); // ✅ correct way

      } catch (error) {
        console.error("Fetch error:", error);
      }
    }

    fetchData();
  }, []);

  const activeUserEmails = new Set(activeUsers.map((user) => user.email));

  return (
    <div className="users-container">
      <h2 id="users-title">Active Users</h2>
      <ul className="users-list">
        {users.length === 0 && <p className="no-data">No users found</p>} {/* safety */}

        {users.map((user) => (
          <li
            key={user.id}
            className={`user-item ${activeUserEmails.has(user.email) ? "user-active" : "user-inactive"}`}
          >
            <div className="user-header">
              <div className="img-cont">
                <img src={avatar} alt="avatar" />
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
