import React, { useState, useRef, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./BusRoute.css";

const RouteCreation = () => {
  const containerRef = useRef(null);

  const [routes, setRoutes] = useState([]);
  const [routeName, setRouteName] = useState("");
  const [startPoint, setStartPoint] = useState("");
  const [endPoint, setEndPoint] = useState("");
  const [stops, setStops] = useState([""]);

  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [stopSuggestions, setStopSuggestions] = useState([[]]);

  const [loading, setLoading] = useState(false);

  const [startLoading, setStartLoading] = useState(false);
  const [endLoading, setEndLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState([false]);

  // Debounce function
  const debounce = (func, delay = 300) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
    };
  };

  // Filter API results
  const filterSuggestions = (data) => {
    const filtered = data
      .filter((place) => place.display_name.includes("India"))
      .map((place) => ({
        display_name: place.display_name,
        lat: place.lat,
        lon: place.lon,
      }));
    const seen = new Set();
    return filtered.filter((place) => {
      if (seen.has(place.display_name)) return false;
      seen.add(place.display_name);
      return true;
    });
  };

  // Fetch suggestions
  const fetchSuggestions = debounce(
    async (query, setter, setLoadingState = null, index = null) => {
      if (!query) {
        setter([]);
        if (setLoadingState) {
          if (index !== null) {
            const newArr = [...stopLoading];
            newArr[index] = false;
            setStopLoading(newArr);
          } else {
            setLoadingState(false);
          }
        }
        return;
      }

      if (setLoadingState) {
        if (index !== null) {
          const newArr = [...stopLoading];
          newArr[index] = true;
          setStopLoading(newArr);
        } else {
          setLoadingState(true);
        }
      }

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&addressdetails=1&limit=5&countrycodes=IN&accept-language=en`
        );
        const data = await res.json();
        const filtered = filterSuggestions(data);
        setter(filtered);
      } catch (err) {
        console.error("Failed to fetch suggestions", err);
        setter([]);
      } finally {
        if (setLoadingState) {
          if (index !== null) {
            const newArr = [...stopLoading];
            newArr[index] = false;
            setStopLoading(newArr);
          } else {
            setLoadingState(false);
          }
        }
      }
    },
    250
  );

  // Handle suggestion selection
  const handleSelectSuggestion = (
    suggestion,
    setterInput,
    setterCoords = null,
    index = null,
    clearSuggestions = null
  ) => {
    setterInput(suggestion.display_name, index);
    if (index !== null && setterCoords) {
      const newCoords = [...setterCoords];
      newCoords[index] = [parseFloat(suggestion.lat), parseFloat(suggestion.lon)];
      setterCoords(newCoords);
    }
    if (clearSuggestions) clearSuggestions([]);
  };

  // Highlight typed part
  const highlightMatch = (text, query) => {
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} style={{ fontWeight: "bold", backgroundColor: "#fffa8b" }}>
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  // Click outside to hide suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setStartSuggestions([]);
        setEndSuggestions([]);
        setStopSuggestions(stops.map(() => []));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [stops]);

  // Stops handlers
  const handleStopChange = (index, value) => {
    const newStops = [...stops];
    newStops[index] = value;
    setStops(newStops);

    const newStopSuggestions = [...stopSuggestions];
    newStopSuggestions[index] = [];
    setStopSuggestions(newStopSuggestions);

    fetchSuggestions(value, (data) => {
      const updated = [...stopSuggestions];
      updated[index] = data;
      setStopSuggestions(updated);
    }, null, index);
  };

  const handleAddStop = () => {
    setStops([...stops, ""]);
    setStopSuggestions([...stopSuggestions, []]);
    setStopLoading([...stopLoading, false]);
  };

  const handleRemoveStop = (index) => {
    setStops(stops.filter((_, i) => i !== index));
    setStopSuggestions(stopSuggestions.filter((_, i) => i !== index));
    setStopLoading(stopLoading.filter((_, i) => i !== index));
  };

  // Validate location
  const validateLocation = async (place) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          place
        )}&limit=1`
      );
      const data = await res.json();
      if (data.length === 0) return false;
      return data[0].display_name.includes("India");
    } catch (err) {
      console.error("Geocoding failed:", err);
      return false;
    }
  };

  // Add route
  const handleAddRoute = async (e) => {
    e.preventDefault();
    if (!routeName || !startPoint || !endPoint) {
      toast.error("⚠️ Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const isStartValid = await validateLocation(startPoint);
      const isEndValid = await validateLocation(endPoint);
      const stopChecks = await Promise.all(
        stops.filter((s) => s.trim() !== "").map((s) => validateLocation(s))
      );

      if (!isStartValid || !isEndValid || stopChecks.includes(false)) {
        toast.error("❌ One or more locations are outside India.");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:5001/bus/bus_route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          route_name: routeName,
          starting: startPoint,
          destination: endPoint,
          stops: stops.filter((s) => s.trim() !== ""),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setRoutes([...routes, result.route]);
        setRouteName("");
        setStartPoint("");
        setEndPoint("");
        setStops([""]);
        setStopSuggestions([[]]);
        setStopLoading([false]);
        toast.success("✅ Route created successfully!");
      } else {
        toast.error(result.error || "❌ Something went wrong");
      }
    } catch (error) {
      console.error("Error adding route:", error);
      toast.error("🚨 Server error, try again later");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="route-container" ref={containerRef}>
      <div className="route-form-card">
        <form onSubmit={handleAddRoute} className="route-form">
          {/* Route Name */}
          <div className="form-group">
            <label>Route Name</label>
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="e.g., City Center Express"
            />
          </div>

          {/* Starting Point */}
          <div className="form-group">
            <label>Starting Point</label>
            <input
              value={startPoint}
              onChange={(e) => {
                setStartPoint(e.target.value);
                fetchSuggestions(e.target.value, setStartSuggestions, setStartLoading);
              }}
              placeholder="e.g., Main Bus Stand"
            />
            {startLoading && <div className="loading">Loading...</div>}
            {startSuggestions.length > 0 && (
              <ul className="suggestions">
                {startSuggestions.map((s, idx) => (
                  <li
                    key={idx}
                    onClick={() =>
                      handleSelectSuggestion(s, setStartPoint, null, null, setStartSuggestions)
                    }
                  >
                    {highlightMatch(s.display_name, startPoint)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Stops */}
          <div className="form-group">
            <label>Stops</label>
            {stops.map((stop, index) => (
              <div key={index} className="stop-input">
                <input
                  type="text"
                  value={stop}
                  onChange={(e) => handleStopChange(index, e.target.value)}
                  placeholder={`Stop ${index + 1}`}
                />
                {stopLoading[index] && <div className="loading">Loading...</div>}
                {stopSuggestions[index]?.length > 0 && (
                  <ul className="suggestions">
                    {stopSuggestions[index].map((s, idx) => (
                      <li
                        key={idx}
                        onClick={() =>
                          handleSelectSuggestion(
                            s,
                            (val) => {
                              const newStops = [...stops];
                              newStops[index] = val;
                              setStops(newStops);
                            },
                            null,
                            index,
                            (arr) => {
                              const updated = [...stopSuggestions];
                              updated[index] = arr;
                              setStopSuggestions(updated);
                            }
                          )
                        }
                      >
                        {highlightMatch(s.display_name, stop)}
                      </li>
                    ))}
                  </ul>
                )}
                {stops.length > 1 && (
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => handleRemoveStop(index)}
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="add-stop-btn" onClick={handleAddStop}>
              ➕ Add Stop
            </button>
          </div>

          {/* Destination */}
          <div className="form-group">
            <label>Destination</label>
            <input
              value={endPoint}
              onChange={(e) => {
                setEndPoint(e.target.value);
                fetchSuggestions(e.target.value, setEndSuggestions, setEndLoading);
              }}
              placeholder="e.g., Airport"
            />
            {endLoading && <div className="loading">Loading...</div>}
            {endSuggestions.length > 0 && (
              <ul className="suggestions">
                {endSuggestions.map((s, idx) => (
                  <li
                    key={idx}
                    onClick={() =>
                      handleSelectSuggestion(s, setEndPoint, null, null, setEndSuggestions)
                    }
                  >
                    {highlightMatch(s.display_name, endPoint)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Add Route"}
          </button>
        </form>
      </div>

      {/* Routes List */}
      {routes.length > 0 && (
        <div className="routes-list">
          <h2>Created Routes</h2>
          <ul>
            {routes.map((route, index) => (
              <li key={index} className="route-item">
                <span className="route-name">{route.route_name}</span>
                <span className="route-path">
                  {route.start_point} →{" "}
                  {route.stops?.length > 0 && route.stops.join(" → ")} → {route.end_point}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default RouteCreation;
