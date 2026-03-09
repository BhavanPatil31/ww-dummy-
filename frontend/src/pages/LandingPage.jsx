import React, { useState, useEffect } from "react";
import "../styles/Landing.css";
import { FiTrendingUp, FiShield, FiPieChart, FiBell, FiUser, FiLogOut, FiMenu, FiX, FiCheckCircle } from "react-icons/fi";

function LandingPage({ openLogin, user, onLogout }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "#home" },
    { name: "Features", href: "#features" },
    { name: "Investment Tools", href: "#tools" },
    { name: "About", href: "#about" },
    { name: "Contact", href: "#contact" }
  ];

  return (
    <div className="landing-page">
      {/* Header Section */}
      <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-container">
          <div className="logo-container">
            <h2 className="brand-title">WealthWise</h2>
          </div>

          <nav className={`nav-links ${mobileMenuOpen ? "open" : ""}`}>
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
          </nav>

          <div className="auth-buttons">
            {user ? (
              <div className="user-profile">
                <div className="user-badge">
                  <FiUser className="user-icon" />
                  <span className="user-name">{user.name || "User"}</span>
                </div>
                <button className="logout-btn" onClick={onLogout}>
                  <FiLogOut /> Logout
                </button>
              </div>
            ) : (
              <>
                <button className="login-btn" onClick={openLogin}>Login</button>
                <button className="signup-btn" onClick={openLogin}>Sign Up</button>
              </>
            )}

            <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-bg-pattern"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            Track, Grow and Manage Your <span className="text-highlight">Investments Smartly</span>
          </h1>
          <p className="hero-subtitle">
            WealthWise helps you monitor mutual funds, SIPs and investments in one powerful dashboard.
          </p>
          <div className="hero-cta">
            <button className="btn-primary" onClick={openLogin}>Get Started</button>
            <button className="btn-secondary">Learn More</button>
          </div>
        </div>
        <div className="hero-illustration">
          <div className="mock-chart-container">
            <div className="chart-bar b1"></div>
            <div className="chart-bar b2"></div>
            <div className="chart-bar b3"></div>
            <div className="chart-bar b4"></div>
            <div className="chart-bar b5"></div>
            <div className="chart-line">
              <svg viewBox="0 0 100 50" preserveAspectRatio="none">
                <path d="M0 40 L20 30 L40 35 L60 15 L80 20 L100 5" fill="none" stroke="#22c55e" strokeWidth="3" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2>Powerful Features</h2>
          <p>Everything you need to master your financial goals</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="icon-wrapper green-bg"><FiTrendingUp /></div>
            <h3>SIP Tracking</h3>
            <p>Track all your monthly SIP investments in one place.</p>
          </div>
          <div className="feature-card">
            <div className="icon-wrapper blue-bg"><FiPieChart /></div>
            <h3>Portfolio Insights</h3>
            <p>Visualize your investment growth using interactive charts.</p>
          </div>
          <div className="feature-card">
            <div className="icon-wrapper orange-bg"><FiBell /></div>
            <h3>Smart Investment Alerts</h3>
            <p>Get notifications about market trends and portfolio performance.</p>
          </div>
          <div className="feature-card">
            <div className="icon-wrapper purple-bg"><FiShield /></div>
            <h3>Secure Dashboard</h3>
            <p>Your investment data is protected with secure authentication.</p>
          </div>
        </div>
      </section>

      {/* Investment Dashboard Preview Section */}
      <section id="tools" className="investment-preview-section">
        <div className="dashboard-preview-container">
          <div className="preview-header">
            <h3>Investment Overview</h3>
          </div>
          <div className="preview-metrics">
            <div className="metric-box">
              <span className="metric-title">Total Investment</span>
              <span className="metric-value">₹ 5,00,000</span>
            </div>
            <div className="metric-box">
              <span className="metric-title">Current Value</span>
              <span className="metric-value highlight-green">₹ 6,45,200</span>
            </div>
            <div className="metric-box">
              <span className="metric-title">Returns</span>
              <span className="metric-value highlight-green">+29.04% <FiTrendingUp fontSize="0.8em" /></span>
            </div>
          </div>
          <div className="preview-chart">
            <svg viewBox="0 0 400 100" className="growth-chart" preserveAspectRatio="none">
              <path d="M0,90 C50,80 100,50 150,60 C200,70 250,30 300,40 C350,50 380,10 400,0 L400,100 L0,100 Z" fill="rgba(34, 197, 94, 0.1)" />
              <path d="M0,90 C50,80 100,50 150,60 C200,70 250,30 300,40 C350,50 380,10 400,0" fill="none" stroke="#22c55e" strokeWidth="4" />
            </svg>
          </div>
        </div>
        <div className="preview-text">
          <h2>See your money grow</h2>
          <p>Experience real-time updates and deep analytical insights with our comprehensive dashboard preview.</p>
          <ul className="preview-list">
            <li><FiCheckCircle className="check-icon" /> AI-driven insights</li>
            <li><FiCheckCircle className="check-icon" /> Unified asset view</li>
            <li><FiCheckCircle className="check-icon" /> Automated syncs</li>
          </ul>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="about" className="testimonials-section">
        <h2>What Our Investors Say</h2>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <p className="testimonial-text">"WealthWise made tracking my mutual funds effortless. The portfolio insights are exactly what I needed to balance my investments."</p>
            <div className="testimonial-author">- Rahul Sharma</div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-text">"I always struggled with keeping track of multiple SIPs. Now, everything is unified and the smart alerts keep me on track."</p>
            <div className="testimonial-author">- Priya Desai</div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-text">"The dashboard is stunning, secure, and incredibly fast. It is like having a personal wealth manager in my pocket."</p>
            <div className="testimonial-author">- Amit Patel</div>
          </div>
        </div>
      </section>

      {/* Call To Action Section */}
      <section className="cta-section">
        <h2 className="cta-title">Start Growing Your Wealth Today</h2>
        <p className="cta-subtitle">Join thousands of smart investors who trust WealthWise.</p>
        <div className="cta-buttons">
          <button className="btn-primary" onClick={openLogin}>Create Free Account</button>
          <button className="btn-secondary outline-light">Explore Investments</button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="site-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>WealthWise</h3>
            <p>Empowering you to make smarter financial decisions with real-time tracking and intuitive insights.</p>
          </div>
          <div className="footer-links">
            <div className="link-column">
              <h4>Product</h4>
              <a href="#">Features</a>
              <a href="#">Pricing</a>
              <a href="#">Security</a>
            </div>
            <div className="link-column">
              <h4>Company</h4>
              <a href="#">About Us</a>
              <a href="#">Careers</a>
              <a href="#">Contact</a>
            </div>
            <div className="link-column">
              <h4>Legal</h4>
              <a href="#">Terms of Service</a>
              <a href="#">Privacy Policy</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} WealthWise. All rights reserved.</p>
          <div className="social-icons">
            <div className="social-circle"></div>
            <div className="social-circle"></div>
            <div className="social-circle"></div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;