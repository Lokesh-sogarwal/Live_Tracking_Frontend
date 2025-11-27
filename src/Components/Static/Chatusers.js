// chatUsersApi.js
import myimage from "../../Assets/male-avatar-boy-face-man-user-9-svgrepo-com.svg";

export const fetchChatUsers = async () => {
  try {
    const res = await fetch("http://localhost:5000/view/user_details", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!res.ok) throw new Error("Failed to fetch user details");

    const data = await res.json();

    return data.map((user) => ({
      id: user.user_uuid,
      name: user.fullname,
      image: user.profilePicture || myimage,
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};
