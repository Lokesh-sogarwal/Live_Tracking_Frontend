// chatUsersApi.js
import myimage from "../../Assets/male-avatar-boy-face-man-user-9-svgrepo-com.svg";
import API_BASE_URL from "../../utils/config";

// Returns [] on failure by default (sidebar badge); the chat page passes throwOnError so a
// failed load is shown as an error, not as "no contacts".
export const fetchChatUsers = async ({ throwOnError = false } = {}) => {
  try {
    const res = await fetch(`${API_BASE_URL}/view/chat_users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!res.ok) {
        if (throwOnError) throw new Error(`Failed to fetch users (${res.status})`);
        console.warn("Failed to fetch users");
        return [];
    }

    const data = await res.json();
    // Robustly handle different response formats
    const usersList = Array.isArray(data) ? data : (data.users || []);

    return usersList.map((user) => ({
      id: user.user_uuid,
      name: user.fullname,
      image: user.profilePicture || myimage,
      unreadCount: user.unread_messages || 0
    }));
  } catch (error) {
    if (throwOnError) throw error;
    console.error("Error fetching users:", error);
    return [];
  }
};
