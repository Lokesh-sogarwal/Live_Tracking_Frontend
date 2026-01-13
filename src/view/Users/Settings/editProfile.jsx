import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCamera } from "react-icons/fa";
import profilePlaceholder from "../../../Assets/male-avatar-boy-face-man-user-9-svgrepo-com.svg";
import "./editProfile.css";
import API_BASE_URL from "../../../utils/config";

const EditProfile = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [user, setUser] = useState({
    fullname: "",
    email: "",
    dob: "",
    fathername: "",
    mothername: "",
    role: "",
    profileimg: null,
  });

  const [image, setImage] = useState(profilePlaceholder);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/view/profile`, {
        headers: { Authorization: "Bearer " + token },
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUser(data);
      if (data.profileimg) setImage(data.profileimg);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImage(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const form = new FormData();
      form.append("fullname", user.fullname);
      form.append("email", user.email);
      form.append("dob", user.dob);
      form.append("fathername", user.fathername);
      form.append("mothername", user.mothername);
      form.append("role", user.role);
      if (selectedFile) form.append("profileimg", selectedFile);

      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: "PUT",
        headers: { Authorization: "Bearer " + token },
        body: form,
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Profile Updated!");
      setTimeout(() => navigate("/profile"), 1200);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-box">Loading...</div>;

  return (
    <div className="settings-page-layout"> {/* ✅ THIS is the main layout */}

      {/* ==== LEFT: FORM ==== */}
      <div className="profile-form-wrapper">
        <div className="profile-form-card">

          <h2>Edit Profile</h2>

          {error && <p className="error-msg">{error}</p>}

          {/* PROFILE IMAGE UPLOAD */}
          <div className="profile-img-wrapper">
            <img src={image} alt="profile" className="profile-img"/>
            <label className="camera-btn">
              <FaCamera/>
              <input type="file" accept="image/*" onChange={handleImageChange} hidden/>
            </label>
          </div>

          {/* INPUT FIELDS */}
          <div className="profile-fields-grid">

            <div>
              <label>Full Name</label>
              <input name="fullname" value={user.fullname} onChange={handleChange}/>
            </div>

            <div>
              <label>Email</label>
              <input name="email" value={user.email} onChange={handleChange}/>
            </div>

            <div>
              <label>Date of Birth</label>
              <input type="date" name="dob" value={user.dob} onChange={handleChange}/>
            </div>

            <div>
              <label>Father's Name</label>
              <input name="fathername" value={user.fathername} onChange={handleChange}/>
            </div>

            <div>
              <label>Mother's Name</label>
              <input name="mothername" value={user.mothername} onChange={handleChange}/>
            </div>

            <div>
              <label>Role</label>
              <input name="role" value={user.role} readOnly/>
            </div>

          </div>

          {/* BUTTONS */}
          <div className="profile-buttons">
            <button onClick={handleSave} className="profile-btn-save">Save</button>
            <button onClick={() => navigate("/profile")} className="profile-btn-cancel">Cancel</button>
          </div>

        </div>
      </div>

      <ToastContainer/>
    </div>
  );
};

export default EditProfile;
