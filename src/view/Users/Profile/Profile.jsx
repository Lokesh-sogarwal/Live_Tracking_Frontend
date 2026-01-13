import React, { useState, useEffect } from "react";
import "./profile.css";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import profileimg from "../../../Assets/male-avatar-boy-face-man-user-9-svgrepo-com.svg";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import API_BASE_URL from "../../../utils/config";

const Profile = () => {
  const [user, setUser] = useState({
    fullname: "",
    email: "",
    dob: "",
    fathername: "",
    mothername: "",
    role: "",
  });
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(user);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;
      return decoded.exp < now;
    } catch {
      return true;
    }
  };

  const logoutUser = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  useEffect(() => {
    if (!token || isTokenExpired(token)) {
      toast.error("Session expired. Please log in again.");
      setTimeout(() => logoutUser(), 3000);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/view/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          credentials: "include",
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch profile");

        setUser({
          fullname: data.fullname,
          email: data.email,
          dob: data.dob || "",
          fathername: data.fathername || "",
          mothername: data.mothername || "",
          role: data.role || "",
          profileimg: data.profileimg || null,
        });

        setFormData({
          fullname: data.fullname,
          email: data.email,
          dob: data.dob || "",
          fathername: data.fathername || "",
          mothername: data.mothername || "",
          role: data.role || "",
          profileimg: data.profileimg || null,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setTimeout(() => setLoading(false), 1500);
      }
    };

    fetchProfile();
  }, [token]);

  const handleEdit = () => setEditMode(true);
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setUser({ ...formData });
      setEditMode(false);
      setError("");
      toast.success("Profile updated successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setFormData({ ...user });
    setEditMode(false);
    setError("");
  };

  const calculateAge = (dobString) => {
    if (!dobString) return "-";
    const today = new Date();
    const dob = new Date(dobString);
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="layout">
        <div className="profileContainer">
          <div className="d-flex justify-content-center align-items-center ">
            <FontAwesomeIcon icon={faSpinner} spin size="2x" color="#007bff" />
            Loading Profile...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <div className="profile-image">
        <img src={profileimg} alt="Profile" />
        <p style={{ textAlign: "center", fontWeight: 600, fontSize: "16px" }}>{user.fullname}</p>

        <div className="active_box"></div>
      </div>
      <div className="profileContainer">
        <div className="details">
          <h2>User Profile</h2>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <div className="user_details">
            {/* <div className="modal-buttons">
            <button onClick={handleEdit}>Edit Profile</button>
          </div> */}

            {editMode ? (
              <>
                <p>
                  Fullname:
                  <input
                    type="text"
                    name="fullname"
                    value={formData.fullname}
                    onChange={handleChange}
                  />
                </p>
                <p>
                  Email:
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </p>
                <p>
                  Date of Birth:
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                  />
                </p>
                <p>
                  Father&apos;s Name:
                  <input
                    type="text"
                    name="fathername"
                    value={formData.fathername}
                    onChange={handleChange}
                  />
                </p>
                <p>
                  Mother&apos;s Name:
                  <input
                    type="text"
                    name="mothername"
                    value={formData.mothername}
                    onChange={handleChange}
                  />
                </p>
                <div className="buttons">
                  <button onClick={handleSave}>Save</button>
                  <button onClick={handleCancel}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <p>
                  Email: <span>{user.email}</span>
                </p>
                <p>
                  Age: <span>{calculateAge(user.dob)}</span>
                </p>
                <p>
                  Date of Birth: <span>{user.dob || "-"}</span>
                </p>
                <p>
                  Father&apos;s Name: <span>{user.fathername || "-"}</span>
                </p>
                <p>
                  Mother&apos;s Name: <span>{user.mothername || "-"}</span>
                </p>
                <p>
                  Role: <span>{user.role || "-"}</span>
                </p>
              </>
            )}
          </div>
        </div>

        <ToastContainer />
      </div>
    </div>
  );
};

export default Profile;
