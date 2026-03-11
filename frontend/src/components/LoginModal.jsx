import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../styles/AuthModal.css";

function LoginModal({ closeLogin, openSignup, openForgot, onLoginSuccess, initialEmail }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("http://localhost:8088/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      alert(data.message + " Welcome, " + data.name);
      if (data.token) {
        localStorage.setItem("jwt_token", data.token);
      }
      if (onLoginSuccess) {
        onLoginSuccess({ name: data.name, email, token: data.token });
      } else {
        closeLogin();
      }
    } catch (err) {
      setErrorMsg(err.message || "Unable to reach server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="close" onClick={closeLogin}>×</div>
        <h2 className="modal-title">Welcome Back</h2>
        <p className="modal-subtitle">Sign in to your WealthWise account</p>

        {errorMsg && <div style={{ color: '#ef4444', marginBottom: '10px', fontSize: '0.9rem' }}>{errorMsg}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              className="modal-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Password
              <span className="auth-link" style={{ fontSize: '0.8rem' }} onClick={openForgot}>Forgot?</span>
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className="modal-input password-field"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span
                className="password-toggle-icon"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </span>
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={isLoading}>
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          <span>
            Don't have an account? <span className="auth-link" onClick={openSignup}>Create Account</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;