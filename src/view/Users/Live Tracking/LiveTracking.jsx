import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// import busImg from "../../../Assets/bus.png"; // Removing specific image to rely on cleaner CSS

import "./LiveTracking.css";

const LiveTracking = () => {
  const navigate = useNavigate();
  const startInputRef = useRef(null);
  const destInputRef = useRef(null);
  const containerRef = useRef(null);

  const [startingPoint, setStartingPoint] = useState("");
  const [destination, setDestination] = useState("");
  
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [startLoading, setStartLoading] = useState(false);
  const [destLoading, setDestLoading] = useState(false);

  // Fetch current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&countrycodes=IN&accept-language=en`
            );
            const data = await res.json();
             setStartingPoint(data.display_name || "Current Location");
          } catch (err) {
            console.error("Reverse geocoding failed", err);
          }
        },
        (err) => console.error("Geolocation failed", err)
      );
    }
  }, []);

  const fetchSuggestions = async (query, setter, setLoading) => {
    if (!query) {
      setter([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&addressdetails=1&limit=5&countrycodes=IN&accept-language=en`
      );
      const data = await res.json();
      setter(data || []);
    } catch (err) {
      console.error("Failed to fetch suggestions", err);
      setter([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion, setterInput, clearSuggestions) => {
    setterInput(suggestion.display_name);
    clearSuggestions([]);
  };

  const handleGetRoute = async () => {
    if (!startingPoint || !destination) {
      toast.warn("Please provide both starting point and destination");
      return;
    }
    try {
      const res = await fetch("http://localhost:5001/bus/get_routes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ starting_point: startingPoint, destination }),
      });
      const data = await res.json();
      if (res.ok) {
        navigate("/all_routes", { state: { routeData: data } });
      } else {
        toast.error(data.message || data.error);
      }
    } catch (err) {
      console.error("Server error", err);
      toast.error("Server error while fetching route");
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (startInputRef.current && !startInputRef.current.contains(event.target)) {
        setStartSuggestions([]);
      }
      if (destInputRef.current && !destInputRef.current.contains(event.target)) {
        setDestSuggestions([]);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="livetracking-container" ref={containerRef}>
      {/* Animated Background Elements */}
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>

      <div className="search-card">
        <div className="card-header">
           <h1>Start Your Journey</h1>
           <p>Track buses in real-time with RouteMaster</p>
        </div>
        
        <div className="inputs-container">
            <div className="input-group">
            <label>From</label>
            <div className="input-wrapper" ref={startInputRef}>
                <div className="icon-marker start-marker"></div>
                <input
                value={startingPoint}
                onChange={(e) => {
                    setStartingPoint(e.target.value);
                    fetchSuggestions(e.target.value, setStartSuggestions, setStartLoading);
                }}
                placeholder="Current Location"
                />
                {startLoading && <span className="input-loader"></span>}
                {startSuggestions.length > 0 && (
                <ul className="suggestions-list">
                    {startSuggestions.map((s, idx) => (
                    <li
                        key={s.place_id || idx}
                        onClick={() => handleSelectSuggestion(s, setStartingPoint, setStartSuggestions)}
                    >
                        {s.display_name}
                    </li>
                    ))}
                </ul>
                )}
            </div>
            </div>

            <div className="connector-line"></div>

            <div className="input-group">
            <label>To</label>
            <div className="input-wrapper" ref={destInputRef}>
                <div className="icon-marker dest-marker"></div>
                <input
                value={destination}
                onChange={(e) => {
                    setDestination(e.target.value);
                    fetchSuggestions(e.target.value, setDestSuggestions, setDestLoading);
                }}
                placeholder="Search Destination"
                />
                {destLoading && <span className="input-loader"></span>}
                {destSuggestions.length > 0 && (
                <ul className="suggestions-list">
                    {destSuggestions.map((s, idx) => (
                    <li
                        key={s.place_id || idx}
                        onClick={() => handleSelectSuggestion(s, setDestination, setDestSuggestions)}
                    >
                        {s.display_name}
                    </li>
                    ))}
                </ul>
                )}
            </div>
            </div>
        </div>

        <button className="search-btn-large" onClick={handleGetRoute}>
          Find Bus Routes
        </button>
      </div>
      <ToastContainer position="top-center" theme="colored" />
    </div>
  );
};

export default LiveTracking;
