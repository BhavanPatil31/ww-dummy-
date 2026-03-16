import { useState } from "react";

import UserProfile from "./pages/UserProfile";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";

import LoginModal from "./components/LoginModal";
import SignupModal from "./components/SignupModal";
import ForgotPasswordModal from "./components/ForgotPasswordModal";

import "./App.css";

function App() {

    const [showLogin, setShowLogin] = useState(false);
    const [showSignup, setShowSignup] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [loginEmail, setLoginEmail] = useState("");
    const [currentPage, setCurrentPage] = useState("home");

    const handleLogout = () => {
        localStorage.removeItem("jwt_token");
        setCurrentUser(null);
        setCurrentPage("home");
    };

    // ✅ NEW — when name is updated in profile page, sync it to dashboard
    const handleProfileUpdate = (updatedProfile) => {
        setCurrentUser(prev => ({
            ...prev,
            name: updatedProfile.name
        }));
    };

    return (
        <div>

            {/* PROFILE PAGE */}
            {currentPage === "profile" && currentUser ? (
                <UserProfile
                    user={currentUser}
                    onBack={() => setCurrentPage("dashboard")}
                    onLogout={handleLogout}
                    onProfileUpdate={handleProfileUpdate}  // ✅ NEW
                />

            /* DASHBOARD PAGE */
            ) : currentUser ? (
                <Dashboard
                    user={currentUser}
                    onLogout={handleLogout}
                    onOpenProfile={() => setCurrentPage("profile")}
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