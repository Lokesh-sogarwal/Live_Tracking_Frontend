export const Logout = async (token) => {
  if (!token) return;

  try {
    const res = await fetch("/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
      },
      credentials: "include",
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.removeItem("token");
      console.log(data.message);
      window.location.href = "/"; // redirect after logout ✅
    } else {
      console.error("Logout failed:", data.error || "Unknown error");
    }
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

export default Logout;
