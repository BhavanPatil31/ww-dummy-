import { useState, useEffect } from "react";

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

    // Restore user from localStorage on mount
    useEffect(() => {
        const savedUser = localStorage.getItem("wealthwise_user");
        if (savedUser) {
            try {
                setCurrentUser(JSON.parse(savedUser));
            } catch (e) {
                console.error("Failed to parse saved user", e);
                localStorage.removeItem("wealthwise_user");
            }
        }
    }, []);

    const logout = () => {
        localStorage.removeItem("jwt_token");
        localStorage.removeItem("wealthwise_user");
        localStorage.removeItem("activeView"); // Reset view on logout
        setCurrentUser(null);
    };

    return (

        <div>

            {currentUser ? (
                <Dashboard
                    user={currentUser}
                    onLogout={logout}
                />
            ) : (
                <LandingPage
                    openLogin={() => setShowLogin(true)}
                    user={currentUser}
                    onLogout={logout}
                />
            )}

            {showLogin &&

                <LoginModal
                    initialEmail={loginEmail}
                    closeLogin={() => {
                        setShowLogin(false);
                        setLoginEmail(""); // clear on close
                    }}
                    openSignup={() => {

                        setShowLogin(false);
                        setShowSignup(true);
                        setLoginEmail(""); // clear on switch
                    }}
                    onLoginSuccess={(user) => {
                        localStorage.setItem("wealthwise_user", JSON.stringify(user));
                        setCurrentUser(user);
                        setShowLogin(false);
                        setLoginEmail("");
                    }}
                    openForgot={() => {

                        setShowLogin(false);
                        setShowForgot(true);

                    }}
                />

            }

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