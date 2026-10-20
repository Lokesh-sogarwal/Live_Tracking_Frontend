import { useEffect, useRef, useState } from "react";
import { FiSend, FiAlertCircle, FiCpu } from "react-icons/fi";
import "./chatbot.css";
import API_BASE_URL from "../../../utils/config";
import { PageHeader } from "../../../Components/ui";

// Talks to POST /chatbot/chat. The current backend answers 501 (not ported), so the page
// says the assistant is unavailable instead of inventing replies.
export default function ChatBot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // { role: "user" | "assistant" | "error", content }
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading || unavailable) return;
    const history = messages.filter((m) => m.role !== "error");
    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/chatbot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ message: text, history: [...history, userMsg] }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 501) {
        setUnavailable(true);
        setMessages((prev) => [...prev, { role: "error", content: "The assistant is not available on this server, so your message was not answered." }]);
      } else if (!res.ok || typeof data.reply !== "string") {
        setMessages((prev) => [...prev, { role: "error", content: data.error || "The assistant could not answer. Try again." }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "error", content: "Could not reach the server. Check your connection and try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ui-page ui-page-narrow bot-page">
      <PageHeader title="Assistant" description="Ask questions about routes, schedules and trips." />
      {unavailable && (
        <div className="ui-banner ui-banner-warning" role="status">
          <FiAlertCircle aria-hidden="true" />
          <span>The AI assistant is not enabled on this server. Use Live Tracking or Bus Schedule for trip information, or Chat to reach staff.</span>
        </div>
      )}
      <section className="ui-card bot-card" aria-label="Conversation">
        <div className="bot-log" role="log" aria-live="polite">
          {messages.length === 0 && (
            <div className="ui-state bot-empty">
              <FiCpu className="ui-state-icon" aria-hidden="true" />
              <p className="ui-state-title">Start a conversation</p>
              <p>Type a question below.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`bot-msg bot-msg-${m.role}`}>
              {m.role === "error" && <FiAlertCircle aria-hidden="true" />}
              <span>{m.content}</span>
            </div>
          ))}
          {loading && (
            <div className="bot-msg bot-msg-assistant bot-typing" aria-label="Assistant is typing">
              <span /><span /><span />
            </div>
          )}
          <div ref={endRef} />
        </div>
        <form className="bot-composer" onSubmit={send}>
          <input
            className="ui-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={unavailable ? "Assistant unavailable" : "Type your question…"}
            aria-label="Message"
            maxLength={4000}
            disabled={unavailable}
          />
          <button type="submit" className="ui-btn ui-btn-primary" disabled={!input.trim() || loading || unavailable} aria-label="Send">
            <FiSend aria-hidden="true" /> <span className="bot-send-label">Send</span>
          </button>
        </form>
      </section>
    </div>
  );
}
