import { useState } from "react";

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

    return (

        <div>

            {currentUser ? (
                <Dashboard
                    user={currentUser}
                    onLogout={() => {
                        localStorage.removeItem("jwt_token");
                        setCurrentUser(null);
                    }}
                />
            ) : (
                <LandingPage
                    openLogin={() => setShowLogin(true)}
                    user={currentUser}
                    onLogout={() => {
                        localStorage.removeItem("jwt_token");
                        setCurrentUser(null);
                    }}
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