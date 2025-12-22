import React, { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const DriverUpload = () => {
  const [userId, setUserId] = useState(""); // driver ID from token
  const [documentType, setDocumentType] = useState("license");
  const [file, setFile] = useState(null);
  const [expiryDate, setExpiryDate] = useState(""); // optional
  const [message, setMessage] = useState("");

  useEffect(() => {
    // ✅ Get token from localStorage and decode
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // adjust "userId" to the actual field in your JWT payload (could be "id", "sub", etc.)
        setUserId(decoded.user_id);
      } catch (err) {
        console.error("Invalid token:", err);
      }
    }
  }, []);

  const handleFileChange = (e) => setFile(e.target.files[0]);
  const handleExpiryChange = (e) => setExpiryDate(e.target.value);

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!userId) return setMessage("Driver ID missing from token!");
    if (!file) return setMessage("Please select a file!");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", documentType);
    if (expiryDate) formData.append("expiry_date", expiryDate);

    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `http://localhost:5001/view/upload/${userId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(res.data.message);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || "Upload failed!");
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "auto", padding: "20px" }}>
      <h2>Driver Document Upload</h2>
      <form onSubmit={handleUpload}>
        {/* Hidden field, filled from token */}
        <input type="hidden" value={userId} />

        <div style={{ marginBottom: "10px" }}>
          <label>Document Type:</label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          >
            <option value="license">License</option>
            <option value="aadhaar">Aadhaar</option>
          </select>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Expiry Date (optional):</label>
          <input
            type="date"
            value={expiryDate}
            onChange={handleExpiryChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Choose File:</label>
          <input type="file" onChange={handleFileChange} />
        </div>

        <button type="submit" style={{ padding: "10px 20px" }}>
          Upload
        </button>
      </form>

      {message && (
        <div style={{ marginTop: "20px", color: "green", fontWeight: "bold" }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default DriverUpload;
