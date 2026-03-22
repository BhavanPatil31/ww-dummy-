import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../styles/AuthModal.css";

function LoginModal({ closeLogin, openSignup, openForgot, onLoginSuccess, initialEmail }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpMsg, setOtpMsg] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const performLogin = async () => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("http://localhost:8088/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      console.log("LOGIN RESPONSE:", data);

      if (!response.ok) {
        if (response.status === 403) {
          // Account exists but is not verified yet
          setRequiresOtp(true);
          setErrorMsg(data.error || "Account not verified. Please verify your email.");
          return false;
        }
        throw new Error(data.error || "Login failed");
      }

      alert(data.message + " Welcome, " + data.name);

      if (data.token) {
        localStorage.setItem("jwt_token", data.token);
      }

      const userData = {
        userId: data.userId || data.id,
        name: data.name,
        email,
        token: data.token
      };

      localStorage.setItem("wealthwise_user", JSON.stringify(userData));

      if (onLoginSuccess) {
        onLoginSuccess(userData);
      } else {
        closeLogin();
      }

      return true;
    } catch (err) {
      setErrorMsg(err.message || "Unable to reach server");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setRequiresOtp(false);
    setOtpMsg("");
    await performLogin();
  };

  const handleResendOtp = async () => {
    setOtpMsg("");
    try {
      const response = await fetch("http://localhost:8088/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not resend OTP");
      }
      setOtpMsg(data.message || "OTP resent to your email");
    } catch (err) {
      setOtpMsg(err.message || "Unable to resend OTP");
    }
  };

  const handleVerifyOtp = async () => {
    setIsVerifyingOtp(true);
    setOtpMsg("");
    try {
      const response = await fetch("http://localhost:8088/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "OTP verification failed");
      }

      setOtpMsg("OTP verified! Logging you in...");
      setRequiresOtp(false);
      await performLogin();
    } catch (err) {
      setOtpMsg(err.message || "Unable to verify OTP");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="close" onClick={closeLogin}>×</div>
        <h2 className="modal-title">Welcome Back</h2>
        <p className="modal-subtitle">Sign in to your WealthWise account</p>

        {errorMsg && (
          <div style={{ color: "#ef4444", marginBottom: "10px", fontSize: "0.9rem" }}>
            {errorMsg}
          </div>
        )}

        {requiresOtp && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ marginBottom: "0.4rem", fontWeight: 600 }}>Enter OTP sent to your email</div>
            <div className="input-group">
              <label className="input-label">OTP</label>
              <input
                type="text"
                className="modal-input"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="auth-btn"
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp || !otp}
              >
                {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                type="button"
                className="auth-btn"
                style={{ backgroundColor: "#6b7280" }}
                onClick={handleResendOtp}
              >
                Resend OTP
              </button>
            </div>
            {otpMsg && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#0f5132" }}>
                {otpMsg}
              </div>
            )}
          </div>
        )}

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
            <label
              className="input-label"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              Password
              <span
                className="auth-link"
                style={{ fontSize: "0.8rem" }}
                onClick={openForgot}
              >
                Forgot?
              </span>
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
            Don't have an account?{" "}
            <span className="auth-link" onClick={openSignup}>
              Create Account
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
