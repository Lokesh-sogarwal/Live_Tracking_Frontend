import { useState, useRef, useEffect } from "react";

export default function Chat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMsg = async () => {
    if (!input.trim()) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠ Please type something." },
      ]);
      return;
    }

    const userMessage = input;
    setInput("");

    const newUserMsg = { role: "user", content: userMessage };
    setMessages((prev) => [...prev, newUserMsg]);
    const updatedHistory = [...history, newUserMsg];
    setHistory(updatedHistory);

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5001/chatbot/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          history: updatedHistory,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Server error");
      }

      const botMessage = { role: "assistant", content: data.reply };

      setMessages((prev) => [...prev, botMessage]);
      setHistory((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Server connection failed!" },
      ]);
    }

    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.chatContainer}>
        <h2 style={styles.title}>AI Chat Assistant</h2>

        <div style={styles.chatBox}>
          {/* Show all messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={msg.role === "user" ? styles.userBubble : styles.botBubble}
            >
              {msg.content}
            </div>
          ))}

          {/* Animated typing indicator */}
          {loading && (
            <div style={styles.botBubble}>
              <div className="dot-flashing"></div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Section */}
        <div style={styles.inputRow}>
          <input
            style={styles.input}
            type="text"
            value={input}
            placeholder="Type your message..."
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMsg()}
          />
          <button style={styles.button} onClick={sendMsg}>
            Send
          </button>
        </div>
      </div>

      {/* Typing Animation */}
      <style>{`
        .dot-flashing {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #999;
          animation: dotFlashing 1s infinite linear alternate;
        }

        @keyframes dotFlashing {
          0% { opacity: 1; }
          50% { opacity: .3; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    height: "90vh",
    width: "100%",
    background: "transparent",
    display: "flex",
    justifyContent: "center",
    // alignItems: "center",
    // padding: 20,
  },

  chatContainer: {
    width: "100%",
    maxWidth: 800,
    background: "white",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    height: "85vh",
  },

  title: {
    textAlign: "center",
    marginBottom: 10,
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },

  chatBox: {
    flex: 1,
    overflowY: "auto",
    padding: 10,
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#fafafa",
  },

  userBubble: {
    textAlign: "right",
    background: "#4A90E2",
    color: "white",
    padding: "10px 14px",
    margin: "8px 0",
    borderRadius: 16,
    maxWidth: "80%",
    marginLeft: "auto",
  },

  botBubble: {
    textAlign: "left",
    background: "#e5e5e5",
    color: "#333",
    padding: "10px 14px",
    margin: "8px 0",
    borderRadius: 16,
    maxWidth: "80%",
  },

  inputRow: {
    display: "flex",
    gap: 10,
    marginTop: 12,
  },

  input: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    border: "1px solid #ccc",
    fontSize: 15,
  },

  button: {
    background: "#4A90E2",
    color: "white",
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 15,
  },
};
