import { useState } from "react";

import LandingPage from "./pages/LandingPage";

import LoginModal from "./components/LoginModal";
import SignupModal from "./components/SignupModal";
import ForgotPasswordModal from "./components/ForgotPasswordModal";

import "./App.css";

function App() {

    const [showLogin, setShowLogin] = useState(false);
    const [showSignup, setShowSignup] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    return (

        <div>

            <LandingPage
                openLogin={() => setShowLogin(true)}
                user={currentUser}
                onLogout={() => {
                    localStorage.removeItem("jwt_token");
                    setCurrentUser(null);
                }}
            />

            {showLogin &&

                <LoginModal
                    closeLogin={() => setShowLogin(false)}
                    openSignup={() => {

                        setShowLogin(false);
                        setShowSignup(true);

                    }}
                    onLoginSuccess={(user) => {
                        setCurrentUser(user);
                        setShowLogin(false);
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
                    openLogin={() => {

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