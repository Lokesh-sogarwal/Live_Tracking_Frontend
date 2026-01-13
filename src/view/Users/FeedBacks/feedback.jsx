import React, { useState } from "react";
import "./feedback.css";
import { toast } from "react-toastify";
import API_BASE_URL from "../../../utils/config";

const FeedbackForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    feedback: "",
    rating: 0,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRating = (rate) => {
    setFormData({ ...formData, rating: rate });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.feedback) {
      toast.error("Please fill all fields and give a rating!");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/view/submit_feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Feedback submitted successfully!");
        // setFormData({ name: "", email: "", feedback: "", rating: 0 });
        setFormData({ feedback: "" });
      } else {
        toast.error(data.error || "Failed to submit feedback!");
      }
    } catch {
      toast.error("Server error!");
    }
  };

  return (
    <div className="feedback-container">
      <h2>💬 We Value Your Feedback</h2>
      <p>Please share your thoughts below.</p>

      <form onSubmit={handleSubmit}>
        {/* <div className="input-group">
          <label>Full Name</label>
          <input
            type="text"
            name="name"
            placeholder="Enter your name"
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
          />
        </div> */}

        <div className="input-group">
          <label>Feedback</label>
          <textarea
            name="feedback"
            rows="4"
            placeholder="Write your feedback..."
            value={formData.feedback}
            onChange={handleChange}
          ></textarea>
        </div>

        {/* <div className="rating">
          <label>Rating:</label>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={formData.rating >= star ? "star active" : "star"}
                onClick={() => handleRating(star)}
              >
                ★
              </span>
            ))}
          </div>
        </div> */}

        <button type="submit" className="submit-btn">Submit Feedback</button>
      </form>
    </div>
  );
};

export default FeedbackForm;
