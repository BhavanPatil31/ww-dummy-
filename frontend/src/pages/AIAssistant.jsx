import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiSend, FiMessageSquare, FiCpu, FiTrendingUp, FiShield, FiTrash2 } from "react-icons/fi";
import "../styles/AIAssistant.css";

const QUICK_ACTIONS = [
  { label: "Analyze Portfolio", icon: <FiTrendingUp /> },
  { label: "Tax Strategy", icon: <FiShield /> },
  { label: "Market Insights", icon: <FiCpu /> },
];

const FAQ_LIST = [
  "What is my current portfolio value?",
  "How can I save on taxes?",
  "Am I well diversified?",
  "What was my best performing fund?"
];

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const isJwtExpired = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
};

export default function AIAssistant({ user, onLogout }) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [messages, setMessages] = useState(() => {
    const defaultMsg = {
      id: "welcome",
      role: "assistant",
      text: user
        ? `### Welcome back, ${user.name || "Investor"}!\nI've analyzed your latest data. Would you like to review your **portfolio risk** or discuss **tax-saving opportunities** today?`
        : "Please sign in to access your personalized financial insights.",
    };
    return [defaultMsg];
  });

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const appendMessage = (role, text) => {
    setMessages((prev) => [...prev, { id: Date.now(), role, text }]);
  };

  const handleSessionExpired = (message) => {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("wealthwise_user");
    localStorage.removeItem("wealthwise_current_page");
    localStorage.removeItem("activeView");

    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

    appendMessage("assistant", message || "Your session has expired. Please log in again.");
  };

  const requestClearChat = () => {
    setShowConfirm(true);
  };

  const confirmClearChat = () => {
    setMessages([messages[0]]);
    setShowConfirm(false);
    setToastMsg("Chat deleted!");
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleSend = async (e, forcedMessage = null) => {
    if (e) e.preventDefault();
    const message = forcedMessage || input.trim();
    if (!message || isSending) return;

    const userId = user?.userId || user?.user_id || user?.id;
    if (!userId) {
      appendMessage("assistant", "⚠️ Session expired. Please log in.");
      return;
    }

    const token = localStorage.getItem("jwt_token");
    if (!token || isJwtExpired(token)) {
      handleSessionExpired("Your session has expired. Please log in again.");
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
        body: JSON.stringify({ message, userId }),
      });

      const data = await response.json();
      if (response.status === 401 || response.status === 403) {
        handleSessionExpired(data.message || "Your session has expired. Please log in again.");
        return;
      }
      if (!response.ok) throw new Error(data.message || "Server Error");

      appendMessage("assistant", data.reply);
    } catch (error) {
      appendMessage("assistant", `**Error:** ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="ai-page-wrapper">
      <div className="ai-assistant-container">
        {/* Header Section */}
        <header className="ai-header">
          <div className="ai-header-info">
            <div className="ai-logo-icon"><FiMessageSquare /></div>
            <div>
              <h2>WealthWise Intelligence</h2>
              <span className="ai-status">System Active</span>
            </div>
          </div>
          <button className="clear-btn" onClick={requestClearChat} title="Clear Chat">
            <FiTrash2 />
          </button>
        </header>

        {/* FAQ Header Bar */}
        <div className="ai-faq-bar">
          <span className="faq-label">Suggested:</span>
          <div className="faq-scroll">
            {FAQ_LIST.map((faq, index) => (
              <button key={index} className="faq-chip" onClick={() => handleSend(null, faq)}>
                {faq}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="ai-chat-window">
          <div className="messages-list">
            {messages.map((msg) => (
              <div key={msg.id} className={`message-row ${msg.role}`}>
                <div className="avatar">
                  {msg.role === "assistant" ? "AI" : "YOU"}
                </div>
                <div className="bubble">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="message-row assistant">
                <div className="avatar">AI</div>
                <div className="bubble typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bottom Interaction Area */}
        <footer className="ai-footer">
          <form className="input-container" onSubmit={handleSend}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your financial future..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button type="submit" disabled={isSending || !input.trim()} className="send-btn">
              <FiSend />
            </button>
          </form>
          <p className="ai-disclaimer">AI-generated insights are for informational purposes only.</p>
        </footer>

        {/* Delete Confirmation Modal */}
        {showConfirm && (
          <div className="ai-modal-overlay">
            <div className="ai-modal-content">
              <h3>Delete Chat?</h3>
              <p>Are you sure you want to clear your conversation history?</p>
              <div className="ai-modal-actions">
                <button className="ai-cancel-btn" onClick={() => setShowConfirm(false)}>Cancel</button>
                <button className="ai-confirm-btn" onClick={confirmClearChat}>Yes, Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMsg && (
          <div className="ai-toast-popup">
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
}
