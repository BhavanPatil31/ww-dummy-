import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FiPlus, FiBriefcase, FiTarget, FiFileText, FiBell, FiUser, FiLogOut, FiTrendingUp, FiCheck, FiX } from 'react-icons/fi';
import AddInvestment from './AddInvestment';
import Portfolio from './Portfolio';
import UserProfile from './UserProfile';
import '../styles/Dashboard.css';

const COLORS = ['#1e293b', '#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ef4444'];

export default function Dashboard({ user, onLogout, onProfileUpdate, theme, setTheme }) {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const notificationRef = useRef(null);
    const profileDropdownRef = useRef(null);

    // Initialize from localStorage or default to 'dashboard'
    const [activeView, setActiveView] = useState(() => {
        return localStorage.getItem("activeView") || 'dashboard';
    });

    // Save activeView to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("activeView", activeView);
    }, [activeView]);

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const token = localStorage.getItem("jwt_token");
            const userId = user?.userId || user?.id;
            
            if (!userId) {
                console.warn("No userId found for dashboard fetch");
                setLoading(false);
                return;
            }

            console.log("Fetching dashboard data for user:", userId);
            
            // Try to get consolidated data from backend
            const response = await axios.get(`http://localhost:8088/api/dashboard/${userId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = response.data;
            // Safeguard: Calculate profitLoss if backend doesn't provide it yet
            if (data && data.profitLoss === undefined) {
                data.profitLoss = (data.portfolioValue || 0) - (data.totalInvested || 0);
            }
            setDashboardData(data);
        } catch (error) {
            console.warn("Direct dashboard API failed, attempting fallback to separate endpoints", error);
            
            // Fallback: Fetch investments and portfolio summary separately
            try {
                const token = localStorage.getItem("jwt_token");
                const userId = user?.userId || user?.id;

                const [invRes, portRes] = await Promise.allSettled([
                    axios.get(`http://localhost:8088/api/investments/user/${userId}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    }),
                    axios.get(`http://localhost:8088/api/portfolio/user/${userId}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    })
                ]);

                const investments = invRes.status === 'fulfilled' ? invRes.value.data : [];
                const portfolio = portRes.status === 'fulfilled' ? portRes.value.data : null;

                // Calculate Asset Allocation Chart locally
                const assetMap = {};
                investments.forEach(inv => {
                    const type = inv.asset_category || inv.investment_type || 'Other';
                    assetMap[type] = (assetMap[type] || 0) + (parseFloat(inv.amount_invested || inv.amount) || 0);
                });

                const assetAllocation = Object.keys(assetMap).map(key => ({
                    name: key,
                    value: assetMap[key]
                }));

                setDashboardData({
                    totalInvested: portfolio?.total_invested || 0,
                    portfolioValue: portfolio?.current_value || 0,
                    profitLoss: (portfolio?.current_value || 0) - (portfolio?.total_invested || 0),
                    returnPercentage: portfolio?.return_percentage || 0,
                    assetAllocation
                });
            } catch (fallbackError) {
                console.error("Critical: Fallback data fetch failed", fallbackError);
                setDashboardData({
                    totalInvested: 0,
                    portfolioValue: 0,
                    profitLoss: 0,
                    returnPercentage: 0,
                    assetAllocation: []
                });
            }
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user && activeView === 'dashboard') {
            fetchDashboardData();
        } else if (!user) {
            setLoading(false);
        }
    }, [user, activeView]);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const token = localStorage.getItem("jwt_token");
            const userId = user?.userId || user?.id;
            const response = await axios.get(`http://localhost:8088/api/notifications/user/${userId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            setNotifications(response.data);
            setUnreadCount(response.data.filter(n => !n.read).length);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const intervalId = setInterval(fetchNotifications, 10000);
            return () => clearInterval(intervalId);
        }
    }, [user, fetchNotifications]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setShowProfileDropdown(false);
            }
        };

        if (showNotifications || showProfileDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNotifications, showProfileDropdown]);

    const handleMarkAsRead = async (id) => {
        try {
            const token = localStorage.getItem("jwt_token");
            await axios.put(`http://localhost:8088/api/notifications/${id}/read`, {}, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const handleKeepUnread = async (id) => {
        try {
            const token = localStorage.getItem("jwt_token");
            await axios.put(`http://localhost:8088/api/notifications/${id}/unread`, {}, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
            const response = await axios.get(`http://localhost:8088/api/notifications/user/${user?.userId || user?.id}/unread-count`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            setUnreadCount(response.data.unreadCount);
        } catch (error) {
            console.error("Error keeping notification unread:", error);
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm("Are you sure you want to clear all notifications?")) return;
        try {
            const token = localStorage.getItem("jwt_token");
            const userId = user?.userId || user?.id;
            await axios.delete(`http://localhost:8088/api/notifications/user/${userId}/clear-all`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error("Error clearing notifications:", error);
        }
    };

    return (
        <div className="dashboard-container">
            <aside className="dashboard-sidebar">
                <div className="brand">
                    <h2>WealthWise</h2>
                </div>
                <nav className="sidebar-nav">
                    <button 
                        className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} 
                        onClick={() => setActiveView('dashboard')}
                    >
                        <FiTrendingUp /> Dashboard
                    </button>
                    <button 
                        className={`nav-item ${activeView === 'addInvestment' ? 'active' : ''}`} 
                        onClick={() => setActiveView('addInvestment')}
                    >
                        <FiPlus /> Add Investment
                    </button>
                    <button 
                        className={`nav-item ${activeView === 'portfolio' ? 'active' : ''}`} 
                        onClick={() => setActiveView('portfolio')}
                    >
                        <FiBriefcase /> Portfolio
                    </button>
                    <button className="nav-item"><FiTarget /> Goals</button>
                    <button className="nav-item"><FiFileText /> Tax Reports</button>
                </nav>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header">
                    {(activeView === 'dashboard' || activeView === 'profile' || activeView === 'addInvestment' || activeView === 'portfolio') && (
                        <div className="welcome-section">
                            <h1>
                                {activeView === 'dashboard' ? `Welcome back, ${user?.name || "Investor"}` :
                                 activeView === 'profile' ? 'Account Overview' :
                                 activeView === 'addInvestment' ? 'Add Investment' :
                                 activeView === 'portfolio' ? 'My Portfolio' : 'Welcome'}
                            </h1>
                            <p>
                                {activeView === 'dashboard' ? 'Here is your portfolio summary' :
                                 activeView === 'profile' ? 'Manage your personal details and account settings' :
                                 activeView === 'addInvestment' ? 'Add a new asset to your portfolio' :
                                 activeView === 'portfolio' ? 'Track, manage and analyse all your investments' :
                                 'Your financial overview'}
                            </p>
                        </div>
                    )}
                    <div className="header-actions" style={{ marginLeft: (activeView === 'dashboard' || activeView === 'addInvestment' || activeView === 'portfolio') ? '0' : 'auto' }}>
                        <div className="notification-container" ref={notificationRef}>
                            <button 
                                className="icon-btn" 
                                title="Notifications"
                                onClick={() => setShowNotifications(!showNotifications)}
                            >
                                <FiBell />
                                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                            </button>

                            {showNotifications && (
                                <div className="notification-dropdown">
                                    <div className="notification-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Notifications</h3>
                                            {notifications.length > 0 && (
                                                <button 
                                                    onClick={handleClearAll}
                                                    style={{ 
                                                        background: 'rgba(239, 68, 68, 0.1)', 
                                                        border: '1px solid rgba(239, 68, 68, 0.2)', 
                                                        color: '#ef4444', 
                                                        fontSize: '0.7rem', 
                                                        cursor: 'pointer',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontWeight: '600',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                                                    onMouseOut={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                                                >
                                                    Clear All
                                                </button>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => setShowNotifications(false)}
                                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                                            title="Close"
                                        >
                                            <FiX size={18} />
                                        </button>
                                    </div>
                                    <div className="notification-list">
                                        {notifications.length > 0 ? (
                                            notifications.map(notification => (
                                                <div key={notification.id} className={`notification-item ${notification.read ? 'read' : ''}`}>
                                                    <div className="notification-content">
                                                        <p>{notification.message}</p>
                                                    </div>
                                                    <div className="notification-footer">
                                                        <span className="notification-time">
                                                            {new Date(notification.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <div className="notification-actions">
                                                            <button 
                                                                className="action-btn check" 
                                                                title="Mark as Read"
                                                                onClick={() => handleMarkAsRead(notification.id)}
                                                            >
                                                                <FiCheck />
                                                            </button>
                                                            <button 
                                                                className="action-btn wrong" 
                                                                title="Keep Unread"
                                                                onClick={() => handleKeepUnread(notification.id)}
                                                            >
                                                                <FiX />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-notifications">No notifications yet</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="profile-dropdown-container" ref={profileDropdownRef}>
                            <div
                                className={`profile-btn ${activeView === 'profile' ? 'active' : ''}`}
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                style={{ cursor: "pointer" }}
                                title="Profile Settings"
                            >
                                <FiUser /> {user?.name || "User"}
                            </div>

                            {showProfileDropdown && (
                                <div className="profile-dropdown">
                                    <button 
                                        className="profile-dropdown-item"
                                        onClick={() => {
                                            setActiveView('profile');
                                            setShowProfileDropdown(false);
                                        }}
                                    >
                                        <FiUser /> My Profile
                                    </button>
                                    <button 
                                        className="profile-dropdown-item logout"
                                        onClick={() => {
                                            setShowProfileDropdown(false);
                                            onLogout();
                                        }}
                                    >
                                        <FiLogOut /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="dashboard-view-content">
                    {loading && activeView === 'dashboard' && !dashboardData ? (
                        <div className="loading">
                            <div className="loader-spinner"></div>
                            <span>Loading your dashboard...</span>
                        </div>
                    ) : activeView === 'addInvestment' ? (
                        <AddInvestment
                            user={user}
                            onBackToDashboard={() => {
                                fetchDashboardData();
                                setActiveView('dashboard');
                            }}
                        />
                    ) : activeView === 'portfolio' ? (
                        <Portfolio user={user} />
                    ) : activeView === 'profile' ? (
                        <UserProfile 
                            user={user}
                            onBack={() => setActiveView('dashboard')}
                            onLogout={onLogout}
                            onProfileUpdate={onProfileUpdate}
                            theme={theme}
                            setTheme={setTheme}
                        />
                    ) : (
                        <div className="dashboard-content">
                            <div className="metrics-grid">
                                <div className="metric-card">
                                    <h3>Total Invested Amount</h3>
                                    <div className="value">
                                        ₹{dashboardData?.totalInvested?.toLocaleString('en-IN') || "0"}
                                    </div>
                                </div>
                                <div className="metric-card">
                                    <h3>Total Portfolio Value</h3>
                                    <div className="value highlight">
                                        ₹{dashboardData?.portfolioValue?.toLocaleString('en-IN') || "0"}
                                    </div>
                                </div>
                                <div className="metric-card">
                                    <h3>Total Profit / Loss</h3>
                                    <div className={`value ${dashboardData?.profitLoss >= 0 ? 'positive' : 'negative'}`}>
                                        ₹{dashboardData?.profitLoss?.toLocaleString('en-IN') || "0"}
                                    </div>
                                </div>
                                <div className="metric-card">
                                    <h3>Return Percentage</h3>
                                    <div className={`value ${dashboardData?.returnPercentage >= 0 ? 'positive' : 'negative'}`}>
                                        {dashboardData?.returnPercentage >= 0 ? '+' : ''}
                                        {dashboardData?.returnPercentage?.toFixed(2) || "0"}%
                                    </div>
                                </div>
                            </div>

                            <div className="charts-section">
                                <div className="chart-card">
                                    <h3>Asset Allocation</h3>
                                    {dashboardData?.assetAllocation && dashboardData.assetAllocation.length > 0 ? (
                                        <div className="pie-chart-container">
                                            <ResponsiveContainer width="100%" height={300}>
                                                <PieChart>
                                                    <Pie
                                                        data={dashboardData.assetAllocation}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={80}
                                                        outerRadius={110}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                    >
                                                        {dashboardData.assetAllocation.map((entry, index) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={COLORS[index % COLORS.length]}
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                                                    />
                                                    <Legend verticalAlign="bottom" height={36} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="no-data">
                                            No investment data available to display chart.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}