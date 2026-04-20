import { useEffect, useRef, useState } from "react";
import { FiFileText, FiMessageCircle, FiSend, FiTarget, FiTrendingUp, FiX } from "react-icons/fi";
import "../styles/AIChatWidget.css";

const QUICK_PROMPTS = [
  { label: "Ask about Portfolio", icon: <FiTrendingUp />, message: "How is my portfolio performing right now, and what stands out?" },
  { label: "Ask about Goals", icon: <FiTarget />, message: "How are my current investments aligned with my goals?" },
  { label: "Analyze Tax", icon: <FiFileText />, message: "Analyze my tax summary and highlight anything important." },
];

function AIChatWidget({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      id: "welcome",
      role: "assistant",
      text: user
        ? `Hi ${user.name || "there"}, I'm WealthWise AI. Ask me about your portfolio, goals, or tax picture.`
        : "Log in to chat with WealthWise AI about your portfolio, goals, and tax insights.",
    },
  ]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        text: user
          ? `Hi ${user.name || "there"}, I'm WealthWise AI. Ask me about your portfolio, goals, or tax picture.`
          : "Log in to chat with WealthWise AI about your portfolio, goals, and tax insights.",
      },
    ]);
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, isOpen]);

  const appendMessage = (role, text) => {
    setMessages((prev) => [...prev, { id: `${role}-${Date.now()}-${Math.random()}`, role, text }]);
  };

  const sendMessage = async (rawMessage) => {
    const message = rawMessage.trim();
    if (!message || isSending) return;

    const userId = user?.userId || user?.user_id || user?.id || (user?.user && (user.user.userId || user.user.user_id || user.user.id));

    if (!userId) {
      appendMessage("assistant", "Please log in first so I can access your WealthWise data securely.");
      return;
    }

    const token = localStorage.getItem("jwt_token");
    if (!token) {
      appendMessage("assistant", "Your session token is missing. Please log in again.");
      return;
    }

    appendMessage("user", message);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("http://localhost:8088/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          userId: userId,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || "Unable to get an AI response right now.");
      }

      appendMessage("assistant", data.reply || "I couldn't generate a response just now.");
    } catch (error) {
      appendMessage("assistant", error.message || "Something went wrong while contacting WealthWise AI.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await sendMessage(input);
  };

  const handleQuickPrompt = async (message) => {
    if (!isOpen) {
      setIsOpen(true);
    }
    await sendMessage(message);
  };

  return (
    <div className={`ai-chat-widget ${isOpen ? "open" : ""}`}>
      {isOpen && (
        <div className="ai-chat-panel">
          <div className="ai-chat-header">
            <div>
              <div className="ai-chat-title">WealthWise AI</div>
              <div className="ai-chat-subtitle">
                {user ? "Portfolio-aware financial guidance" : "Secure AI chat available after login"}
              </div>
            </div>
            <button
              type="button"
              className="ai-chat-icon-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI chat"
            >
              <FiX />
            </button>
          </div>

          <div className="ai-chat-chips">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                className="ai-chat-chip"
                onClick={() => handleQuickPrompt(prompt.message)}
                disabled={isSending}
              >
                {prompt.icon}
                <span>{prompt.label}</span>
              </button>
            ))}
          </div>

          <div className="ai-chat-messages">
            {messages.map((message) => (
              <div key={message.id} className={`ai-chat-row ${message.role}`}>
                <div className={`ai-chat-bubble ${message.role}`}>{message.text}</div>
              </div>
            ))}

            {isSending && (
              <div className="ai-chat-row assistant">
                <div className="ai-chat-bubble assistant typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="ai-chat-input-wrap" onSubmit={handleSubmit}>
            <textarea
              className="ai-chat-input"
              placeholder={user ? "Ask about your investments, goals, or taxes..." : "Log in to use WealthWise AI"}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
              rows={2}
              disabled={isSending || !user}
            />
            <button
              type="submit"
              className="ai-chat-send"
              disabled={isSending || !input.trim() || !user}
              aria-label="Send message"
            >
              <FiSend />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="ai-chat-launcher"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open WealthWise AI chat"
      >
        <FiMessageCircle />
      </button>
    </div>
  );
}

export default AIChatWidget;
