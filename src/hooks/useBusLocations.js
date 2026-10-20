import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../utils/api";

// Latest known position per bus via GET /view/get_location/:bus_id (404 = none yet).
// Refreshed every `intervalMs`; meant for a handful of buses (dashboard widgets). The live map
// uses Socket.IO instead.
export default function useBusLocations(busIds, { enabled = true, intervalMs = 15000 } = {}) {
  const key = useMemo(() => [...new Set(busIds)].sort((a, b) => a - b).join(","), [busIds]);
  const [locations, setLocations] = useState({});

  useEffect(() => {
    if (!enabled || !key) {
      setLocations({});
      return undefined;
    }
    const ids = key.split(",").map(Number);
    let active = true;
    const load = async () => {
      const results = await Promise.all(ids.map((id) => apiGet(`/view/get_location/${id}`).then((r) => [id, r])));
      if (!active) return;
      const next = {};
      for (const [id, r] of results) next[id] = r.ok ? r.data : null;
      setLocations(next);
    };
    load();
    const timer = setInterval(load, intervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [key, enabled, intervalMs]);

  return locations;
}
