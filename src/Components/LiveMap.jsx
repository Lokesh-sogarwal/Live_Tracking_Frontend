import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import io from "socket.io-client";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// 🔥 CONNECT SOCKET
const socket = io("http://192.168.1.13:5001", {
  transports: ["websocket"],
});

const LiveMap = () => {
  const [location, setLocation] = useState({
    lat: 28.6139,
    lng: 77.2090, // Default: Delhi
  });

  useEffect(() => {
    socket.on("connect", () => {
      console.log("✅ Socket connected");
    });

    // 🔴 Listen for live location
    socket.on("live_location", (data) => {
      setLocation({
        lat: data.latitude,
        lng: data.longitude,
      });
    });

    return () => {
      socket.off("live_location");
    };
  }, []);

  return (
    <MapContainer
      center={[location.lat, location.lng]}
      zoom={14}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[location.lat, location.lng]}>
        <Popup>🚍 Live Vehicle Location</Popup>
      </Marker>
    </MapContainer>
  );
};

export default LiveMap;
