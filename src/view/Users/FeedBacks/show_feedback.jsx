import React, { useEffect, useState } from "react";
// import "./show_feedback.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import API_BASE_URL from "../../../utils/config";

const FeedbacksList = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all feedbacks
  const fetchFeedbacks = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/data/get_feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        setFeedbacks(data || []);
      } else {
        toast.error(data.error || "Failed to fetch feedbacks");
      }
    } catch (error) {
      toast.error("Error fetching feedbacks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  return (
    <div className="feedback-page">
      <ToastContainer />
      <h2 className="feedback-title">📝 User Feedbacks</h2>

      {loading ? (
        <p className="loading-text">Loading feedbacks...</p>
      ) : feedbacks.length === 0 ? (
        <p className="no-feedback">No feedbacks found.</p>
      ) : (
        <table className="feedbacks-table">
          <thead>
            <tr>
              <th>FullName</th>
              <th>Email</th>
              <th>Feedback</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map((fb) => (
              <tr key={fb.id}>
                <td>{fb.user_name}</td>
                <td>{fb.email}</td>
                <td>{fb.feedback}</td>
                <td>{fb.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default FeedbacksList;
