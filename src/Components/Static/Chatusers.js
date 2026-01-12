// chatUsersApi.js
import myimage from "../../Assets/male-avatar-boy-face-man-user-9-svgrepo-com.svg";

export const fetchChatUsers = async () => {
  try {
    const res = await fetch("/view/chat_users", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!res.ok) {
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
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};
