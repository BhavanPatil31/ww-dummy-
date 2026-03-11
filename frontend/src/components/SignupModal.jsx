import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../styles/AuthModal.css";

function SignupModal({ closeSignup, openLogin }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleSignup = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");

        try {
            const response = await fetch("http://localhost:8088/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Signup failed");
            }

            alert(data.message);
            openLogin(email);
        } catch (err) {
            setErrorMsg(err.message || "Unable to reach server");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box" style={{ animationDelay: '0.1s' }}>
                <div className="close" onClick={closeSignup}>×</div>
                <h2 className="modal-title">Create Account</h2>
                <p className="modal-subtitle">Start your journey with WealthWise</p>

                {errorMsg && <div style={{ color: '#ef4444', marginBottom: '10px', fontSize: '0.9rem' }}>{errorMsg}</div>}

                <form onSubmit={handleSignup}>
                    <div className="input-group">
                        <label className="input-label">Full Name</label>
                        <input
                            type="text"
                            className="modal-input"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

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
                        <label className="input-label">Create Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="modal-input password-field"
                                placeholder="Choose a strong password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
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
                        {isLoading ? "Creating..." : "Sign Up Free"}
                    </button>
                </form>

                <div className="auth-footer">
                    <span>
                        Already have an account? <span className="auth-link" onClick={openLogin}>Sign In here</span>
                    </span>
                </div>
            </div>
        </div>
    );
}

export default SignupModal;