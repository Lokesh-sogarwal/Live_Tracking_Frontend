import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { fetchChatUsers } from "../../Components/Static/Chatusers";
import { FiArrowLeft, FiSearch, FiSend, FiMessageSquare } from "react-icons/fi";
import "./chat.css";
import { LoadingState, EmptyState, ErrorState } from "../../Components/ui";
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
    const messagesContainerRef = useRef(null);
    const [socketConnected, setSocketConnected] = useState(false);
    const [sendError, setSendError] = useState("");
    const [sending, setSending] = useState(false);
    const [connError, setConnError] = useState(false);
    const [usersError, setUsersError] = useState(false);
    const [usersReload, setUsersReload] = useState(0);
    const [historyError, setHistoryError] = useState(false);

    // Initialize socket only once
    useEffect(() => {
        socketRef.current = io(API_BASE_URL, {
            path: "/socket.io",
            withCredentials: false,
            auth: { token: localStorage.getItem("token") },
            transports: ["polling", "websocket"],
        });

        socketRef.current.on("connect", () => {
            setSocketConnected(true);
            setConnError(false);
        });
        socketRef.current.on("disconnect", () => {
            setSocketConnected(false);
        });
        socketRef.current.on("connect_error", (err) => {
            setSocketConnected(false);
            setConnError(true);
            console.error("[chat] socket connect_error", err?.message || err);
        });
        socketRef.current.on("error", (payload) => {
            console.error("[chat] server error event", payload);
        });

        return () => {
            try {
                socketRef.current?.disconnect();
            } catch {
                // ignore
            }
        };
    }, []);

    // Load chat users
    useEffect(() => {
        const loadUsers = async () => {
            setLoadingUsers(true);
            setUsersError(false);
            try {
                const data = await fetchChatUsers({ throwOnError: true });
                // Initialize unreadCount from API
                const usersWithData = data
                    .filter((user) => user.id !== currentUser.id)
                    .map(u => ({ ...u, lastMessageTime: null }));
                setUsers(usersWithData);
            } catch (err) {
                console.error("Error loading users:", err?.message || err);
                setUsers([]);
                setUsersError(true);
            } finally {
                setLoadingUsers(false);
            }
        };
        loadUsers();
    }, [currentUser.id, usersReload]);

    // Listen for incoming messages & Update User List
    useEffect(() => {
        const handleMessage = (msg) => {
             // 1. Update Active Chat Messages — only messages of the open conversation,
            // and never the same message twice (reconnect replays, double delivery).
            const inOpenChat =
                selectedUser &&
                ((msg.sender_id === currentUser.id && msg.receiver_id === selectedUser.id) ||
                    (msg.sender_id === selectedUser.id && msg.receiver_id === currentUser.id));
            if (inOpenChat) {
                setMessages((prev) =>
                    msg.message_id && prev.some((m) => m.message_id === msg.message_id)
                        ? prev
                        : [...prev, msg]
                );
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

    // Scroll to bottom on new messages (only if user is near bottom)
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            return;
        }

        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        const isNearBottom = distanceFromBottom < 120;
        if (isNearBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Send message
    const handleSend = () => {
        if (!newMessage.trim() || !selectedUser || !socketRef.current || !socketConnected || sending) return;

        const messageData = {
            sender_id: currentUser.id,
            receiver_id: selectedUser.id,
            msg: newMessage,
        };

        setSendError("");
        setSending(true);
        // The server acks once the message is stored; no ack within 10 s counts as a failure.
        socketRef.current.timeout(10000).emit("send_message", messageData, (err, ack) => {
            setSending(false);
            if (err || !ack?.ok) {
                setSendError(err ? "The server did not confirm your message. Check your connection and send it again." : ack?.error || "Your message was not delivered. Try again.");
                setNewMessage((current) => current || messageData.msg);
            }
        });
        setNewMessage("");
    };

    // Select user
    const handleSelectUser = async (user) => {
        // Clear unread count locally when selecting
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, unreadCount: 0 } : u));
        
        setSelectedUser(user);
        setSendError("");
        setHistoryError(false);
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
            // Do not present a failed load as an empty conversation.
            setMessages([]);
            setHistoryError(true);
        } finally {
            setLoadingMessages(false);
        }
    };

    // If user selected before socket finished connecting, re-join room on connect.
    useEffect(() => {
        if (!selectedUser || !socketConnected || !socketRef.current) return;
        socketRef.current.emit("join", {
            sender_id: currentUser.id,
            receiver_id: selectedUser.id,
            username: currentUser.name,
        });
    }, [selectedUser, socketConnected, currentUser.id, currentUser.name]);
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
        const targetUserId = location.state?.selectedUserId;
        if (targetUserId && users.length > 0) {
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
    }, [users, location.state?.selectedUserId, selectedUser, handleSelectUser, navigate, location.pathname]);
    
    const initials = (name = "") =>
        name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
    const Avatar = ({ user }) =>
        user.image ? (
            <img src={user.image} alt="" className="chat-avatar" />
        ) : (
            <span className="chat-avatar chat-avatar-initials" aria-hidden="true">{initials(user.name)}</span>
        );

    return (
        <div className={`chat-app ui-card${selectedUser ? " has-selection" : ""}`}>
            <aside className="chat-sidebar" aria-label="Conversations">
                <div className="chat-sidebar-head">
                    <h1 className="chat-heading">Chat</h1>
                    <span className={`chat-conn${socketConnected ? " is-on" : ""}`} role="status">
                        <span className="chat-conn-dot" aria-hidden="true" />
                        {socketConnected ? "Connected" : connError ? "Offline · retrying" : "Connecting…"}
                    </span>
                </div>
                <div className="ui-search chat-search">
                    <FiSearch aria-hidden="true" />
                    <input
                        type="search"
                        placeholder="Search people"
                        className="ui-input"
                        aria-label="Search people"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="chat-users">
                    {loadingUsers ? (
                        <LoadingState rows={5} />
                    ) : usersError ? (
                        <ErrorState message="Could not load your contacts." onRetry={() => setUsersReload((n) => n + 1)} />
                    ) : filteredUsers.length === 0 ? (
                        <EmptyState title={searchTerm ? "No one matches" : "No contacts"}>
                            {searchTerm ? "Try a different name." : "There is no one you can message yet."}
                        </EmptyState>
                    ) : (
                        <ul>
                            {filteredUsers.map((user) => (
                                <li key={user.id}>
                                    <button
                                        type="button"
                                        className={`chat-user${selectedUser?.id === user.id ? " is-active" : ""}`}
                                        aria-current={selectedUser?.id === user.id ? "true" : undefined}
                                        onClick={() => handleSelectUser(user)}
                                    >
                                        <Avatar user={user} />
                                        <span className="chat-user-info">
                                            <span className="chat-user-name">{user.name}</span>
                                            {/* /view/chat_users has no last-message data; only show a preview seen in this session. */}
                                            {user.lastMessage && <span className="chat-user-sub">{user.lastMessage}</span>}
                                        </span>
                                        <span className="chat-user-meta">
                                            <span className="chat-user-time">{getFormattedTime(user.lastMessageTime)}</span>
                                            {user.unreadCount > 0 && (
                                                <span className="chat-unread" aria-label={`${user.unreadCount} unread`}>{user.unreadCount}</span>
                                            )}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </aside>

            <section className="chat-main" aria-label={selectedUser ? `Conversation with ${selectedUser.name}` : "Conversation"}>
                {selectedUser ? (
                    <>
                        <header className="chat-main-head">
                            <button type="button" className="ui-icon-btn chat-back" onClick={() => setSelectedUser(null)} aria-label="Back to conversations">
                                <FiArrowLeft />
                            </button>
                            <Avatar user={selectedUser} />
                            <h2 className="chat-main-name">{selectedUser.name}</h2>
                        </header>
                        <div className="chat-messages" ref={messagesContainerRef} role="log" aria-live="polite">
                            {loadingMessages ? (
                                <LoadingState rows={4} />
                            ) : historyError ? (
                                <ErrorState message="Could not load this conversation." onRetry={() => handleSelectUser(selectedUser)} />
                            ) : messages.length === 0 ? (
                                <EmptyState icon={<FiMessageSquare />} title="No messages yet">Say hello to start the conversation.</EmptyState>
                            ) : (
                                messages.map((msg, index) => {
                                    const isMe = msg.sender_id === currentUser.id;
                                    return (
                                        <div key={msg.message_id || index} className={`chat-bubble ${isMe ? "is-sent" : "is-received"}`}>
                                            <span className="sr-only">{isMe ? "You" : selectedUser.name}: </span>
                                            <p>{msg.msg}</p>
                                            <span className="chat-bubble-time">
                                                {msg.timestamp
                                                    ? new Date(msg.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                                                    : ""}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {sendError && <p className="ui-error-text chat-send-error" role="alert">{sendError}</p>}
                        <form
                            className="chat-composer"
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend();
                            }}
                        >
                            <input
                                className="ui-input"
                                type="text"
                                placeholder={socketConnected ? "Type a message…" : "Waiting for connection…"}
                                aria-label={`Message ${selectedUser.name}`}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button type="submit" className="ui-btn ui-btn-primary" disabled={!socketConnected || !newMessage.trim() || sending || historyError} aria-label={sending ? "Sending" : "Send"}>
                                {sending ? <span className="ui-spinner" aria-hidden="true" /> : <FiSend aria-hidden="true" />}{" "}
                                <span className="chat-send-label">{sending ? "Sending…" : "Send"}</span>
                            </button>
                        </form>
                    </>
                ) : (
                    <EmptyState icon={<FiMessageSquare />} title="Select a conversation">Choose someone from the list to read and send messages.</EmptyState>
                )}
            </section>
        </div>
    );
};

export default Chat;
