import API_BASE_URL from "../utils/config";

// Ends the session locally no matter what the server says. Previously the token was only
// removed on HTTP 200, so an expired or already-revoked token (401) left the user stuck:
// "/" redirected straight back to the dashboard and every request failed.
export const clearSession = (redirectTo = "/") => {
  localStorage.removeItem("token");
  window.location.href = redirectTo;
};

export const Logout = async (token) => {
  if (!token) return clearSession();

  try {
    // Revokes the token server-side; a failure here must not keep the user signed in.
    const res = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
      },
      credentials: "include",
    });
    if (!res.ok && res.status !== 401) {
      console.error("Server logout failed with status", res.status);
    }
  } catch (error) {
    console.error("Logout request failed:", error);
  } finally {
    clearSession();
  }
};

export default Logout;
