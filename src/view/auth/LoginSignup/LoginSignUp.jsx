import React, { useState } from "react";
import "./LoginSignup.css";
import myimage from "../../../Assets/login.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebook, faGoogle, faTwitter } from "@fortawesome/free-brands-svg-icons";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify"; 
import API_BASE_URL from "../../../utils/config";

const LoginSignup = () => {
  const [action, setAction] = useState("Login");
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    password: "",
    role: "Passenger", // ✅ default role
  });
  const navigate = useNavigate();

  // ✅ toggle Login <-> Signup
  const toggleAction = () => {
    setAction((prev) => (prev === "Login" ? "Signup" : "Login"));
  };

  // ❌ Google Login disabled for now
  const GoogleLogin = () => {
    toast.info("Google login is disabled right now!");
  };

  // ✅ handle form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ handle submit (Login / Signup)
  const submit = async (e) => {
    e.preventDefault();

    if (action === "Login") {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          credentials: "include",
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong");
          toast.error(data.error || "Something went wrong");
          return;
        }

        if (data.token) {
          localStorage.setItem("token", data.token);
          toast.success("Login Successful");
          navigate("/dashboard");
        }
      } catch (err) {
        setError("Server error. Please try again later.");
        toast.error("Server error. Please try again later.");
      }
    } else {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            is_password_change: true,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong");
          toast.error(data.error || "Something went wrong");
          return;
        }

        toast.success("User registered successfully");
        setAction("Login");
      } catch (err) {
        setError("Server error. Please try again later.");
        toast.error("Server error. Please try again later.");
      }
    }
  };

  return (
    <div className="login-main">
      <div className="login-signup-container">
        {/* LEFT SIDE */}
        <div className="leftcontainer">
          <img src={myimage} alt="Login" width={450} />
          <div className="text">
            Discover the power of personalized health insights <br />
            and seamless integration with your daily routine.
          </div>
        </div>

        {/* RIGHT SIDE WITH FLIP */}
        <div className="rightcontainer">
          <div className={`flip-card ${action === "Signup" ? "flipped" : ""}`}>
            
            {/* FRONT - LOGIN */}
            <div className="flip-card-front">
              <div className="right-wrap">
                <div className="login-text" style={{ color: "black" }}>Login</div>
                <form onSubmit={submit}>
                  <input
                    type="email"
                    placeholder="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button type="submit">Login</button>
                  <div className="forgot-password">
                    <a href="#" style={{ textDecoration: "none" }}>Forgot Password?</a>
                  </div>
                </form>
                <div className="footer">
                  <p>
                    Don’t have an account? <span onClick={toggleAction}>Sign Up</span>
                  </p>
                </div>
                <div className="social-signup">
                  <button onClick={GoogleLogin}>
                    <FontAwesomeIcon icon={faGoogle} size="lg" />
                  </button>
                  <button>
                    <FontAwesomeIcon icon={faFacebook} size="lg" />
                  </button>
                  <button>
                    <FontAwesomeIcon icon={faTwitter} size="lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* BACK - SIGNUP */}
            <div className="flip-card-back">
              <div className="right-wrap">
                <div className="login-text" style={{ color: "black" }}>Sign Up</div>
                <form onSubmit={submit}>
                  <input
                    type="text"
                    placeholder="Fullname"
                    name="fullname"
                    value={formData.fullname}
                    onChange={handleChange}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />

                  {/* ✅ Role Selection */}
                  <div className="role-select">
                    <label>
                      <input
                        type="radio"
                        name="role"
                        value="Passenger"
                        checked={formData.role === "Passenger"}
                        onChange={handleChange}
                      />
                      Passenger
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="role"
                        value="Driver"
                        checked={formData.role === "Driver"}
                        onChange={handleChange}
                      />
                      Driver
                    </label>
                  </div>

                  <button type="submit">Sign Up</button>
                </form>
                <div className="footer_login">
                  <p>
                    Already have an account? <span onClick={toggleAction}>Login</span>
                  </p>
                </div>
                <div className="social-signup">
                  <button onClick={GoogleLogin}>
                    <FontAwesomeIcon icon={faGoogle} size="lg" />
                  </button>
                  <button>
                    <FontAwesomeIcon icon={faFacebook} size="lg" />
                  </button>
                  <button>
                    <FontAwesomeIcon icon={faTwitter} size="lg" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>  
      <ToastContainer/>
    </div>
  );
};

export default LoginSignup;
