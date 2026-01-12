import React, { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Bus.css";

const RegisterBus = () => {
  const [formData, setFormData] = useState({
    bus_number: "",
    bus_capacity: "",
    bus_type: "AC",
    driver_id: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate API call
    console.log("Registering Bus:", formData);
    toast.success("Bus Registered Successfully (Simulation)");
    setFormData({ bus_number: "", bus_capacity: "", bus_type: "AC", driver_id: "" });
  };

  return (
    <div className="bus-container">
      <div className="bus-card">
        <h2>Register New Bus</h2>
        <form onSubmit={handleSubmit} className="bus-form">
          <div className="form-group">
            <label>Bus Number</label>
            <input
              type="text"
              name="bus_number"
              value={formData.bus_number}
              onChange={handleChange}
              placeholder="e.g. KA-01-AB-1234"
              required
            />
          </div>

          <div className="form-group">
            <label>Capacity</label>
            <input
              type="number"
              name="bus_capacity"
              value={formData.bus_capacity}
              onChange={handleChange}
              placeholder="Total Seats"
              required
            />
          </div>

          <div className="form-group">
            <label>Bus Type</label>
            <select name="bus_type" value={formData.bus_type} onChange={handleChange}>
              <option value="AC">AC</option>
              <option value="Non-AC">Non-AC</option>
              <option value="Sleeper">Sleeper</option>
            </select>
          </div>

          <div className="form-group">
            <label>Driver ID (Optional)</label>
            <input
              type="text"
              name="driver_id"
              value={formData.driver_id}
              onChange={handleChange}
              placeholder="Assigned Driver ID"
            />
          </div>

          <button type="submit" className="submit-btn">Register Bus</button>
        </form>
      </div>
      <ToastContainer />
    </div>
  );
};

export default RegisterBus;
