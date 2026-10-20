import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../utils/api";

// Fetches `path` when `enabled` (i.e. the role may call it). status:
// "idle" (not allowed / not requested) | "loading" | "ok" | "forbidden" | "error"
export default function useResource(path, enabled = true) {
  const [state, setState] = useState({ status: enabled ? "loading" : "idle", data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || !path) {
      setState({ status: "idle", data: null });
      return undefined;
    }
    const controller = new AbortController();
    setState((s) => ({ status: "loading", data: s.data }));
    apiGet(path, { signal: controller.signal })
      .then((res) => {
        if (res.ok) setState({ status: "ok", data: res.data });
        else setState({ status: res.status === 403 ? "forbidden" : "error", data: null, error: res.data?.error });
      })
      .catch(() => {
        /* aborted on unmount */
      });
    return () => controller.abort();
  }, [path, enabled, attempt]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  return { ...state, reload };
}
