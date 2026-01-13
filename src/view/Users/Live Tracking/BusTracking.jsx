import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import busImg from "../../../Assets/bus.png";
import myImg from "../../../Assets/male-avatar-boy-face-man-user-9-svgrepo-com.svg";
import "leaflet/dist/leaflet.css";
import "./BusTracking.css";
import API_BASE_URL from "../../../utils/config";

// Helper: build a Date from schedule.date and a time string
const buildScheduleDateTime = (schedule, timeStr) => {
  if (!schedule || (!schedule.date && !timeStr)) return null;

  const timeVal = String(timeStr || "");

  // If backend already sent full datetime in timeStr, use it directly
  if (/\d{4}-\d{2}-\d{2}/.test(timeVal)) {
    const d = new Date(timeVal);
    return isNaN(d.getTime()) ? null : d;
  }

  if (schedule.date && timeStr) {
    let d = new Date(`${schedule.date}T${timeVal}`);
    if (!isNaN(d.getTime())) return d;

    d = new Date(`${schedule.date} ${timeVal}`);
    if (!isNaN(d.getTime())) return d;
  }

  if (schedule.date) {
    const d = new Date(schedule.date);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
};

// Fit map to route bounds
const FitBounds = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 1) map.fitBounds(coords, { padding: [50, 50] });
  }, [coords, map]);
  return null;
};

