import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FiPlus, FiBriefcase, FiTarget, FiFileText, FiBell, FiUser, FiLogOut, FiTrendingUp } from 'react-icons/fi';
import AddInvestment from './AddInvestment';
import Portfolio from './Portfolio';
import UserProfile from './UserProfile';
import '../styles/Dashboard.css';

const COLORS = ['#1e293b', '#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ef4444'];

export default function Dashboard({ user, onLogout, onProfileUpdate }) {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="dashboard-container">
            {/* Sidebar Navigation */}
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
                    <button 
                        className={`nav-item ${activeView === 'profile' ? 'active' : ''}`} 
                        onClick={() => setActiveView('profile')}
                    >
                        <FiUser /> My Profile
                    </button>
                </nav>
                <div className="sidebar-bottom">
                    <button className="logout-btn" onClick={onLogout}>
                        <FiLogOut /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <div className="welcome-section">
                        <h1>Welcome back, {user?.name || "Investor"}</h1>
                        <p>
                            {activeView === 'dashboard' ? 'Here is your portfolio summary' :
                             activeView === 'profile' ? 'Manage your personal details' :
                             activeView === 'addInvestment' ? 'Add a new asset to your portfolio' :
                             activeView === 'portfolio' ? 'View and manage your investments' : 
                             'Your financial overview'}
                        </p>
                    </div>
                    <div className="header-actions">
                        {activeView === 'dashboard' && (
                            <button 
                                className="refresh-btn" 
                                onClick={fetchDashboardData} 
                                disabled={loading}
                                style={{
                                    background: "rgba(34, 197, 94, 0.1)",
                                    color: "#22c55e",
                                    border: "1px solid rgba(34, 197, 94, 0.3)",
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    marginRight: "10px",
                                    cursor: "pointer",
                                    fontSize: "0.85rem",
                                    fontWeight: "600"
                                }}
                            >
                                {loading ? "Syncing..." : "Refresh"}
                            </button>
                        )}
                        <button className="icon-btn" title="Notifications"><FiBell /></button>
                        <div
                            className={`profile-btn ${activeView === 'profile' ? 'active' : ''}`}
                            onClick={() => setActiveView('profile')}
                            style={{ cursor: "pointer" }}
                            title="View My Profile"
                        >
                            <FiUser /> {user?.name || "User"}
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
                        />
                    ) : (
                        <div className="dashboard-content">
                            {/* Summary Metrics */}
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

                            {/* Allocation Charts */}
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