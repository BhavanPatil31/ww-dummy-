import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../styles/AuthModal.css";

function ForgotPasswordModal({ close, openLogin }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [status, setStatus] = useState("idle"); // idle, loading
  const [errorMsg, setErrorMsg] = useState("");

  const requestOtp = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const response = await fetch("http://localhost:8088/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed finding email");
      }

      setStep(2);
    } catch (error) {
      setErrorMsg(error.message || "Failed networking to server");
    } finally {
      setStatus("idle");
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const response = await fetch("http://localhost:8088/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid OTP");
      }

      setStep(3);
    } catch (error) {
      setErrorMsg(error.message || "Failed verifying OTP");
    } finally {
      setStatus("idle");
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const response = await fetch("http://localhost:8088/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed resetting password");
      }

      setStep(4);
    } catch (error) {
      setErrorMsg(error.message || "Failed resetting password");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="close" onClick={close}>×</div>

        {step === 4 && (
          <div style={{ padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', margin: '0 0 16px 0' }}>✅</div>
            <h2 className="modal-title" style={{ fontSize: '1.5rem' }}>Password Reset</h2>
            <p className="modal-subtitle">Your password has been changed successfully. You can now login with your new password.</p>
            <button className="auth-btn" onClick={openLogin}>Login Now</button>
          </div>
        )}

        {step !== 4 && (
          <>
            <h2 className="modal-title" style={{ fontSize: '1.75rem' }}>
              {step === 1 ? "Reset Password" : step === 2 ? "Verify Code" : "New Password"}
            </h2>
            <p className="modal-subtitle">
              {step === 1 ? "Enter your email and we'll send you an OTP to reset your password." :
                step === 2 ? `Enter the verification code sent to ${email}` :
                  "Create a new, strong password."}
            </p>

            {errorMsg && <div style={{ color: '#ef4444', marginBottom: '10px', fontSize: '0.9rem' }}>{errorMsg}</div>}

            {step === 1 && (
              <form onSubmit={requestOtp}>
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
                <button type="submit" className="auth-btn" disabled={status === "loading"}>
                  {status === "loading" ? "Sending Code..." : "Send Reset Code"}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={verifyOtp}>
                <div className="input-group">
                  <label className="input-label">Verification Code</label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="auth-btn" disabled={status === "loading"}>
                  {status === "loading" ? "Verifying..." : "Verify Code"}
                </button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={resetPassword}>
                <div className="input-group">
                  <label className="input-label">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      className="modal-input password-field"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <span
                      className="password-toggle-icon"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      title={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </span>
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Confirm Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className="modal-input password-field"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <span
                      className="password-toggle-icon"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </span>
                  </div>
                </div>
                <button type="submit" className="auth-btn" disabled={status === "loading"}>
                  {status === "loading" ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordModal;