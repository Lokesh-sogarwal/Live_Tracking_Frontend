import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { fetchChatUsers } from "../../Components/Static/Chatusers";
import "./chat.css";
import { jwtDecode } from "jwt-decode";

let socket; // Keep socket outside component

const Chat = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    if (!token) {
        localStorage.removeItem("token");
        navigate("/login");
    }

    let currentUser = { id: null, name: "You" };
    try {
        const decodedToken = jwtDecode(token);
        currentUser = { id: decodedToken.user_id, name: "You" };
    } catch {
        localStorage.removeItem("token");
        navigate("/login");
    }

    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef(null);

    // Initialize socket only once
    useEffect(() => {
        socket = io("http://localhost:5001", { 
            transports: ["websocket"],
            withCredentials: true,
            path: "/socket.io"
        });

        socket.on("connect", () => console.log("Connected to socket server"));

        return () => socket.disconnect();
    }, []);

    // Load chat users
    useEffect(() => {
        const loadUsers = async () => {
            setLoadingUsers(true);
            try {
                const data = await fetchChatUsers();
                setUsers(data.filter((user) => user.id !== currentUser.id));
            } catch (err) {
                console.error("Error loading users:", err);
                setUsers([]);
            } finally {
                setLoadingUsers(false);
            }
        };
        loadUsers();
    }, [currentUser.id]);

    // Listen for incoming messages
    useEffect(() => {
        socket.on("message", (msg) => {
            if (
                selectedUser &&
                (msg.sender_id === currentUser.id || msg.sender_id === selectedUser.id)
            ) {
                setMessages((prev) => [...prev, msg]);
            }
        });

        return () => socket.off("message");
    }, [selectedUser]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Send message
    const handleSend = () => {
        if (!newMessage.trim() || !selectedUser) return;

        const messageData = {
            sender_id: currentUser.id,
            receiver_id: selectedUser.id,
            msg: newMessage,
        };

        socket.emit("send_message", messageData);
        setNewMessage("");
    };

    // Select user
    const handleSelectUser = async (user) => {
        setSelectedUser(user);
        setLoadingMessages(true);
        socket.emit("join", {
            sender_id: currentUser.id,
            receiver_id: user.id,
            username: currentUser.name,
        });

        try {
            const res = await fetch(`/chat/history/${user.id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch chat history");
            const data = await res.json();
            setMessages(data);
        } catch {
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    return (
        <div className="ChatApp">
            <div className="UsersList">
                <h3>Chats</h3>
                {loadingUsers ? (
                    <p>Loading users...</p>
                ) : users.length === 0 ? (
                    <p>No users found</p>
                ) : (
                    users.map((user) => (
                        <div
                            key={user.id}
                            className={`User ${selectedUser?.id === user.id ? "active" : ""}`}
                            onClick={() => handleSelectUser(user)}
                        >
                            <img src={user.image} alt={user.name} className="UserImage" />
                            <span>{user.name}</span>
                        </div>
                    ))
                )}
            </div>

            <div className="Chating-box">
                {selectedUser ? (
                    <>
                        <div className="chat-profile">
                             <p> 
                            <img src={selectedUser.image} alt={selectedUser.name} className="UserImage" />
                                {selectedUser.name}
                            </p>
                        </div>
                        <div className="Messages">
                            {loadingMessages ? (
                                <p>Loading messages...</p>
                            ) : messages.length === 0 ? (
                                <p style={{flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>No messages yet. Start the conversation!</p>
                            ) : (
                                messages.map((msg, index) => {
                                    const isMe = msg.sender_id === currentUser.id;
                                    return (
                                        <div
                                            key={index}
                                            className={`message-bubble ${isMe ? "sent" : "received"}`}
                                        >
                                            <span className="message-sender">
                                                {isMe ? "You" : selectedUser.name}
                                            </span>
                                            <p style={{ margin: 0 }}>{msg.msg}</p>
                                            <span className="message-time">
                                                {msg.timestamp
                                                    ? new Date(msg.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                                                    : ""}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="Input">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                            />
                            <button onClick={handleSend}>Send</button>
                        </div>
                    </>
                ) : (
                    <p>Select a user to start chatting</p>
                )}
            </div>
        </div>
    );
};

export default Chat;