const BusTracking = () => {
  const location = useLocation();
  const { route, schedule } = location.state || {};

  const [busPosition, setBusPosition] = useState(null);
  const [pastLocations, setPastLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState([]);
  const [estimatedMinutes, setEstimatedMinutes] = useState(null);
  const [error, setError] = useState(null);
  const [locationStatus, setLocationStatus] = useState(null); // 'not-started' | 'no-tracking' | null

  const token = localStorage.getItem("token");

  const busIcon = L.icon({
    iconUrl: busImg,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  const startLat = Number(route?.start_lat);
  const startLng = Number(route?.start_lng);
  const endLat = Number(route?.end_lat);
  const endLng = Number(route?.end_lng);

  const backendStatus = (schedule?.status || "").toLowerCase();
  const isBackendYetToStart =
    backendStatus === "yet_to_start" ||
    backendStatus === "yet to start" ||
    backendStatus === "yet-start" ||
    backendStatus === "yet start";

  const [routeLoaded, setRouteLoaded] = useState(false);
  const [locationLoaded, setLocationLoaded] = useState(false);

  // Helper: is the trip time in the future?
  // Uses schedule.date combined with start_time / end_time so
  // future-day trips never appear as already completed.
  const isTripInFuture = () => {
    const now = new Date();
    const depDateTime = buildScheduleDateTime(schedule, schedule?.start_time);
    const arrDateTime = buildScheduleDateTime(schedule, schedule?.end_time);

    if (arrDateTime && arrDateTime > now) return true;
    if (depDateTime && depDateTime > now) return true;
    return false;
  };

  const tripCompleted = schedule?.is_reached && !isTripInFuture();

  // Fetch route from backend/ORS
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/view/api/get_route/${startLat}/${startLng}/${endLat}/${endLng}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Route request failed with status ${res.status}`);
        }

        const data = await res.json();
        if (data.routes?.length > 0 && data.routes[0].geometry?.coordinates) {
          const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [
            lat,
            lng,
          ]);
          setRouteCoords(coords);

          const durationSec = data.routes[0].summary?.duration || 0;
          setEstimatedMinutes(Math.round(durationSec / 60));
        } else {
          setError("No route found.");
        }
        setRouteLoaded(true);
      } catch (err) {
        console.error("Failed to fetch route:", err);
        setError("Failed to fetch route.");
        setRouteLoaded(true);
      }
    };

    if (isBackendYetToStart) {
      // Skip loading map route when backend says trip has not started yet
      setRouteLoaded(true);
      return;
    }

    if (startLat && startLng && endLat && endLng) fetchRoute();
  }, [startLat, startLng, endLat, endLng, token, isBackendYetToStart]);

  // Fetch live location while trip is in progress
  useEffect(() => {
    if (isBackendYetToStart) {
      // Do not poll live location when backend explicitly says trip is yet to start
      setLocationLoaded(true);
      setLocationStatus("not-started");
      return;
    }

    if (!schedule?.bus_id) {
      setLocationLoaded(true);
      setLocationStatus("no-tracking");
      return;
    }

    if (tripCompleted) {
      setLocationLoaded(true);
      return;
    }

    const fetchLocation = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/view/get_location/${schedule.bus_id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Location request failed with status ${res.status}`);
        }

        const data = await res.json();

        if (data && data.latitude && data.longitude) {
          const pos = [data.latitude, data.longitude];
          setBusPosition(pos);
          setPastLocations((prev) => [...prev, pos]);
          setError(null);
          setLocationStatus(null);
        } else {
          // No live location yet -> bus not started; show at start point
          setBusPosition([startLat, startLng]);
          setLocationStatus("not-started");
        }
        setLocationLoaded(true);
      } catch (err) {
        console.error("Failed to fetch bus location:", err);
        setError("Failed to fetch bus location.");
        setLocationLoaded(true);
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 2000);
    return () => clearInterval(interval);
  }, [schedule?.bus_id, tripCompleted, token, startLat, startLng, isBackendYetToStart]);

  // When trip is completed (and not in future), show bus at destination and full green line
  useEffect(() => {
    if (!tripCompleted || routeCoords.length === 0) return;

    const lastPoint = routeCoords[routeCoords.length - 1];
    setBusPosition(lastPoint);
    setPastLocations(routeCoords);
    setLocationLoaded(true);
  }, [tripCompleted, routeCoords]);

  // Show loader until both route + location fetched
  useEffect(() => {
    if (routeLoaded && locationLoaded) {
      setLoading(false);
    }
  }, [routeLoaded, locationLoaded]);

  if (!route) return <p>No route data available.</p>;

  if (loading) {
    return (
      <div className="bus-tracking-loading">
        <div className="spinner" />
        <p>Loading map and live bus data...</p>
      </div>
    );
  }

  const centerLat = (startLat + endLat) / 2;
  const centerLng = (startLng + endLng) / 2;

  // Format backend times (start/end) from schedule in 12h format with AM/PM
  const formatTime = (dateTimeStr) => {
    if (!dateTimeStr) return "—";
    let d = new Date(dateTimeStr);

    // If only a time string like "07:30:00" is sent, build a Date for today
    if (isNaN(d.getTime())) {
      const timeMatch = /^([0-2]?\d):([0-5]\d)(?::([0-5]\d))?$/.exec(
        String(dateTimeStr).trim()
      );
      if (timeMatch) {
        const now = new Date();
        const h = parseInt(timeMatch[1], 10);
        const m = parseInt(timeMatch[2], 10);
        const s = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
        d = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          h,
          m,
          s
        );
      }
    }

    if (isNaN(d.getTime())) return String(dateTimeStr); // Fallback: show raw string
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Duration based on backend start & end times (ETA)
  const getScheduleDurationLabel = () => {
    const start = schedule?.end_time;
    const end = schedule?.start_time;
    if (!start || !end) return null;

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

    let diffMs = endDate - startDate;
    if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;

    const totalMin = Math.round(diffMs / 60000);
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;

    if (hours <= 0) return `${mins} mins`;
    if (mins === 0) return `${hours} hrs`;
    return `${hours} hrs ${mins} mins`;
  };

  return (
    <div className="bus-tracking-container">
      {isBackendYetToStart ? (
        <div className="map-waiting-container">
          <div className="bus-not-started-card">
            <div className="bus-not-started-text">
              <h3>Bus has not started yet</h3>
              <p>We'll start live tracking as soon as it is on the move.</p>
            </div>
            <div className="bus-not-started-animation">
              <div className="bus-road-line">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
              <img
                src={busImg}
                alt="Idle bus"
                className="bus-not-started-bus"
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Overlay animation when bus has not started yet based on live data */}
          {locationStatus === "not-started" && (
            <div className="bus-not-started-overlay">
              <div className="bus-not-started-card">
                <div className="bus-not-started-text">
                  <h3>Bus has not started yet</h3>
                  <p>We'll start live tracking as soon as it is on the move.</p>
                </div>
                <div className="bus-not-started-animation">
                  <div className="bus-road-line">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                  <img
                    src={busImg}
                    alt="Idle bus"
                    className="bus-not-started-bus"
                  />
                </div>
              </div>
            </div>
          )}

          <MapContainer
            center={[centerLat, centerLng]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds
              coords={
                routeCoords.length
                  ? routeCoords
                  : [
                      [startLat, startLng],
                      [endLat, endLng],
                    ]
              }
            />

            {/* Route */}
            {routeCoords.length > 0 && (
              <Polyline positions={routeCoords} color="blue" weight={6} opacity={0.7} />
            )}

            {/* Bus trail */}
            {pastLocations.length > 1 && (
              <Polyline positions={pastLocations} color="green" weight={4} opacity={0.5} />
            )}

            {/* Current bus location */}
            {busPosition && (
              <Marker position={busPosition} icon={busIcon}>
                <Popup>Bus is here</Popup>
              </Marker>
            )}

            {/* Start & End markers */}
            <Marker position={[startLat, startLng]}>
              <Popup>Start: {route.start_point || "Start"}</Popup>
            </Marker>
            <Marker position={[endLat, endLng]}>
              <Popup>End: {route.end_point || "End"}</Popup>
            </Marker>
          </MapContainer>
        </>
      )}

      <div className="details-section">
        <h2>Bus & Schedule Details</h2>
        <div className="img-div">
          <img src={myImg} alt="driver" />
        </div>
        <p>
          <b>Route:</b> {route.start_point || "Start"} → {route.end_point || "End"}
        </p>
        <p>
          <b>Bus Number:</b> {schedule?.bus_number || "N/A"}
        </p>
        <p>
          <b>Driver:</b> {schedule?.driver_name || "N/A"}
        </p>
        <p>
          <b>Date:</b>{" "}
          {schedule?.date
            ? new Date(schedule.date).toLocaleDateString("en-GB")
            : "—"}
        </p>
        <p>
          <b>Trip Status:</b> {schedule?.status.charAt(0).toUpperCase() + schedule?.status.slice(1) || "N/A"} 
        </p>
        <p>
          <b>Start Time :</b> {formatTime(schedule?.end_time)}
        </p>
        <p>
          <b>Arrived At :</b> {formatTime(schedule?.start_time)}
        </p>
        <p>
          <b>Estimated Duration:</b>{" "}
          {getScheduleDurationLabel() ||
            (estimatedMinutes ? `${estimatedMinutes} mins` : "Calculating...")}
        </p>

        {error && (
          <div className="error">
            {error}
          </div>
        )}
      </div>

      <ToastContainer />
    </div>
  );
};

export default BusTracking;
