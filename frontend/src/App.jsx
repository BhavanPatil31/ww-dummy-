import { useState, useEffect } from "react";

import UserProfile from "./pages/UserProfile";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";

import LoginModal from "./components/LoginModal";
import SignupModal from "./components/SignupModal";
import ForgotPasswordModal from "./components/ForgotPasswordModal";

import "./App.css";

function App() {

    // ✅ 1. Initialize from localStorage
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem("wealthwise_user");
        return saved ? JSON.parse(saved) : null;
    });

    const [currentPage, setCurrentPage] = useState(() => {
        // If user is logged in, default to dashboard. Else home.
        const savedPage = localStorage.getItem("wealthwise_current_page");
        if (savedPage) return savedPage;
        return localStorage.getItem("jwt_token") ? "dashboard" : "home";
    });

    const [showLogin, setShowLogin] = useState(false);
    const [showSignup, setShowSignup] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [loginEmail, setLoginEmail] = useState("");

    // ✅ 2. Persist page changes
    useEffect(() => {
        localStorage.setItem("wealthwise_current_page", currentPage);
    }, [currentPage]);

    // ✅ 3. Logout logic
    const handleLogout = () => {
        localStorage.removeItem("jwt_token");
        localStorage.removeItem("wealthwise_user");
        localStorage.removeItem("wealthwise_current_page");
        localStorage.removeItem("activeView");
        setCurrentUser(null);
        setCurrentPage("home");
    };

    // ✅ NEW — when name is updated in profile page, sync it to dashboard
    const handleProfileUpdate = (updatedProfile) => {
        const newUser = { ...currentUser, name: updatedProfile.name };
        setCurrentUser(newUser);
        localStorage.setItem("wealthwise_user", JSON.stringify(newUser));
    };

    return (
        <div>

            {/* MAIN APP CONTENT */}
            {currentUser ? (
                <Dashboard
                    user={currentUser}
                    onLogout={handleLogout}
                    onProfileUpdate={handleProfileUpdate}
                />

            /* LANDING PAGE */
            ) : (
                <LandingPage
                    openLogin={() => setShowLogin(true)}
                    user={currentUser}
                    onLogout={handleLogout}
                />
            )}

            {/* LOGIN MODAL */}
            {showLogin &&
                <LoginModal
                    initialEmail={loginEmail}
                    closeLogin={() => {
                        setShowLogin(false);
                        setLoginEmail("");
                    }}
                    openSignup={() => {
                        setShowLogin(false);
                        setShowSignup(true);
                        setLoginEmail("");
                    }}
                    onLoginSuccess={(user) => {
                        localStorage.setItem("wealthwise_user", JSON.stringify(user));
                        setCurrentUser(user);
                        setShowLogin(false);
                        setLoginEmail("");
                        setCurrentPage("dashboard");
                    }}
                    openForgot={() => {
                        setShowLogin(false);
                        setShowForgot(true);
                    }}
                />
            }

            {/* SIGNUP MODAL */}
            {showSignup &&
                <SignupModal
                    closeSignup={() => setShowSignup(false)}
                    openLogin={(email) => {
                        if (email) setLoginEmail(email);
                        setShowSignup(false);
                        setShowLogin(true);
                    }}
                />
            }

            {/* FORGOT PASSWORD MODAL */}
            {showForgot &&
                <ForgotPasswordModal
                    close={() => setShowForgot(false)}
                    openLogin={() => {
                        setShowForgot(false);
                        setShowLogin(true);
                    }}
                />
            }

        </div>
    );
}

export default App;