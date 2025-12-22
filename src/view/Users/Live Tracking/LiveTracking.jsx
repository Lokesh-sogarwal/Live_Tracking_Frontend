import React, { useEffect, useState, useRef } from "react";
import { Map, Marker } from "pigeon-maps";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import "./LiveTracking.css";

const LiveTracking = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [position, setPosition] = useState([20.5937, 78.9629]); // India center
  const [startingPoint, setStartingPoint] = useState("");
  const [destination, setDestination] = useState("");
  const [startCoords, setStartCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [startLoading, setStartLoading] = useState(false);
  const [destLoading, setDestLoading] = useState(false);

  // Fetch current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          let { latitude, longitude } = pos.coords;
          // constrain to India bounds
          if (latitude < 6.5546) latitude = 6.5546;
          if (latitude > 35.6745) latitude = 35.6745;
          if (longitude < 68.1114) longitude = 68.1114;
          if (longitude > 97.3956) longitude = 97.3956;

          const coords = [latitude, longitude];
          setPosition(coords);
          setStartCoords(coords);

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&countrycodes=IN&accept-language=en`
            );
            const data = await res.json();
            setStartingPoint(data.display_name || "Current Location");
          } catch (err) {
            console.error("Reverse geocoding failed", err);
            setStartingPoint("Current Location");
          }
        },
        (err) => console.error("Geolocation failed", err)
      );
    }
  }, []);

  // Fetch suggestions
  const fetchSuggestions = async (query, setter, setLoading) => {
    if (!query) return setter([]);
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

  // Select suggestion
  const handleSelectSuggestion = (suggestion, setterCoords, setterInput, clearSuggestions) => {
    const coords = [parseFloat(suggestion.lat), parseFloat(suggestion.lon)];
    setterCoords(coords);
    setterInput(suggestion.display_name);
    setPosition(coords);
    clearSuggestions([]);
  };

  // Hide suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setStartSuggestions([]);
        setDestSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
      if (res.ok) navigate("/all_routes", { state: { routeData: data } });
      else toast.error(data.message || data.error);
    } catch (err) {
      console.error("Server error", err);
      toast.error("Server error while fetching route");
    }
  };

  return (
    <div className="livetracking-container" ref={containerRef}>
      <div className="map">
        <Map height={650} center={position} defaultZoom={12}>
          {startCoords && <Marker anchor={startCoords} color="green" />}
          {destCoords && <Marker anchor={destCoords} color="red" />}
        </Map>
      </div>

      <div className="route_details">
        <label>Starting Point</label>
        <div className="input-wrapper">
          <input
            value={startingPoint}
            onChange={(e) => {
              setStartingPoint(e.target.value);
              fetchSuggestions(e.target.value, setStartSuggestions, setStartLoading);
            }}
            placeholder="Enter starting point"
          />
          {startLoading && <p className="loading-text">Loading...</p>}
          {startSuggestions.length > 0 && (
            <ul className="suggestions">
              {startSuggestions.map((s, idx) => (
                <li
                  key={idx}
                  onClick={() =>
                    handleSelectSuggestion(
                      s,
                      setStartCoords,
                      setStartingPoint,
                      setStartSuggestions
                    )
                  }
                >
                  {s.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <label>Destination</label>
        <div className="input-wrapper">
          <input
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              fetchSuggestions(e.target.value, setDestSuggestions, setDestLoading);
            }}
            placeholder="Enter destination"
          />
          {destLoading && <p className="loading-text">Loading...</p>}
          {destSuggestions.length > 0 && (
            <ul className="suggestions">
              {destSuggestions.map((s, idx) => (
                <li
                  key={idx}
                  onClick={() =>
                    handleSelectSuggestion(
                      s,
                      setDestCoords,
                      setDestination,
                      setDestSuggestions
                    )
                  }
                >
                  {s.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button onClick={handleGetRoute}>Get Route</button>
      </div>
      <ToastContainer />
    </div>
  );
};

export default LiveTracking;
