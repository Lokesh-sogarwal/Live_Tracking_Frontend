import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import './otp.css';

const Otp = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const otp_token = sessionStorage.getItem("otp_token"); 

  const verify_otp = async () => {
    if (!otp.trim()) {
      toast.error("Please enter the OTP");
      return;
    }

    if (!otp_token) {
      toast.error("No OTP session found, please restart password change.");
    //   navigate("/default_change_password");
      return;
    }

    try {
      const response = await fetch("http://localhost:5001/auth/verify_otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + otp_token, // ✅ use OTP token
        },
        credentials: "include",
        body: JSON.stringify({ otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "OTP verification failed");
        setOtp("");
      } else {
        toast.success(data.message || "Password changed successfully!");
        setTimeout(() => {
          sessionStorage.removeItem("otp_token"); // ✅ clear OTP token
          localStorage.removeItem("token"); // remove login token
          navigate("/");
        }, 2000);
      }
    } catch (err) {
      toast.error("Error verifying OTP: " + err.message);
    }
  };

  return (
    <div className="cont">

    <div className="otp-container">
      <h2>OTP Verification</h2>
      <div className="otp">
        <input
          type="text"
          placeholder="Enter the OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />
        <button onClick={verify_otp} disabled={!otp.trim()}>
          Verify OTP
        </button>
      </div>
      <ToastContainer />
    </div>
    </div>
  );
};

export default Otp;
