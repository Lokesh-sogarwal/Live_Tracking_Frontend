import API_BASE_URL from "./config";

// Authenticated GET returning { ok, status, data } instead of throwing, so callers can
// render loading / error / forbidden states without try/catch everywhere.
export async function apiGet(path, { signal } = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      signal,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    if (err.name === "AbortError") throw err;
    return { ok: false, status: 0, data: null };
  }
}
