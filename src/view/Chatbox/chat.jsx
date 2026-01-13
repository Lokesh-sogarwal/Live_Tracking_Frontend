import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import io from "socket.io-client";
import { fetchChatUsers } from "../../Components/Static/Chatusers";
import "./chat.css";
import { jwtDecode } from "jwt-decode";
import API_BASE_URL from "../../utils/config";

const Chat = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem("token");
    const socketRef = useRef();

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
    const [searchTerm, setSearchTerm] = useState("");
    const messagesEndRef = useRef(null);

    // Initialize socket only once
    useEffect(() => {
        socketRef.current = io(API_BASE_URL, { 
            transports: ["websocket"],
            withCredentials: true,
            path: "/socket.io"
        });

        socketRef.current.on("connect", () => console.log("Connected to socket server"));

        return () => socketRef.current.disconnect();
    }, []);

    // Load chat users
    useEffect(() => {
        const loadUsers = async () => {
            setLoadingUsers(true);
            try {
                const data = await fetchChatUsers();
                // Initialize unreadCount from API
                const usersWithData = data
                    .filter((user) => user.id !== currentUser.id)
                    .map(u => ({ ...u, lastMessageTime: null }));
                setUsers(usersWithData);
            } catch (err) {
                console.error("Error loading users:", err);
                setUsers([]);
            } finally {
                setLoadingUsers(false);
            }
        };
        loadUsers();
    }, [currentUser.id]);

    // Listen for incoming messages & Update User List
    useEffect(() => {
        const handleMessage = (msg) => {
             // 1. Update Active Chat Messages
            if (
                selectedUser &&
                (msg.sender_id === currentUser.id || msg.sender_id === selectedUser.id)
            ) {
                setMessages((prev) => [...prev, msg]);
            }

            // 2. Update User List (Sort & Unread Count)
            setUsers((prevUsers) => {
                const senderId = msg.sender_id;
                // Find user in list
                const userIndex = prevUsers.findIndex(u => u.id === senderId);
                
                // If it's the current user sending, we might want to move receiver to top too?
                // For now, let's focus on receiving messages as per request.
                if (userIndex === -1 && senderId !== currentUser.id) return prevUsers; 

                let targetIndex = userIndex;
                let targetUser = null;
                
                // If we sent the message, we find the receiver to move them to top
                if (senderId === currentUser.id) {
                     targetIndex = prevUsers.findIndex(u => u.id === msg.receiver_id);
                }

                if (targetIndex === -1) return prevUsers;

                targetUser = { ...prevUsers[targetIndex] };
                targetUser.lastMessageTime = new Date(); // Update time
                targetUser.lastMessage = msg.msg; // Update snippet

                // Increment unread ONLY if we received it AND we are not currently chatting with them
                if (senderId !== currentUser.id) {
                    if (!selectedUser || selectedUser.id !== senderId) {
                        targetUser.unreadCount = (targetUser.unreadCount || 0) + 1;
                    }
                }

                // Move to top
                const newUsers = [...prevUsers];
                newUsers.splice(targetIndex, 1);
                newUsers.unshift(targetUser);
                return newUsers;
            });
        };

        if (socketRef.current) {
            socketRef.current.on("message", handleMessage);
        }

        return () => {
             if (socketRef.current) socketRef.current.off("message", handleMessage);
        };
    }, [selectedUser, currentUser.id]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Send message
    const handleSend = () => {
        if (!newMessage.trim() || !selectedUser || !socketRef.current) return;

        const messageData = {
            sender_id: currentUser.id,
            receiver_id: selectedUser.id,
            msg: newMessage,
        };

        socketRef.current.emit("send_message", messageData);
        setNewMessage("");
    };

    // Select user
    const handleSelectUser = async (user) => {
        // Clear unread count locally when selecting
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, unreadCount: 0 } : u));
        
        setSelectedUser(user);
        setLoadingMessages(true);
        
        if (socketRef.current) {
            socketRef.current.emit("join", {
                sender_id: currentUser.id,
                receiver_id: user.id,
                username: currentUser.name,
            });
        }

        try {
            const res = await fetch(`${API_BASE_URL}/chat/history/${user.id}`, {
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
// Filter users
    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Time formatter helper
    const getFormattedTime = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
    };

    // Auto-select user from navigation state
    useEffect(() => {
        if (location.state?.selectedUserId && users.length > 0) {
            const targetUserId = location.state.selectedUserId;
            // Only select if not already selected
            if (!selectedUser || selectedUser.id !== targetUserId) {
                const targetUser = users.find(u => u.id === targetUserId);
                if (targetUser) {
                    handleSelectUser(targetUser);
                    // Clear state to prevent loop/re-selection
                    navigate(location.pathname, { replace: true, state: {} });
                }
            }
        }
    }, [users, location.state, selectedUser]);
    
    // Restrict Reload
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    return (
        <div className="ChatApp">
            <div className="UsersList">
                <div className="search-bar-container">
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {loadingUsers ? (
                    <p>Loading users...</p>
                ) : filteredUsers.length === 0 ? (
                    <p>No users found</p>
                ) : (
                    filteredUsers.map((user) => (
                        <div
                            key={user.id}
                            className={`User ${selectedUser?.id === user.id ? "active" : ""}`}
                            onClick={() => handleSelectUser(user)}
                        >
                            <img src={user.image} alt={user.name} className="UserImage" />
                            <div className="UserInfo">
                                <div className="UserMainInfo">
                                    <span className="UserName">{user.name}</span>
                                    <span className="UserSubtitle">
                                        {user.lastMessage 
                                            ? (user.lastMessage.length > 25 ? user.lastMessage.substring(0, 25) + "..." : user.lastMessage)
                                            : "Tap to chat"}
                                    </span>
                                </div>
                                <div className="UserMeta">
                                    {user.unreadCount > 0 ? (
                                        <>
                                            <span className="UnreadBadge">{user.unreadCount}</span>
                                            <span className="UserTimeBadge">{getFormattedTime(user.lastMessageTime)}</span>
                                        </>
                                    ) : (
                                        <span className="UserTime">{getFormattedTime(user.lastMessageTime)}</span>
                                    )}
                                </div>
                            </div>
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
