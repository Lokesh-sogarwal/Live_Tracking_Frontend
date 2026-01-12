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
  const [arrivalTime, setArrivalTime] = useState(null);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token"); // get token from storage

  const busIcon = L.icon({
    iconUrl: busImg,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  const startLat = Number(route?.start_lat);
  const startLng = Number(route?.start_lng);
  const endLat = Number(route?.end_lat);
  const endLng = Number(route?.end_lng);

  // Track loading states separately
  const [routeLoaded, setRouteLoaded] = useState(false);
  const [locationLoaded, setLocationLoaded] = useState(false);

  // Fetch route from backend/ORS
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `http://localhost:5001/view/api/get_route/${startLat}/${startLng}/${endLat}/${endLng}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();
        if (data.routes?.length > 0 && data.routes[0].geometry?.coordinates) {
          const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [
            lat,
            lng,
          ]);
          setRouteCoords(coords);

          const durationSec = data.routes[0].summary?.duration || 0;
          setEstimatedMinutes(Math.round(durationSec / 60));

          const now = new Date();
          setArrivalTime(new Date(now.getTime() + durationSec * 1000));
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

    if (startLat && startLng && endLat && endLng) fetchRoute();
  }, [startLat, startLng, endLat, endLng, token]);

  // Fetch location initially + poll
  useEffect(() => {
    if (!schedule?.bus_id) return;

    const fetchLocation = async () => {
      try {
        const res = await fetch(
          `http://localhost:5001/view/get_location/${schedule.bus_id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();

        if (data.latitude && data.longitude) {
          const pos = [data.latitude, data.longitude];
          setBusPosition(pos);
          setPastLocations((prev) => [...prev, pos]);
          setError(null);
        } else {
          setBusPosition(null);
          setError("Bus has not started yet.");
        }
        setLocationLoaded(true);
      } catch (err) {
        console.error("Failed to fetch bus location:", err);
        setError("Failed to fetch bus location.");
        setLocationLoaded(true);
      }
    };

    fetchLocation(); // initial fetch
    const interval = setInterval(fetchLocation, 2000);
    return () => clearInterval(interval);
  }, [schedule?.bus_id, token]);

  // Animate bus only if is_reached is true
  useEffect(() => {
    if (!schedule?.is_reached || routeCoords.length === 0) return;

    let index = 0;
    const animateBus = () => {
      if (index < routeCoords.length) {
        const pos = routeCoords[index];
        setBusPosition(pos);
        setPastLocations((prev) => [...prev, pos]);
        index++;
      } else {
        clearInterval(animationInterval);
      }
    };

    const animationInterval = setInterval(animateBus, 1000);
    return () => clearInterval(animationInterval);
  }, [schedule?.is_reached, routeCoords]);

  // Show loader until both route + location fetched
  useEffect(() => {
    if (routeLoaded && locationLoaded) {
      setLoading(false);
    }
  }, [routeLoaded, locationLoaded]);

  if (!route) return <p>No route data available.</p>;

  if (loading) {
    return (
      <p style={{ textAlign: "center", marginTop: "50px" }}>
        Loading map and bus data...
      </p>
    );
  }

  if (error) {
    return (
      <p style={{ textAlign: "center", marginTop: "50px", color: "red" }}>
        {error}
      </p>
    );
  }

  const centerLat = (startLat + endLat) / 2;
  const centerLng = (startLng + endLng) / 2;

  return (
    <div className="bus-tracking-container">
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
          <b>Estimated Duration:</b>{" "}
          {estimatedMinutes ? `${estimatedMinutes} mins` : "Calculating..."}
        </p>
        <p>
          <b>Reaching:</b> {route?.end_point}{" "}
          {arrivalTime
            ? `on ${arrivalTime.toLocaleDateString("en-GB")} at ${arrivalTime.toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}`
            : ""}
        </p>
      </div>

      <ToastContainer />
    </div>
  );
};

export default BusTracking;
